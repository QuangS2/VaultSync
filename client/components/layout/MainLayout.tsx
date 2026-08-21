import React, { useState, useEffect } from 'react';
import { HeaderBar } from './HeaderBar';
import { LeftSidebar } from './LeftSidebar';
import { EditorCanvas } from './EditorCanvas';
import { RightDiscussionSidebar } from './RightDiscussionSidebar';
import { TreeStateManager } from '../../lib/tree/tree-state-manager';
import { FileSystemItem } from '../../lib/tree/types';
import { InlineCommentAnchorEngine } from '../../lib/yjs/inline-comment-engine';
import { RoomChatEngine } from '../../lib/yjs/room-chat-engine';
import * as Y from 'yjs';
import { AppTheme } from '../../App';
import { CommandPaletteModal } from '../palette/CommandPaletteModal';
import { ExportModal } from '../export/ExportModal';
import { SettingsModal } from '../settings/SettingsModal';
import { ShareModal } from '../share/ShareModal';
import { JoinRoomModal } from '../share/JoinRoomModal';
import { CommandPaletteEngine, PaletteAction } from '../../lib/palette/command-palette-engine';
import { EnvelopeEncryptionManager } from '../../lib/crypto/envelope-encryption';
import { UnlockedVaultSession } from '../../lib/auth/types';
import { EncryptedYjsProvider } from '../../lib/yjs/encrypted-yjs-provider';
import { ProviderConnectionStatus, AwarenessUser, CollaborationUserOptions } from '../../lib/yjs/types';
import { EncryptedIndexedDBStorage } from '../../lib/storage/encrypted-indexeddb-storage';
import { BinaryUtils } from '../../lib/crypto/binary-utils';
import { MobileBottomNavBar } from './MobileBottomNavBar';
import { DiscussionReadTracker } from '../../lib/yjs/discussion-read-tracker';
import { PermissionsEngine, DocumentPermissions, DEFAULT_OWNER_PERMISSIONS, DEFAULT_EDITOR_PERMISSIONS, DEFAULT_VIEWER_PERMISSIONS } from '../../lib/auth/permissions';

function getRelayWsUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost:1234';
  if ((import.meta as any).env?.VITE_RELAY_WS_URL) {
    return (import.meta as any).env.VITE_RELAY_WS_URL;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  if (window.location.port === '5173') {
    return `${protocol}//${window.location.hostname}:1234`;
  }
  return `${protocol}//${window.location.host}/ws`;
}

