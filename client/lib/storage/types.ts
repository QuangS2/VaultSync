/**
 * Encrypted IndexedDB Storage Types for VaultSync
 * Defines schemas for encrypted CRDT updates, snapshots, wrapped keys, and storage metrics.
 */

import { ChunkType } from '../crypto/types';

export interface StoredEncryptedChunk {
  documentId: string;
  chunkIndex: number;
  encryptedBinary: Uint8Array; // IV (12B) || Ciphertext (NB with 16B Tag)
  timestamp: number;
  epoch: number;
  chunkType: ChunkType;
}

export interface StoredEncryptedSnapshot {
  documentId: string;
  epoch: number;
  encryptedBinary: Uint8Array;
  snapshotVectorClock?: Uint8Array;
  timestamp: number;
  updatesCountMerged: number;
}

export interface StoredDocumentMeta {
  documentId: string;
  title: string;
  lastModified: number;
  epoch: number;
  updateCount: number;
  hasSnapshot: boolean;
}

export interface StorageStats {
  databaseName: string;
  totalDocuments: number;
  totalUpdatesCount: number;
  totalSnapshotsCount: number;
  totalEncryptedBytes: number;
  formattedSize: string;
}
