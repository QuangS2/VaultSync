/**
 * Zero-Knowledge Encrypted IndexedDB Storage Provider
 * Ensures all local client-side CRDT states and document chunks are encrypted with AES-256-GCM
 * before ever touching persistent storage on the browser disk.
 */

import { WebCryptoEngine } from '../crypto/web-crypto-engine';
import { NonceManager } from '../crypto/nonce-manager';
import { ChunkType } from '../crypto/types';
import { BinaryUtils } from '../crypto/binary-utils';
import { 
  StoredEncryptedChunk, 
  StoredEncryptedSnapshot, 
  StoredDocumentMeta, 
  StorageStats 
} from './types';

export class EncryptedIndexedDBStorage {
  private static readonly DB_NAME = 'VaultSync_Encrypted_Store';
  private static readonly DB_VERSION = 1;
  public static readonly COMPACTION_THRESHOLD = 20; // Merge updates into snapshot when count >= 20

  private dbPromise: Promise<IDBDatabase> | null = null;
  private nonceManager: NonceManager;

  constructor(clientId?: number) {
    this.nonceManager = new NonceManager(clientId);
  }

  /**
   * Initializes or returns the open IndexedDB database instance.
   */
  private async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this environment.'));
        return;
      }

      const request = indexedDB.open(EncryptedIndexedDBStorage.DB_NAME, EncryptedIndexedDBStorage.DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store 1: Encrypted Delta Updates
        if (!db.objectStoreNames.contains('updates')) {
          const updatesStore = db.createObjectStore('updates', { keyPath: ['documentId', 'chunkIndex'] });
          updatesStore.createIndex('by_doc', 'documentId', { unique: false });
          updatesStore.createIndex('by_timestamp', 'timestamp', { unique: false });
        }

        // Store 2: Encrypted Compacted Snapshots
        if (!db.objectStoreNames.contains('snapshots')) {
          const snapshotsStore = db.createObjectStore('snapshots', { keyPath: ['documentId', 'epoch'] });
          snapshotsStore.createIndex('by_doc', 'documentId', { unique: false });
        }

        // Store 3: Document Metadata
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'documentId' });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });

    return this.dbPromise;
  }

  /**
   * Encrypts and writes a single CRDT update delta to IndexedDB.
   */
  public async saveEncryptedUpdate(
    documentId: string,
    updateBytes: Uint8Array,
    key: CryptoKey,
    epoch: number = 1
  ): Promise<{ chunkIndex: number; totalUpdates: number }> {
    const db = await this.getDB();
    const meta = await this.getDocumentMeta(documentId);
    const nextIndex = meta ? meta.updateCount + 1 : 1;

    // 1. Encrypt update with AES-256-GCM bound to AAD
    const aadMeta = {
      documentId,
      epoch,
      chunkType: ChunkType.CRDT_UPDATE
    };

    const encrypted = await WebCryptoEngine.encryptAESGCM(key, updateBytes, {
      nonceManager: this.nonceManager,
      aadMetadata: aadMeta
    });

    const chunkRecord: StoredEncryptedChunk = {
      documentId,
      chunkIndex: nextIndex,
      encryptedBinary: encrypted.combinedBinary,
      timestamp: Date.now(),
      epoch,
      chunkType: ChunkType.CRDT_UPDATE
    };

    const newMeta: StoredDocumentMeta = {
      documentId,
      title: meta?.title ?? 'Tài liệu không tên',
      lastModified: Date.now(),
      epoch,
      updateCount: nextIndex,
      hasSnapshot: meta?.hasSnapshot ?? false
    };

    // 2. Atomic IndexedDB Transaction
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['updates', 'metadata'], 'readwrite');
      tx.objectStore('updates').put(chunkRecord);
      tx.objectStore('metadata').put(newMeta);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    return { chunkIndex: nextIndex, totalUpdates: nextIndex };
  }

  /**
   * Loads and decrypts all updates and snapshots for a document, replaying into an array of Uint8Arrays.
   */
  public async loadDocumentState(
    documentId: string,
    key: CryptoKey,
    epoch: number = 1
  ): Promise<{ snapshot?: Uint8Array | undefined; updates: Uint8Array[] }> {
    const db = await this.getDB();

    // 1. Check for latest Snapshot
    const snapshotRecord = await new Promise<StoredEncryptedSnapshot | undefined>((resolve, reject) => {
      const tx = db.transaction('snapshots', 'readonly');
      const req = tx.objectStore('snapshots').get([documentId, epoch]);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(tx.error);
    });

    let decryptedSnapshot: Uint8Array | undefined;
    if (snapshotRecord) {
      const aadMeta = {
        documentId,
        epoch,
        chunkType: ChunkType.CRDT_UPDATE
      };
      decryptedSnapshot = await WebCryptoEngine.decryptCombined(key, snapshotRecord.encryptedBinary, {
        aadMetadata: aadMeta
      });
    }

    // 2. Fetch all incremental updates
    const encryptedChunks = await new Promise<StoredEncryptedChunk[]>((resolve, reject) => {
      const tx = db.transaction('updates', 'readonly');
      const index = tx.objectStore('updates').index('by_doc');
      const req = index.getAll(IDBKeyRange.only(documentId));
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(tx.error);
    });

    // Sort by chunkIndex ascending
    encryptedChunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

    // 3. Decrypt all updates
    const decryptedUpdates: Uint8Array[] = [];
    for (const chunk of encryptedChunks) {
      const aadMeta = {
        documentId,
        epoch: chunk.epoch,
        chunkType: chunk.chunkType
      };
      const decrypted = await WebCryptoEngine.decryptCombined(key, chunk.encryptedBinary, {
        aadMetadata: aadMeta
      });
      decryptedUpdates.push(decrypted);
    }

    return {
      snapshot: decryptedSnapshot,
      updates: decryptedUpdates
    };
  }

  /**
   * Compacts multiple individual updates into a single encrypted snapshot and purges old updates.
   */
  public async compactDocumentSnapshot(
    documentId: string,
    mergedStateBytes: Uint8Array,
    key: CryptoKey,
    epoch: number = 1
  ): Promise<void> {
    const db = await this.getDB();
    const meta = await this.getDocumentMeta(documentId);

    // 1. Encrypt merged state
    const aadMeta = {
      documentId,
      epoch,
      chunkType: ChunkType.CRDT_UPDATE
    };

    const encrypted = await WebCryptoEngine.encryptAESGCM(key, mergedStateBytes, {
      nonceManager: this.nonceManager,
      aadMetadata: aadMeta
    });

    const snapshotRecord: StoredEncryptedSnapshot = {
      documentId,
      epoch,
      encryptedBinary: encrypted.combinedBinary,
      timestamp: Date.now(),
      updatesCountMerged: meta?.updateCount ?? 0
    };

    // 2. Atomic compaction transaction: write snapshot, clear updates, reset meta updateCount
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['snapshots', 'updates', 'metadata'], 'readwrite');
      
      // Put snapshot
      tx.objectStore('snapshots').put(snapshotRecord);

      // Delete old updates for this document
      const updatesStore = tx.objectStore('updates');
      const index = updatesStore.index('by_doc');
      const req = index.openCursor(IDBKeyRange.only(documentId));
      req.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // Update meta
      const updatedMeta: StoredDocumentMeta = {
        documentId,
        title: meta?.title ?? 'Tài liệu không tên',
        lastModified: Date.now(),
        epoch,
        updateCount: 0,
        hasSnapshot: true
      };
      tx.objectStore('metadata').put(updatedMeta);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Encrypts and persists the full File Tree snapshot into IndexedDB.
   */
  public async saveTreeSnapshot(
    treeBytes: Uint8Array,
    key: CryptoKey,
    epoch: number = 1
  ): Promise<void> {
    await this.compactDocumentSnapshot('__vaultsync_file_tree__', treeBytes, key, epoch);
  }

  /**
   * Loads and decrypts the File Tree snapshot from IndexedDB.
   */
  public async loadTreeSnapshot(
    key: CryptoKey,
    epoch: number = 1
  ): Promise<Uint8Array | null> {
    try {
      const { snapshot } = await this.loadDocumentState('__vaultsync_file_tree__', key, epoch);
      return snapshot || null;
    } catch {
      return null;
    }
  }

  /**
   * Encrypts and persists a full Document CRDT snapshot into IndexedDB.
   */
  public async saveDocumentSnapshot(
    documentId: string,
    stateBytes: Uint8Array,
    key: CryptoKey,
    epoch: number = 1
  ): Promise<void> {
    await this.compactDocumentSnapshot(documentId, stateBytes, key, epoch);
  }

  /**
   * Returns metadata for a single document.
   */
  public async getDocumentMeta(documentId: string): Promise<StoredDocumentMeta | undefined> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('metadata', 'readonly');
      const req = tx.objectStore('metadata').get(documentId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(tx.error);
    });
  }

  /**
   * Deletes all encrypted data associated with a document.
   */
  public async deleteDocument(documentId: string): Promise<void> {
    const db = await this.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['updates', 'snapshots', 'metadata'], 'readwrite');
      
      // Delete updates
      const updatesStore = tx.objectStore('updates');
      const index = updatesStore.index('by_doc');
      const req = index.openCursor(IDBKeyRange.only(documentId));
      req.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // Delete snapshot
      tx.objectStore('snapshots').delete(IDBKeyRange.bound([documentId, 0], [documentId, 65535]));

      // Delete metadata
      tx.objectStore('metadata').delete(documentId);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Clears the entire IndexedDB storage.
   */
  public async clearAllStorage(): Promise<void> {
    const db = await this.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['updates', 'snapshots', 'metadata'], 'readwrite');
      tx.objectStore('updates').clear();
      tx.objectStore('snapshots').clear();
      tx.objectStore('metadata').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Calculates storage statistics across all encrypted stores.
   */
  public async getStorageStats(): Promise<StorageStats> {
    const db = await this.getDB();

    const [updates, snapshots, metadata] = await Promise.all([
      new Promise<StoredEncryptedChunk[]>((resolve, reject) => {
        const tx = db.transaction('updates', 'readonly');
        const req = tx.objectStore('updates').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(tx.error);
      }),
      new Promise<StoredEncryptedSnapshot[]>((resolve, reject) => {
        const tx = db.transaction('snapshots', 'readonly');
        const req = tx.objectStore('snapshots').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(tx.error);
      }),
      new Promise<StoredDocumentMeta[]>((resolve, reject) => {
        const tx = db.transaction('metadata', 'readonly');
        const req = tx.objectStore('metadata').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(tx.error);
      })
    ]);

    let totalBytes = 0;
    updates.forEach(u => totalBytes += u.encryptedBinary.byteLength);
    snapshots.forEach(s => totalBytes += s.encryptedBinary.byteLength);

    const formattedSize = totalBytes > 1024 * 1024 
      ? `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(totalBytes / 1024).toFixed(1)} KB`;

    return {
      databaseName: EncryptedIndexedDBStorage.DB_NAME,
      totalDocuments: metadata.length,
      totalUpdatesCount: updates.length,
      totalSnapshotsCount: snapshots.length,
      totalEncryptedBytes: totalBytes,
      formattedSize
    };
  }

  /**
   * Inspects the raw ciphertext stored inside IndexedDB to verify Zero-Knowledge guarantees.
   */
  public async inspectRawStorage(documentId: string): Promise<{
    updates: Array<{ chunkIndex: number; ivHex: string; ciphertextHex: string; tagHex: string }>;
    snapshot?: { epoch: number; ivHex: string; ciphertextHex: string; tagHex: string } | undefined;
  }> {
    const db = await this.getDB();

    const [rawUpdates, rawSnapshot] = await Promise.all([
      new Promise<StoredEncryptedChunk[]>((resolve, reject) => {
        const tx = db.transaction('updates', 'readonly');
        const index = tx.objectStore('updates').index('by_doc');
        const req = index.getAll(IDBKeyRange.only(documentId));
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(tx.error);
      }),
      new Promise<StoredEncryptedSnapshot | undefined>((resolve, reject) => {
        const tx = db.transaction('snapshots', 'readonly');
        const req = tx.objectStore('snapshots').get([documentId, 1]);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(tx.error);
      })
    ]);

    const formattedUpdates = rawUpdates.map(u => {
      const bin = u.encryptedBinary;
      const iv = bin.subarray(0, 12);
      const cipher = bin.subarray(12, bin.length - 16);
      const tag = bin.subarray(bin.length - 16);
      return {
        chunkIndex: u.chunkIndex,
        ivHex: BinaryUtils.bufferToHex(iv),
        ciphertextHex: BinaryUtils.bufferToHex(cipher),
        tagHex: BinaryUtils.bufferToHex(tag)
      };
    });

    let formattedSnapshot: { epoch: number; ivHex: string; ciphertextHex: string; tagHex: string } | undefined;
    if (rawSnapshot) {
      const bin = rawSnapshot.encryptedBinary;
      const iv = bin.subarray(0, 12);
      const cipher = bin.subarray(12, bin.length - 16);
      const tag = bin.subarray(bin.length - 16);
      formattedSnapshot = {
        epoch: rawSnapshot.epoch,
        ivHex: BinaryUtils.bufferToHex(iv),
        ciphertextHex: BinaryUtils.bufferToHex(cipher),
        tagHex: BinaryUtils.bufferToHex(tag)
      };
    }

    return {
      updates: formattedUpdates,
      snapshot: formattedSnapshot
    };
  }
}