export interface MainLayoutProps {
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  session?: UnlockedVaultSession | null | undefined;
  onLockVault?: (() => void) | undefined;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  theme,
  onThemeChange,
  session,
  onLockVault
}) => {
  const [treeManager] = useState(() => new TreeStateManager());
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return false;
  });
  const [activeDocId, setActiveDocId] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('room');
      if (roomParam) return roomParam;
      const savedDocId = localStorage.getItem('vaultsync_active_doc');
      if (savedDocId) return savedDocId;
    }
    return 'doc-default';
  });
  const [exportDocTitle, setExportDocTitle] = useState('Ghi chú mới');
  const [treeVersion, setTreeVersion] = useState(0);

  // Zero-Knowledge Offline-First Persistent Storage
  const [storage] = useState(() => new EncryptedIndexedDBStorage());
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<number>(Date.now());

  // Multi-document isolated Y.Doc registry
  const yDocsRef = React.useRef<Map<string, Y.Doc>>(new Map());
  const [yDoc, setYDoc] = useState<Y.Doc>(() => {
    const initialDoc = new Y.Doc();
    return initialDoc;
  });
  const [isDocHydrated, setIsDocHydrated] = useState(false);

  const [commentEngine, setCommentEngine] = useState(() => new InlineCommentAnchorEngine(yDoc));
  const [chatEngine, setChatEngine] = useState(() => new RoomChatEngine(yDoc));
  const [activeCommentThreadId, setActiveCommentThreadId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState<{ from: number; to: number; quotedText: string } | null>(null);
  const [hasUnreadActiveDiscussion, setHasUnreadActiveDiscussion] = useState(false);
  const [unreadDocIds, setUnreadDocIds] = useState<string[]>([]);
  const [readTracker] = useState(() => new DiscussionReadTracker());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Document encryption key registry
  const documentKeysRef = React.useRef<Map<string, CryptoKey>>(new Map());
  const [documentKey, setDocumentKey] = useState<CryptoKey | null>(session ? session.vaultRootKey : null);

  // Granular Access Control & Permissions Engine
  const permissionsMapRef = React.useRef<Map<string, DocumentPermissions>>(new Map());
  const [currentPermissions, setCurrentPermissions] = useState<DocumentPermissions>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const permsParam = urlParams.get('perms');
      if (permsParam) return PermissionsEngine.decodePermissions(permsParam);
    }
    return DEFAULT_OWNER_PERMISSIONS;
  });
  const [guestRoomPermissions, setGuestRoomPermissions] = useState<DocumentPermissions>(DEFAULT_EDITOR_PERMISSIONS);

  // Real-time WebSocket Relay Provider & Peer Awareness State
  const [provider, setProvider] = useState<EncryptedYjsProvider | null>(null);
  const [providerStatus, setProviderStatus] = useState<ProviderConnectionStatus>({
    connected: false,
    connecting: false,
    syncStatus: 'offline',
    reconnectAttempts: 0,
    error: null
  });

  const [awarenessUsers, setAwarenessUsers] = useState<AwarenessUser[]>([]);
  const [isJoinRoomModalOpen, setIsJoinRoomModalOpen] = useState(false);

  const currentUserOptions: CollaborationUserOptions = React.useMemo(() => {
    if (session) {
      const tagStr = session.userProfile.userTag ? ` ${session.userProfile.userTag}` : '';
      return {
        name: `${session.userProfile.displayName}${tagStr}`,
        color: session.userProfile.avatarColor,
        avatar: session.userProfile.displayName.charAt(0).toUpperCase()
      };
    }
    return {
      name: 'Bạn (Cục bộ) #0001',
      color: '#2563eb',
      avatar: 'B'
    };
  }, [session]);

  // Helper to save shared doc key into sessionStorage
  const saveSharedDocKey = React.useCallback(async (docId: string, key: CryptoKey) => {
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) return;
      const raw = await crypto.subtle.exportKey('raw', key);
      const b64 = BinaryUtils.bufferToBase64Url(new Uint8Array(raw));
      sessionStorage.setItem(`vaultsync_shared_key_${docId}`, b64);
    } catch (err) {
      console.error('Lỗi lưu khóa chia sẻ vào sessionStorage:', err);
    }
  }, []);

  // Helper to load shared doc key from sessionStorage
  const loadSharedDocKey = React.useCallback(async (docId: string): Promise<CryptoKey | null> => {
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) return null;
      const b64 = sessionStorage.getItem(`vaultsync_shared_key_${docId}`);
      if (!b64) return null;
      const rawBytes = BinaryUtils.base64UrlToBytes(b64);
      return await crypto.subtle.importKey(
        'raw',
        rawBytes as BufferSource,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
      );
    } catch {
      return null;
    }
  }, []);

  // Shared Folder Background Providers Registry
  const sharedFolderProvidersRef = React.useRef<Map<string, EncryptedYjsProvider>>(new Map());
  const sharedFolderDocsRef = React.useRef<Map<string, Y.Doc>>(new Map());

  // Helper to ensure an active background EncryptedYjsProvider for a shared folder
  const ensureSharedFolderProvider = React.useCallback((folderId: string, folderKey?: CryptoKey | null) => {
    if (sharedFolderProvidersRef.current.has(folderId)) {
      return sharedFolderProvidersRef.current.get(folderId)!;
    }

    const key = folderKey || documentKeysRef.current.get(folderId) || documentKey || session?.vaultRootKey;
    if (!key) return null;

    const wsUrl = getRelayWsUrl();
    const cleanFolderRoomId = folderId.startsWith('folder-') ? folderId : `folder-${folderId}`;
    const folderDoc = new Y.Doc();
    sharedFolderDocsRef.current.set(folderId, folderDoc);

    const folderProvider = new EncryptedYjsProvider({
      serverUrl: wsUrl,
      roomId: cleanFolderRoomId,
      yDoc: folderDoc,
      documentKey: key,
      epoch: 1,
      user: currentUserOptions
    });
    sharedFolderProvidersRef.current.set(folderId, folderProvider);

    // Seed local items into folderDoc
    const folderItemsMap = folderDoc.getMap('shared_items');
    const folderMetaMap = folderDoc.getMap('metadata');

    const itemsInFolder = treeManager.getAllItems().filter(i => 
      i.id === folderId || i.parentId === folderId || treeManager.isDescendantOf(i.id, folderId)
    );
    itemsInFolder.forEach(item => {
      folderItemsMap.set(item.id, item);
    });

    // Initial sync of existing remote folder items into local treeManager
    folderItemsMap.forEach((rawItem: any) => {
      if (rawItem && typeof rawItem === 'object') {
        treeManager.syncItem(rawItem as FileSystemItem);
        if (rawItem.type === 'document' && !documentKeysRef.current.has(rawItem.id) && key) {
          documentKeysRef.current.set(rawItem.id, key);
        }
      }
    });

    // Observe incoming tree changes from peers in this folder
    const handleFolderItemsChange = (event: Y.YMapEvent<any>) => {
      for (const k of event.keysChanged) {
        const item = folderItemsMap.get(k) as FileSystemItem | undefined;
        if (item) {
          // STRICT BOUNDARY CHECK: Item MUST be the folder itself or be a descendant of this folder
          const isBelongingToFolder = item.id === folderId || item.parentId === folderId || treeManager.isDescendantOf(item.id, folderId);
          if (!isBelongingToFolder) {
            continue;
          }

          treeManager.syncItem(item);
          if (item.type === 'document' && !documentKeysRef.current.has(item.id) && key) {
            documentKeysRef.current.set(item.id, key);
          }
          if (item.isTrash && item.id === activeDocId) {
            const remainingDocs = treeManager.getAllItems().filter(i => i.type === 'document' && !i.isTrash && i.id !== activeDocId);
            if (remainingDocs.length > 0 && remainingDocs[0]) {
              setActiveDocId(remainingDocs[0].id);
            }
          }
        } else {
          // Deletion event: STRICT BOUNDARY CHECK
          // Only permanently delete item if it belongs to this shared folder hierarchy
          const existing = treeManager.getItem(k);
          if (existing) {
            const isDescendantOrSelf = k === folderId || existing.parentId === folderId || treeManager.isDescendantOf(k, folderId);
            if (isDescendantOrSelf) {
              const wasActive = k === activeDocId;
              treeManager.permanentDelete(k);
              if (wasActive) {
                const remainingDocs = treeManager.getAllItems().filter(i => i.type === 'document' && !i.isTrash && i.id !== k);
                if (remainingDocs.length > 0 && remainingDocs[0]) {
                  setActiveDocId(remainingDocs[0].id);
                }
              }
            }
          }
        }
      }
      setTreeVersion(v => v + 1);
    };

    folderItemsMap.observe(handleFolderItemsChange);

    // Observe live permissions from peers/owner
    const handleFolderMetaChange = () => {
      const roomPerms = folderMetaMap.get('room_permissions');
      if (roomPerms) {
        const decoded = typeof roomPerms === 'string' ? PermissionsEngine.decodePermissions(roomPerms) : (roomPerms as DocumentPermissions);
        permissionsMapRef.current.set(folderId, decoded);
        setGuestRoomPermissions(decoded);
        const related = treeManager.getAllItems().filter(i => i.id === folderId || i.parentId === folderId || treeManager.isDescendantOf(i.id, folderId));
        related.forEach(item => {
          if (!permissionsMapRef.current.has(item.id)) {
            permissionsMapRef.current.set(item.id, decoded);
          }
        });
        if (related.some(i => i.id === activeDocId)) {
          const currentDocPerms = permissionsMapRef.current.get(activeDocId) || decoded;
          setCurrentPermissions(currentDocPerms);
        }
      }

      // Observe per-document permissions stored in folder metadata
      for (const [key, val] of folderMetaMap.entries()) {
        if (key.startsWith('doc_permissions_')) {
          const docId = key.replace('doc_permissions_', '');
          const docPerms = typeof val === 'string' ? PermissionsEngine.decodePermissions(val) : (val as DocumentPermissions);
          permissionsMapRef.current.set(docId, docPerms);
          if (docId === activeDocId) {
            setCurrentPermissions(docPerms);
            setGuestRoomPermissions(docPerms);
          }
        }
      }
    };

    folderMetaMap.observe(handleFolderMetaChange);
    return folderProvider;
  }, [session?.vaultRootKey, currentUserOptions, treeManager, activeDocId]);

  // Clean up all shared folder providers on unmount
  useEffect(() => {
    return () => {
      sharedFolderProvidersRef.current.forEach(p => p.destroy());
      sharedFolderProvidersRef.current.clear();
      sharedFolderDocsRef.current.clear();
    };
  }, []);

  // Helper to extract or restore pending share information (supports both single doc and folder sharing)
  // Helper to extract or restore pending share information (supports both single doc and folder sharing)
  const getPendingShareInfo = React.useCallback(() => {
    if (typeof window === 'undefined') return null;
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    const folderParam = urlParams.get('folder');
    const titleParam = urlParams.get('title');
    const keyParam = urlParams.get('key');
    const manifestParam = urlParams.get('manifest');
    const permsParam = urlParams.get('perms');

    if (folderParam) {
      const shareData = {
        isFolder: true,
        folderId: folderParam,
        room: folderParam,
        title: titleParam ? decodeURIComponent(titleParam) : 'Thư Mục Được Chia Sẻ',
        key: keyParam || null,
        manifest: manifestParam || null,
        perms: permsParam || null
      };
      sessionStorage.setItem('vaultsync_pending_share', JSON.stringify(shareData));
      return shareData;
    }

    if (roomParam) {
      const shareData = {
        isFolder: false,
        folderId: null,
        room: roomParam,
        title: titleParam ? decodeURIComponent(titleParam) : 'Tài Liệu Được Chia Sẻ',
        key: keyParam || null,
        manifest: null,
        perms: permsParam || null
      };
      sessionStorage.setItem('vaultsync_pending_share', JSON.stringify(shareData));
      return shareData;
    }

    const saved = sessionStorage.getItem('vaultsync_pending_share');
    if (saved) {
      try {
        return JSON.parse(saved) as {
          isFolder?: boolean;
          room?: string;
          folderId?: string | null;
          title: string;
          key: string | null;
          manifest?: string | null;
          perms?: string | null;
        };
      } catch {
        return null;
      }
    }
    return null;
  }, []);

  // Automatically register shared room document / folder from URL if present (runs once and cleans URL/sessionStorage)
  const hasProcessedIncomingShareRef = React.useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hasProcessedIncomingShareRef.current) return;
    const shareInfo = getPendingShareInfo();
    if (!shareInfo) return;

    hasProcessedIncomingShareRef.current = true;
    async function processIncomingShare(info: {
      isFolder?: boolean;
      room?: string | null;
      folderId?: string | null;
      title: string;
      key: string | null;
      manifest?: string | null;
      perms?: string | null;
    }) {
      const decodedPerms = PermissionsEngine.decodePermissions(info.perms);
      if (info.perms) {
        setCurrentPermissions(decodedPerms);
        setGuestRoomPermissions(decodedPerms);
      }

      if (info.isFolder && info.folderId) {
        // Folder Sharing Provisioning
        const folderId = info.folderId;
        const folderTitle = info.title || 'Thư Mục Chia Sẻ';

        // 1. Ensure folder item in tree & store permissions
        treeManager.ensureItem(folderId, folderTitle, 'folder', null, 'Folder');
        permissionsMapRef.current.set(folderId, decodedPerms);

        // 2. Decode manifest if provided
        let firstDocId: string | null = null;
        const manifestItems: any[] = [];
        if (info.manifest) {
          try {
            const manifestJson = new TextDecoder().decode(BinaryUtils.base64UrlToBytes(info.manifest));
            const manifest = JSON.parse(manifestJson);
            if (manifest.items && Array.isArray(manifest.items)) {
              for (const item of manifest.items) {
                treeManager.ensureItem(item.id, item.name, item.type, item.parentId || folderId, item.icon);
                permissionsMapRef.current.set(item.id, decodedPerms);
                manifestItems.push(item);
                if (item.type === 'document' && !firstDocId) {
                  firstDocId = item.id;
                }
              }
            }
          } catch (err) {
            console.error('Lỗi giải mã manifest thư mục chia sẻ:', err);
          }
        }

        // 3. Import & Save Key for folder and ALL child docs
        if (info.key) {
          try {
            const rawKeyBytes = BinaryUtils.base64UrlToBytes(info.key);
            const importedKey = await crypto.subtle.importKey(
              'raw',
              rawKeyBytes as BufferSource,
              { name: 'AES-GCM', length: 256 },
              true,
              ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
            );

            documentKeysRef.current.set(folderId, importedKey);
            await saveSharedDocKey(folderId, importedKey);

            for (const item of manifestItems) {
              documentKeysRef.current.set(item.id, importedKey);
              await saveSharedDocKey(item.id, importedKey);
            }

            if (firstDocId) {
              documentKeysRef.current.set(firstDocId, importedKey);
              await saveSharedDocKey(firstDocId, importedKey);
              setDocumentKey(importedKey);
            }

            // Connect background shared folder provider
            ensureSharedFolderProvider(folderId, importedKey);
          } catch (err) {
            console.error('Lỗi nhập khóa thư mục chia sẻ:', err);
          }
        }

        const currentActive = localStorage.getItem('vaultsync_active_doc');
        if (firstDocId && (!currentActive || currentActive === 'doc-default' || !treeManager.getItem(currentActive))) {
          setActiveDocId(firstDocId);
        }
        setTreeVersion(v => v + 1);
      } else if (info.room) {
        // Single Document Sharing
        const roomId = info.room;
        permissionsMapRef.current.set(roomId, decodedPerms);

        if (info.key) {
          try {
            const rawKeyBytes = BinaryUtils.base64UrlToBytes(info.key);
            const importedKey = await crypto.subtle.importKey(
              'raw',
              rawKeyBytes as BufferSource,
              { name: 'AES-GCM', length: 256 },
              true,
              ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
            );

            documentKeysRef.current.set(roomId, importedKey);
            await saveSharedDocKey(roomId, importedKey);
            setDocumentKey(importedKey);
          } catch (err) {
            console.error('Lỗi nhập khóa mã hóa tài liệu từ URL:', err);
          }
        }

        treeManager.ensureItem(roomId, info.title, 'document', null, 'Share2');
        const currentActive = localStorage.getItem('vaultsync_active_doc');
        if (!currentActive || currentActive === 'doc-default') {
          setActiveDocId(roomId);
        }
        setTreeVersion(v => v + 1);
      }

      // Clean URL query parameters if present
      if (window.location.search) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      if (session?.vaultRootKey) {
        try {
          const treeBytes = treeManager.encodeState();
          await storage.saveTreeSnapshot(treeBytes, session.vaultRootKey);
        } catch (err) {
          console.error('Lỗi lưu cây thư mục sau khi nạp share:', err);
        }
      }
    }

    void processIncomingShare(shareInfo);
  }, [treeManager, getPendingShareInfo, saveSharedDocKey, ensureSharedFolderProvider, session?.vaultRootKey, storage]);

  // Update active document key when activeDocId changes, checking memory, sessionStorage, parent folder, or fallback to vaultRootKey
  useEffect(() => {
    let isMounted = true;
    async function updateDocumentKey() {
      const customKey = documentKeysRef.current.get(activeDocId);
      if (customKey) {
        if (isMounted) setDocumentKey(customKey);
        return;
      }

      // Try restoring shared key from sessionStorage (preserves decryption after F5)
      const storedKey = await loadSharedDocKey(activeDocId);
      if (storedKey && isMounted) {
        documentKeysRef.current.set(activeDocId, storedKey);
        setDocumentKey(storedKey);
        return;
      }

      // Check if document belongs to a shared parent folder
      const currentItem = treeManager.getItem(activeDocId);
      if (currentItem?.parentId) {
        const parentKey = documentKeysRef.current.get(currentItem.parentId);
        if (parentKey && isMounted) {
          documentKeysRef.current.set(activeDocId, parentKey);
          await saveSharedDocKey(activeDocId, parentKey);
          setDocumentKey(parentKey);
          return;
        }

        const storedParentKey = await loadSharedDocKey(currentItem.parentId);
        if (storedParentKey && isMounted) {
          documentKeysRef.current.set(activeDocId, storedParentKey);
          documentKeysRef.current.set(currentItem.parentId, storedParentKey);
          await saveSharedDocKey(activeDocId, storedParentKey);
          setDocumentKey(storedParentKey);
          return;
        }
      }

      // Fallback to user's vault root key for personal documents
      if (session?.vaultRootKey && isMounted) {
        setDocumentKey(session.vaultRootKey);
      }
    }

    void updateDocumentKey();
    return () => {
      isMounted = false;
    };
  }, [activeDocId, session, loadSharedDocKey, saveSharedDocKey, treeManager]);

  // Isolate and switch Y.Doc per active document to prevent cross-document text bleeding
  useEffect(() => {
    setIsDocHydrated(false);
    setActiveCommentThreadId(null);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vaultsync_active_doc', activeDocId);
    }
    let currentYDoc = yDocsRef.current.get(activeDocId);
    if (!currentYDoc) {
      currentYDoc = new Y.Doc();
      yDocsRef.current.set(activeDocId, currentYDoc);
    }
    setYDoc(currentYDoc);
    setCommentEngine(new InlineCommentAnchorEngine(currentYDoc));
    setChatEngine(new RoomChatEngine(currentYDoc));
  }, [activeDocId]);

  // Connect EncryptedYjsProvider whenever documentKey or activeDocId changes
  useEffect(() => {
    if (!documentKey || !activeDocId) return;

    const wsUrl = getRelayWsUrl();
    const cleanRoomId = activeDocId.startsWith('doc-') ? activeDocId : `doc-${activeDocId}`;
    const targetYDoc = yDocsRef.current.get(activeDocId) || yDoc;

    const newProvider = new EncryptedYjsProvider({
      serverUrl: wsUrl,
      roomId: cleanRoomId,
      yDoc: targetYDoc,
      documentKey,
      epoch: 1,
      user: currentUserOptions,
      onStatusChange: (status) => setProviderStatus(status)
    });

    const handleAwarenessChange = () => {
      setAwarenessUsers(newProvider.getAwarenessUsers());
    };

    newProvider.awareness.on('change', handleAwarenessChange);
    setProvider(newProvider);

    return () => {
      newProvider.awareness.off('change', handleAwarenessChange);
      newProvider.destroy();
    };
  }, [documentKey, activeDocId, currentUserOptions, yDoc]);

  // 1. Restore tree snapshot on vault unlock / mount (strictly using session.vaultRootKey)
  const hasRestoredTreeRef = React.useRef(false);
  useEffect(() => {
    if (!session?.vaultRootKey) return;
    if (hasRestoredTreeRef.current) return;
    hasRestoredTreeRef.current = true;

    const rootKey = session.vaultRootKey;
    let isMounted = true;

    async function restoreTreeData() {
      try {
        const treeSnapshot = await storage.loadTreeSnapshot(rootKey);
        if (treeSnapshot && treeSnapshot.length > 0 && isMounted) {
          treeManager.applyStateUpdate(treeSnapshot);
        }

        // If there is a pending shared document or folder, ensure it is added to tree and selected
        const pendingShare = getPendingShareInfo();
        if (pendingShare && isMounted) {
          const targetId = pendingShare.room || pendingShare.folderId;
          if (targetId) {
            treeManager.ensureItem(
              targetId,
              pendingShare.title,
              pendingShare.isFolder ? 'folder' : 'document',
              null,
              pendingShare.isFolder ? 'Folder' : 'Share2'
            );
            if (!pendingShare.isFolder) {
              setActiveDocId(targetId);
            }
          }

          if (typeof window !== 'undefined') {
            if (window.location.search) {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }
        }

        // Validate active document exists, is not trash, and is a document
        const currentItem = treeManager.getItem(activeDocId);
        if (!currentItem || currentItem.isTrash || currentItem.type !== 'document') {
          const validDocs = treeManager.getAllItems().filter(i => i.type === 'document' && !i.isTrash);
          if (validDocs.length > 0 && validDocs[0] && isMounted) {
            setActiveDocId(validDocs[0].id);
          }
        }
        if (isMounted) {
          setTreeVersion(v => v + 1);
        }
      } catch (err) {
        console.error('Lỗi khôi phục cây thư mục từ IndexedDB:', err);
      }
    }

    restoreTreeData();
    return () => {
      isMounted = false;
    };
  }, [session?.vaultRootKey, storage, treeManager, getPendingShareInfo, activeDocId]);

  // 2. Restore active document state from IndexedDB whenever activeDocId or yDoc changes
  useEffect(() => {
    if (!activeDocId) return;
    const currentKey = documentKey;
    const targetDocId = activeDocId;
    const targetYDoc = yDoc;
    let isMounted = true;

    async function restoreActiveDocument() {
      setIsDocHydrated(false);
      try {
        if (currentKey) {
          const docState = await storage.loadDocumentState(targetDocId, currentKey);
          if (isMounted) {
            if (docState.snapshot && docState.snapshot.length > 0) {
              Y.applyUpdate(targetYDoc, docState.snapshot);
            }
            for (const update of docState.updates) {
              Y.applyUpdate(targetYDoc, update);
            }
          }
        }
      } catch (err) {
        console.error('Lỗi nạp dữ liệu tài liệu từ IndexedDB:', err);
      } finally {
        if (isMounted) {
          setIsDocHydrated(true);
        }
      }
    }

    restoreActiveDocument();
    return () => {
      isMounted = false;
    };
  }, [activeDocId, yDoc, documentKey, storage]);

  // Auto-save Document Snapshot to Encrypted IndexedDB on change (Debounced 300ms)
  useEffect(() => {
    if (!documentKey || !activeDocId) return;
    const currentKey = documentKey;
    const targetDocId = activeDocId;
    const targetYDoc = yDoc;

    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    const performSave = async () => {
      try {
        setSaveStatus('saving');
        const snapshot = Y.encodeStateAsUpdate(targetYDoc);
        await storage.saveDocumentSnapshot(targetDocId, snapshot, currentKey);
        setSaveStatus('saved');
        setLastSavedTime(Date.now());
      } catch (err) {
        console.error('Tự động lưu tài liệu thất bại:', err);
        setSaveStatus('error');
      }
    };

    const handleYDocUpdate = () => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        void performSave();
      }, 300);
    };

    targetYDoc.on('update', handleYDocUpdate);

    return () => {
      if (saveTimer) clearTimeout(saveTimer);
      targetYDoc.off('update', handleYDocUpdate);
      void performSave();
    };
  }, [yDoc, activeDocId, documentKey, storage, isDocHydrated]);

  // Auto-save File Tree Snapshot to Encrypted IndexedDB on change (Debounced 500ms, strictly using vaultRootKey)
  useEffect(() => {
    if (!session?.vaultRootKey) return;
    const rootKey = session.vaultRootKey;

    let saveTreeTimer: ReturnType<typeof setTimeout> | null = null;

    const handleTreeChange = () => {
      if (saveTreeTimer) clearTimeout(saveTreeTimer);
      saveTreeTimer = setTimeout(async () => {
        try {
          const treeBytes = treeManager.encodeState();
          await storage.saveTreeSnapshot(treeBytes, rootKey);
        } catch (err) {
          console.error('Tự động lưu cây thư mục thất bại:', err);
        }
      }, 500);
    };

    const unobserve = treeManager.observe(handleTreeChange);
    return () => {
      if (saveTreeTimer) clearTimeout(saveTreeTimer);
      unobserve();
    };
  }, [treeManager, session?.vaultRootKey, storage]);

  // Initialize cryptographic document key on mount if session is not already provided
  useEffect(() => {
    if (session) {
      const customKey = documentKeysRef.current.get(activeDocId);
      if (customKey) {
        setDocumentKey(customKey);
      } else {
        setDocumentKey(session.vaultRootKey);
      }
      return;
    }

    async function initCrypto() {
      try {
        const dek = await EnvelopeEncryptionManager.generateDocumentKey();
        setDocumentKey(dek);
      } catch (err) {
        console.error('Failed to initialize document key:', err);
      }
    }
    initCrypto();
  }, [session, activeDocId]);

  useEffect(() => {
    const unobserve = treeManager.observe(() => {
      setTreeVersion(v => v + 1);
    });
    return () => unobserve();
  }, [treeManager]);

  // Listen for real-time document title changes from Y.Doc metadata (E2EE Collaborative Title Sync)
  useEffect(() => {
    if (!activeDocId) return;
    const currentItem = treeManager.getItem(activeDocId);
    if (!currentItem || currentItem.type !== 'document') return;

    const targetDocId = activeDocId;
    const metaMap = yDoc.getMap('metadata');

    // Populate metadata title if empty
    const existingTitle = metaMap.get('title') as string | undefined;
    if (!existingTitle && currentItem.name) {
      metaMap.set('title', currentItem.name);
    }

    const handleMetaChange = (event: Y.YMapEvent<any>) => {
      // 1. Synchronize Document Title
      if (event.keysChanged.has('title')) {
        const syncedTitle = metaMap.get('title') as string | undefined;
        if (syncedTitle && syncedTitle.trim()) {
          const item = treeManager.getItem(targetDocId);
          if (item && item.type === 'document' && item.name !== syncedTitle) {
            treeManager.renameItem(targetDocId, syncedTitle);
            setTreeVersion(v => v + 1);
          }
        }
      }

      // 2. Synchronize Real-Time Folder Renames across peers
      for (const key of event.keysChanged) {
        if (key.startsWith('folder_name_')) {
          const folderId = key.replace('folder_name_', '');
          const newFolderName = metaMap.get(key) as string | undefined;
          if (newFolderName && newFolderName.trim()) {
            const folderItem = treeManager.getItem(folderId);
            if (folderItem && folderItem.type === 'folder' && folderItem.name !== newFolderName) {
              treeManager.renameItem(folderId, newFolderName);
              setTreeVersion(v => v + 1);
            }
          }
        }
      }

      // 3. Synchronize Live Permissions across peers
      if (event.keysChanged.has('room_permissions')) {
        const roomPerms = metaMap.get('room_permissions');
        if (roomPerms) {
          const decoded = typeof roomPerms === 'string' ? PermissionsEngine.decodePermissions(roomPerms) : (roomPerms as DocumentPermissions);
          setGuestRoomPermissions(decoded);
          if (currentPermissions.role !== 'owner') {
            setCurrentPermissions(decoded);
            permissionsMapRef.current.set(targetDocId, decoded);
          }
        }
      }

      // 4. Synchronize Document Trashing / Deletion from Owner (Single-room Document Sync)
      if (event.keysChanged.has('isTrash')) {
        const isTrash = Boolean(metaMap.get('isTrash'));
        const item = treeManager.getItem(targetDocId);
        if (item && item.isTrash !== isTrash) {
          if (isTrash) {
            treeManager.moveToTrash(targetDocId);
            const remainingDocs = treeManager.getAllItems().filter(i => i.type === 'document' && !i.isTrash && i.id !== targetDocId);
            if (remainingDocs.length > 0 && remainingDocs[0]) {
              setActiveDocId(remainingDocs[0].id);
            }
          } else {
            treeManager.restoreFromTrash(targetDocId);
          }
          setTreeVersion(v => v + 1);
        }
      }
    };

    metaMap.observe(handleMetaChange);
    return () => metaMap.unobserve(handleMetaChange);
  }, [yDoc, activeDocId, treeManager, currentPermissions.role]);

  const handleTreeMutation = React.useCallback((
    action: 'create' | 'rename' | 'move' | 'trash' | 'restore' | 'delete',
    item: any
  ) => {
    if (!item || !item.id) return;
    const currentItem = treeManager.getItem(item.id) || item;

    // 1. If mutating active single doc metadata, propagate to active doc room
    if (item.id === activeDocId) {
      const metaMap = yDoc.getMap('metadata');
      if (action === 'trash') {
        metaMap.set('isTrash', true);
      } else if (action === 'restore') {
        metaMap.set('isTrash', false);
      } else if (action === 'rename' && currentItem.name) {
        if (metaMap.get('title') !== currentItem.name) {
          metaMap.set('title', currentItem.name);
        }
      }
    }

    // 2. Broadcast to all active shared folder background providers
    sharedFolderDocsRef.current.forEach((folderDoc, folderId) => {
      const folderItemsMap = folderDoc.getMap('shared_items');
      const isDirectChildOrDescendant = currentItem.parentId === folderId || treeManager.isDescendantOf(item.id, folderId) || item.id === folderId;
      const alreadyInFolderMap = folderItemsMap.has(item.id);

      if (isDirectChildOrDescendant || alreadyInFolderMap) {
        if (action === 'delete') {
          folderItemsMap.delete(item.id);
          if (item.type === 'folder') {
            const descIds = treeManager.getAllDescendantIds(item.id);
            for (const descId of descIds) {
              folderItemsMap.delete(descId);
            }
          }
        } else if (action === 'trash') {
          folderItemsMap.set(item.id, { ...currentItem, isTrash: true, trashedAt: Date.now(), updatedAt: Date.now() });
          if (item.type === 'folder') {
            const descIds = treeManager.getAllDescendantIds(item.id);
            for (const descId of descIds) {
              const desc = treeManager.getItem(descId);
              if (desc) {
                folderItemsMap.set(descId, { ...desc, isTrash: true, trashedAt: Date.now(), updatedAt: Date.now() });
              }
            }
          }
        } else if (action === 'restore') {
          folderItemsMap.set(item.id, { ...currentItem, isTrash: false, trashedAt: undefined, updatedAt: Date.now() });
          if (item.type === 'folder') {
            const descIds = treeManager.getAllDescendantIds(item.id);
            for (const descId of descIds) {
              const desc = treeManager.getItem(descId);
              if (desc) {
                folderItemsMap.set(descId, { ...desc, isTrash: false, trashedAt: undefined, updatedAt: Date.now() });
              }
            }
          }
        } else {
          folderItemsMap.set(item.id, { ...currentItem, updatedAt: Date.now() });
        }
      }
    });
  }, [yDoc, treeManager, activeDocId]);

  const handleUpdateLivePermissions = React.useCallback((
    targetId: string,
    newPerms: DocumentPermissions
  ) => {
    setGuestRoomPermissions(newPerms);
    if (currentPermissions.role !== 'owner') {
      setCurrentPermissions(newPerms);
    }
    permissionsMapRef.current.set(targetId, newPerms);

    // 1. If target is a shared folder, update folder metadata and all descendant docs
    const folderDoc = sharedFolderDocsRef.current.get(targetId);
    if (folderDoc) {
      folderDoc.getMap('metadata').set('room_permissions', newPerms);
      const itemsInFolder = treeManager.getAllItems().filter(i => 
        i.id === targetId || treeManager.isDescendantOf(i.id, targetId) || i.parentId === targetId
      );
      itemsInFolder.forEach(item => {
        permissionsMapRef.current.set(item.id, newPerms);
        const childYDoc = yDocsRef.current.get(item.id);
        if (childYDoc) {
          childYDoc.getMap('metadata').set('room_permissions', newPerms);
        }
      });
    }

    // 2. If target is a child doc of a shared folder, broadcast in parent folder metadata
    const currentItem = treeManager.getItem(targetId);
    if (currentItem?.parentId) {
      const parentFolderDoc = sharedFolderDocsRef.current.get(currentItem.parentId);
      if (parentFolderDoc) {
        parentFolderDoc.getMap('metadata').set(`doc_permissions_${targetId}`, newPerms);
      }
    }

    // 3. Broadcast to target Y.Doc and active Y.Doc
    const targetYDoc = yDocsRef.current.get(targetId) || yDoc;
    if (targetYDoc) {
      targetYDoc.getMap('metadata').set('room_permissions', newPerms);
    }
  }, [yDoc, treeManager, currentPermissions.role]);

  const handleSelectDoc = (id: string) => {
    const item = treeManager.getItem(id);
    if (item && item.type === 'document') {
      setActiveDocId(id);
      let docPerms = permissionsMapRef.current.get(id);
      if (!docPerms && item.parentId) {
        docPerms = permissionsMapRef.current.get(item.parentId);
      }
      if (!docPerms) {
        docPerms = session ? DEFAULT_OWNER_PERMISSIONS : guestRoomPermissions;
      }
      setCurrentPermissions(docPerms);
      readTracker.markAsRead(id, 'all');
      setUnreadDocIds(prev => prev.filter(docId => docId !== id));
      // Auto-close left navigation drawer on mobile screens
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setIsLeftSidebarOpen(false);
      }
    }
  };

  // Dynamically calculate unread status per document
  const updateUnreadState = React.useCallback(() => {
    const threads = commentEngine.getAllThreads().map(t => t.thread);
    const messages = chatEngine.getMessages();
    const currentUserId = session?.userProfile.userId || session?.userProfile.displayName || 'user_local';

    // 1. Check unread status for currently active document
    const activeUnread = readTracker.getUnreadCounts(activeDocId, currentUserId, threads, messages);
    setHasUnreadActiveDiscussion(activeUnread.hasUnread && !isRightSidebarOpen);

    // 2. Check unread status for other documents in the file tree
    const allDocs = treeManager.getAllItems().filter(i => i.type === 'document' && !i.isTrash);
    const unreadIds: string[] = [];
    for (const doc of allDocs) {
      if (doc.id !== activeDocId) {
        const docThreads = threads.filter(t => t.documentId === doc.id);
        const docUnread = readTracker.getUnreadCounts(doc.id, currentUserId, docThreads, []);
        if (docUnread.hasUnread) {
          unreadIds.push(doc.id);
        }
      }
    }
    setUnreadDocIds(unreadIds);
  }, [commentEngine, chatEngine, activeDocId, isRightSidebarOpen, readTracker, session, treeManager]);

  // Subscribe to live comment/chat updates to trigger unread indicators
  useEffect(() => {
    updateUnreadState();
    const unsubComments = commentEngine.onThreadsChange(() => updateUnreadState());
    const unsubChat = chatEngine.onMessagesChange(() => updateUnreadState());

    return () => {
      unsubComments();
      unsubChat();
    };
  }, [updateUnreadState, commentEngine, chatEngine]);

  // When Right Sidebar is opened, mark active doc discussion as read
  useEffect(() => {
    if (isRightSidebarOpen) {
      readTracker.markAsRead(activeDocId, 'all');
      setHasUnreadActiveDiscussion(false);
    }
  }, [isRightSidebarOpen, activeDocId, readTracker]);

  const activeItem = treeManager.getItem(activeDocId);
  const activeDocTitle = activeItem?.name || 'Chào mừng đến với VaultSync';
  const parentFolder = activeItem?.parentId ? treeManager.getItem(activeItem.parentId) : null;
  const folderName = parentFolder?.name || 'Kho Lưu Trữ';

  // Modals state
  const [shareModalConfig, setShareModalConfig] = useState<{
    isOpen: boolean;
    targetId: string;
    targetTitle: string;
    targetType: 'document' | 'folder';
    folderManifest?: any;
    key?: CryptoKey | null;
  }>({
    isOpen: false,
    targetId: '',
    targetTitle: '',
    targetType: 'document'
  });
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Command Palette Engine instance
  const [commandPaletteEngine] = useState(() => new CommandPaletteEngine([], (state) => {
    setIsCommandPaletteOpen(state.isOpen);
  }));

  const handleExportDoc = (docId: string, docTitle: string) => {
    handleSelectDoc(docId);
    setExportDocTitle(docTitle);
    setIsExportModalOpen(true);
  };

  const handleOpenShareDocument = () => {
    setShareModalConfig({
      isOpen: true,
      targetId: activeDocId,
      targetTitle: activeDocTitle,
      targetType: 'document',
      key: documentKey
    });
  };

  const handleShareFolder = async (folderId: string, folderTitle: string) => {
    let key = documentKeysRef.current.get(folderId) || documentKey || session?.vaultRootKey;
    if (!key) {
      try {
        key = await crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
        );
      } catch {
        // fallback
      }
    }

    const itemsInFolder = treeManager.getAllItems().filter(i => 
      i.id !== folderId && !i.isTrash && (i.parentId === folderId || treeManager.isDescendantOf(i.id, folderId))
    );

    const manifest = {
      folder: { id: folderId, name: folderTitle },
      items: itemsInFolder.map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        parentId: i.parentId,
        icon: i.icon
      }))
    };

    if (key) {
      documentKeysRef.current.set(folderId, key);
      void saveSharedDocKey(folderId, key);
      for (const item of itemsInFolder) {
        documentKeysRef.current.set(item.id, key);
        void saveSharedDocKey(item.id, key);
      }
    }

    // Connect background shared folder provider for the Owner
    ensureSharedFolderProvider(folderId, key);

    setShareModalConfig({
      isOpen: true,
      targetId: folderId,
      targetTitle: folderTitle,
      targetType: 'folder',
      folderManifest: manifest,
      key: key || null
    });
  };

  const handleJoinRoom = async (
    roomId: string,
    title?: string,
    key?: CryptoKey,
    isFolder?: boolean,
    manifestData?: any,
    permissions?: DocumentPermissions
  ) => {
    const activePerms = permissions || (session ? DEFAULT_OWNER_PERMISSIONS : DEFAULT_VIEWER_PERMISSIONS);
    permissionsMapRef.current.set(roomId, activePerms);
    setCurrentPermissions(activePerms);
    setGuestRoomPermissions(activePerms);

    let keyB64: string | null = null;
    if (key) {
      try {
        const raw = await crypto.subtle.exportKey('raw', key);
        keyB64 = BinaryUtils.bufferToBase64Url(new Uint8Array(raw));
      } catch {
        // ignore
      }
    }

    // 1. Store pending share data in sessionStorage for reload persistence
    const shareData = {
      isFolder: Boolean(isFolder),
      folderId: isFolder ? roomId : null,
      room: isFolder ? null : roomId,
      title: title || (isFolder ? 'Thư Mục Cộng Tác' : 'Tài Liệu Cộng Tác'),
      key: keyB64,
      manifest: manifestData ? BinaryUtils.bufferToBase64Url(new TextEncoder().encode(JSON.stringify(manifestData))) : null,
      perms: PermissionsEngine.encodePermissions(activePerms)
    };
    try {
      sessionStorage.setItem('vaultsync_pending_share', JSON.stringify(shareData));
    } catch {
      // ignore
    }

    if (isFolder) {
      const folderTitle = title || manifestData?.folder?.name || 'Thư Mục Cộng Tác';
      treeManager.ensureItem(roomId, folderTitle, 'folder', null, 'Folder');
      permissionsMapRef.current.set(roomId, activePerms);

      if (key) {
        documentKeysRef.current.set(roomId, key);
        await saveSharedDocKey(roomId, key);
      }

      let firstDocId: string | null = null;
      if (manifestData && Array.isArray(manifestData.items) && manifestData.items.length > 0) {
        for (const item of manifestData.items) {
          treeManager.ensureItem(item.id, item.name, item.type, item.parentId || roomId, item.icon);
          permissionsMapRef.current.set(item.id, activePerms);
          if (key) {
            documentKeysRef.current.set(item.id, key);
            await saveSharedDocKey(item.id, key);
          }
          if (item.type === 'document' && !firstDocId) {
            firstDocId = item.id;
          }
        }
      }

      // If no child document exists in manifest, ensure a default document is created
      if (!firstDocId) {
        const defaultDoc = treeManager.createItem('Ghi chú mới', 'document', roomId);
        firstDocId = defaultDoc.id;
        permissionsMapRef.current.set(firstDocId, activePerms);
        if (key) {
          documentKeysRef.current.set(firstDocId, key);
          await saveSharedDocKey(firstDocId, key);
        }
      }

      // Connect background shared folder provider
      ensureSharedFolderProvider(roomId, key);

      if (firstDocId) {
        if (key) {
          documentKeysRef.current.set(firstDocId, key);
          await saveSharedDocKey(firstDocId, key);
          setDocumentKey(key);
        }
        handleSelectDoc(firstDocId);
      }

      // Persist tree snapshot immediately to storage
      if (session?.vaultRootKey) {
        try {
          const treeBytes = treeManager.encodeState();
          await storage.saveTreeSnapshot(treeBytes, session.vaultRootKey);
        } catch (err) {
          console.error('Lỗi lưu cây thư mục sau khi tham gia:', err);
        }
      }

      setTreeVersion(v => v + 1);
      setIsDocHydrated(true);
      return;
    }

    // Single Document Room
    if (key) {
      documentKeysRef.current.set(roomId, key);
      await saveSharedDocKey(roomId, key);
      setDocumentKey(key);
    }
    const cleanTitle = title || 'Tài Liệu Cộng Tác';
    treeManager.ensureItem(roomId, cleanTitle, 'document', null, 'Share2');
    permissionsMapRef.current.set(roomId, activePerms);
    handleSelectDoc(roomId);

    // Persist tree snapshot immediately to storage
    if (session?.vaultRootKey) {
      try {
        const treeBytes = treeManager.encodeState();
        await storage.saveTreeSnapshot(treeBytes, session.vaultRootKey);
      } catch (err) {
        console.error('Lỗi lưu cây thư mục sau khi tham gia:', err);
      }
    }

    setTreeVersion(v => v + 1);
    setIsDocHydrated(true);
  };

  const handleTitleChange = (newTitle: string) => {
    if (activeDocId) {
      const currentItem = treeManager.getItem(activeDocId);
      if (currentItem && currentItem.type === 'document') {
        treeManager.renameItem(activeDocId, newTitle);
        const metaMap = yDoc.getMap('metadata');
        if (metaMap.get('title') !== newTitle) {
          metaMap.set('title', newTitle);
        }
        setTreeVersion(v => v + 1);
      }
    }
  };

  // Sync actions into CommandPaletteEngine whenever dependencies change
  useEffect(() => {
    const allDocs = treeManager.getAllItems().filter(i => i.type === 'document' && !i.isTrash);
    
    const baseActions: PaletteAction[] = [
      // 1. Document Actions
      {
        id: 'new-doc',
        title: 'Tạo ghi chú mới',
        subtitle: 'Tạo tài liệu mới trong cây thư mục',
        category: 'Document',
        shortcut: 'Ctrl+N',
        keywords: ['tao', 'ghi chu', 'new', 'doc', 'note', 'create'],
        handler: () => {
          const newDoc = treeManager.createItem('Ghi chú mới', 'document');
          setActiveDocId(newDoc.id);
        }
      },
      {
        id: 'new-folder',
        title: 'Tạo thư mục mới',
        subtitle: 'Tạo thư mục lưu trữ tài liệu',
        category: 'Document',
        shortcut: 'Ctrl+Shift+N',
        keywords: ['thu muc', 'folder', 'new', 'directory'],
        handler: () => {
          treeManager.createItem('Thư mục mới', 'folder');
        }
      },
      {
        id: 'join-room',
        title: 'Tham gia phòng cộng tác (Join Room)',
        subtitle: 'Nhập mã phòng rút gọn hoặc dán liên kết để bắt đầu',
        category: 'Security',
        shortcut: 'Ctrl+J',
        keywords: ['join', 'tham gia', 'phong', 'room', 'code', 'ma'],
        handler: () => setIsJoinRoomModalOpen(true)
      },
      // 2. Security & Sharing
      {
        id: 'share-key',
        title: 'Chia sẻ quyền truy cập tài liệu / thư mục',
        subtitle: 'Mã hóa an toàn cho thành viên mới',
        category: 'Security',
        keywords: ['share', 'chia se', 'quyen', 'member', 'folder'],
        handler: () => handleOpenShareDocument()
      },
      {
        id: 'open-settings',
        title: 'Cài đặt kho lưu trữ',
        subtitle: 'Quản lý hồ sơ, mật khẩu, bộ nhớ và giao diện',
        category: 'Preferences',
        shortcut: 'Ctrl+,',
        keywords: ['settings', 'cai dat', 'cài đặt', 'preferences', 'profile', 'password', 'theme'],
        handler: () => setIsSettingsModalOpen(true)
      },
      {
        id: 'lock-vault',
        title: 'Khóa Kho Lưu Trữ (Lock Vault)',
        subtitle: 'Xóa khóa giải mã khỏi bộ nhớ và chuyển về màn hình khóa',
        category: 'Security',
        shortcut: 'Ctrl+Shift+L',
        keywords: ['lock', 'khoa', 'bao ve', 'logout', 'dang xuat'],
        handler: () => {
          if (onLockVault) onLockVault();
        }
      },
      // 3. Theme Preferences
      {
        id: 'theme-sun',
        title: 'Giao diện Kem Sữa (Sun Theme)',
        subtitle: 'Tông ấm áp, trang nhã, tương phản cao',
        category: 'Preferences',
        shortcut: 'Alt+1',
        keywords: ['sun', 'sang', 'kem sua', 'light'],
        handler: () => onThemeChange('sun')
      },
      {
        id: 'theme-cloud',
        title: 'Giao diện Mây Trắng Xám (Cloud Theme)',
        subtitle: 'Tông mây trắng xám sáng dịu mát, chống mỏi mắt',
        category: 'Preferences',
        shortcut: 'Alt+2',
        keywords: ['cloud', 'may xam', 'gray'],
        handler: () => onThemeChange('cloud')
      },
      {
        id: 'theme-night',
        title: 'Giao diện Đêm Huyền Bí (Night Theme)',
        subtitle: 'Tông đen/slate sâu tinh tế, bảo vệ thị lực ban đêm',
        category: 'Preferences',
        shortcut: 'Alt+3',
        keywords: ['night', 'toi', 'dark', 'black'],
        handler: () => onThemeChange('night')
      },
      // 4. Export Actions
      {
        id: 'export-md',
        title: 'Xuất tài liệu sang Markdown (.md)',
        subtitle: 'Tải về định dạng Markdown tiêu chuẩn',
        category: 'Export',
        keywords: ['export', 'xuat', 'markdown', 'md'],
        handler: () => {
          setExportDocTitle(activeDocTitle);
          setIsExportModalOpen(true);
        }
      },
      {
        id: 'export-html',
        title: 'Xuất trang HTML độc lập (.html)',
        subtitle: 'Tải về tệp HTML hoàn chỉnh có nhúng CSS',
        category: 'Export',
        keywords: ['export', 'xuat', 'html', 'web'],
        handler: () => {
          setExportDocTitle(activeDocTitle);
          setIsExportModalOpen(true);
        }
      }
    ];

    // Dynamic document navigation items
    const docActions: PaletteAction[] = allDocs.map(doc => ({
      id: `open-${doc.id}`,
      title: doc.name,
      subtitle: `Mở tài liệu: ${doc.name}`,
      category: 'Document',
      keywords: ['chuyen', 'mo', 'open', 'doc', doc.name.toLowerCase()],
      handler: () => setActiveDocId(doc.id)
    }));

    commandPaletteEngine.setActions([...baseActions, ...docActions]);
  }, [treeManager, activeDocId, activeDocTitle, folderName, commandPaletteEngine, onThemeChange, onLockVault, handleOpenShareDocument]);

  // Global hotkeys (Ctrl+Shift+L to lock vault)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        if (onLockVault) {
          onLockVault();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onLockVault]);

  // Bidirectional interaction handlers
  const handleCommentClickFromEditor = (threadId: string) => {
    setActiveCommentThreadId(threadId);
    setIsRightSidebarOpen(true);
  };

  const handleSelectThreadFromSidebar = (threadId: string | null) => {
    setActiveCommentThreadId(threadId);
  };

  const handleAddInlineComment = (draft: { from: number; to: number; quotedText: string }) => {
    setCommentDraft(draft);
    setIsRightSidebarOpen(true);
  };

  const handleCreateNewNote = () => {
    const newDoc = treeManager.createItem('Ghi chú mới', 'document');
    setActiveDocId(newDoc.id);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-theme-bg text-theme-text font-sans">
      {/* 1. Header Bar */}
      <HeaderBar
        theme={theme}
        onThemeChange={onThemeChange}
        isLeftSidebarOpen={isLeftSidebarOpen}
        onToggleLeftSidebar={() => setIsLeftSidebarOpen(prev => !prev)}
        isRightSidebarOpen={isRightSidebarOpen}
        onToggleRightSidebar={() => setIsRightSidebarOpen(prev => !prev)}
        onOpenShareModal={handleOpenShareDocument}
        onOpenExportModal={() => {
          setExportDocTitle(activeDocTitle);
          setIsExportModalOpen(true);
        }}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onLockVault={onLockVault}
        providerStatus={providerStatus}
        awarenessUsers={awarenessUsers}
        currentUser={currentUserOptions}
        hasUnreadDiscussion={hasUnreadActiveDiscussion}
        isMobileMenuOpen={isMobileMenuOpen}
        onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
      />

      {/* 2. Main 3-Pane Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Backdrop Overlay for Left Drawer */}
        {isLeftSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 md:hidden transition-opacity"
            onClick={() => setIsLeftSidebarOpen(false)}
          />
        )}

        {/* Left Navigation Sidebar */}
        <LeftSidebar
          isOpen={isLeftSidebarOpen}
          onClose={() => setIsLeftSidebarOpen(false)}
          activeDocId={activeDocId}
          onSelectDoc={handleSelectDoc}
          onExportDoc={handleExportDoc}
          onShareFolder={handleShareFolder}
          onTreeMutation={handleTreeMutation}
          permissions={currentPermissions}
          treeManager={treeManager}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenJoinRoomModal={() => setIsJoinRoomModalOpen(true)}
          unreadDocIds={unreadDocIds}
          vaultName={session?.vaultName}
          treeVersion={treeVersion}
        />

        {/* Center Editor Canvas */}
        <EditorCanvas
          documentId={activeDocId}
          documentTitle={activeDocTitle}
          folderName={folderName}
          yDoc={yDoc}
          provider={provider}
          user={currentUserOptions}
          providerStatus={providerStatus}
          awarenessUsers={awarenessUsers}
          permissions={currentPermissions}
          guestPermissions={guestRoomPermissions}
          isOwner={currentPermissions.role === 'owner'}
          onUpdatePermissions={(perms) => handleUpdateLivePermissions(activeDocId, perms)}
          saveStatus={saveStatus}
          lastSavedTime={lastSavedTime}
          isDocHydrated={isDocHydrated}
          onAddInlineComment={handleAddInlineComment}
          onTitleChange={handleTitleChange}
          onCommentClick={handleCommentClickFromEditor}
          activeCommentThreadId={activeCommentThreadId}
          onOpenShareModal={handleOpenShareDocument}
          onOpenDiscussionSidebar={() => setIsRightSidebarOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onCreateNewNote={handleCreateNewNote}
        />

        {/* Mobile Backdrop Overlay for Right Drawer */}
        {isRightSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 md:hidden transition-opacity"
            onClick={() => setIsRightSidebarOpen(false)}
          />
        )}

        {/* Right Discussion & Chat Sidebar */}
        <RightDiscussionSidebar
          isOpen={isRightSidebarOpen}
          onClose={() => setIsRightSidebarOpen(false)}
          activeDocumentTitle={activeDocTitle}
          commentEngine={commentEngine}
          chatEngine={chatEngine}
          activeThreadId={activeCommentThreadId}
          onSelectThread={handleSelectThreadFromSidebar}
          onJumpToThread={(threadId) => {
            setActiveCommentThreadId(threadId);
          }}
          commentDraft={commentDraft}
          onClearCommentDraft={() => setCommentDraft(null)}
          currentAuthor={{
            id: session?.userProfile.userId || session?.userProfile.displayName || 'user_local',
            name: currentUserOptions.name,
            color: currentUserOptions.color,
            avatar: currentUserOptions.avatar
          }}
        />
      </div>

      {/* Mobile-First Native App Bottom Navigation Bar */}
      <MobileBottomNavBar
        isLeftSidebarOpen={isLeftSidebarOpen}
        isRightSidebarOpen={isRightSidebarOpen}
        onToggleLeftSidebar={() => setIsLeftSidebarOpen(prev => !prev)}
        onToggleRightSidebar={() => setIsRightSidebarOpen(prev => !prev)}
        onCreateNewNote={handleCreateNewNote}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        hasUnreadDiscussion={hasUnreadActiveDiscussion}
        activeDocCount={treeManager.getAllItems().filter(i => i.type === 'document' && !i.isTrash).length}
      />

      {/* MODAL: Chia Sẻ Quyền Cộng Tác Chuẩn Thương Mại (Document & Folder Multi-room Share) */}
      <ShareModal
        isOpen={shareModalConfig.isOpen}
        onClose={() => setShareModalConfig(prev => ({ ...prev, isOpen: false }))}
        documentId={shareModalConfig.targetId || activeDocId}
        documentTitle={shareModalConfig.targetTitle || activeDocTitle}
        targetType={shareModalConfig.targetType}
        folderManifest={shareModalConfig.folderManifest}
        documentKey={shareModalConfig.key || documentKey}
        awarenessUsers={awarenessUsers}
        currentUser={currentUserOptions}
        onUpdateLivePermissions={handleUpdateLivePermissions}
      />

      {/* MODAL: Tham Gia Phòng Bằng Mã Rút Gọn Hoặc Liên Kết (Join Room) */}
      <JoinRoomModal
        isOpen={isJoinRoomModalOpen}
        onClose={() => setIsJoinRoomModalOpen(false)}
        onJoinRoom={handleJoinRoom}
      />

      {/* MODAL: Xuất Dữ Liệu Đa Định Dạng (Markdown & Standalone HTML & .vault) */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        documentTitle={exportDocTitle || activeDocTitle}
        documentId={activeDocId}
        folderName={folderName}
        treeManager={treeManager}
        permissions={currentPermissions}
      />

      {/* Spotlight Command Palette (Cmd+K / Ctrl+K) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        engine={commandPaletteEngine}
      />

      {/* Vault Settings Center Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        session={session}
        theme={theme}
        onThemeChange={onThemeChange}
        onLockVault={onLockVault}
        storage={storage}
      />
    </div>
  );
};
