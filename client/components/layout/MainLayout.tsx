import React, { useState, useEffect } from 'react';
import { HeaderBar } from './HeaderBar';
import { LeftSidebar } from './LeftSidebar';
import { EditorCanvas } from './EditorCanvas';
import { RightDiscussionSidebar } from './RightDiscussionSidebar';
import { TreeStateManager } from '../../lib/tree/tree-state-manager';
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
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [activeDocId, setActiveDocId] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('room');
      if (roomParam) return roomParam;
      const savedDocId = localStorage.getItem('vaultsync_active_doc');
      if (savedDocId) return savedDocId;
    }
    return 'doc-quicknotes';
  });
  const [exportDocTitle, setExportDocTitle] = useState('Ghi Chú Nhanh & Việc Cần Làm');
  const [, setTreeVersion] = useState(0);

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

  // Document encryption key
  const [documentKey, setDocumentKey] = useState<CryptoKey | null>(session ? session.vaultRootKey : null);

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

  // Helper to extract or restore pending share information
  const getPendingShareInfo = React.useCallback(() => {
    if (typeof window === 'undefined') return null;
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    const titleParam = urlParams.get('title');
    const keyParam = urlParams.get('key');

    if (roomParam) {
      const shareData = {
        room: roomParam,
        title: titleParam ? decodeURIComponent(titleParam) : 'Tài Liệu Được Chia Sẻ',
        key: keyParam || null
      };
      sessionStorage.setItem('vaultsync_pending_share', JSON.stringify(shareData));
      return shareData;
    }

    const saved = sessionStorage.getItem('vaultsync_pending_share');
    if (saved) {
      try {
        return JSON.parse(saved) as { room: string; title: string; key: string | null };
      } catch {
        return null;
      }
    }
    return null;
  }, []);

  // Automatically register shared room document from URL if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const shareInfo = getPendingShareInfo();
      if (shareInfo) {
        if (shareInfo.key) {
          try {
            const rawKeyBytes = BinaryUtils.base64UrlToBytes(shareInfo.key);
            crypto.subtle.importKey(
              'raw',
              rawKeyBytes as BufferSource,
              { name: 'AES-GCM', length: 256 },
              true,
              ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
            ).then(importedKey => {
              setDocumentKey(importedKey);
            }).catch(err => {
              console.error('Lỗi nhập khóa mã hóa tài liệu từ URL:', err);
            });
          } catch (err) {
            console.error('Lỗi giải mã khóa chia sẻ từ URL:', err);
          }
        }

        treeManager.ensureItem(shareInfo.room, shareInfo.title, 'document', null, 'Share2');
        setActiveDocId(shareInfo.room);
        setTreeVersion(v => v + 1);
      }
    }
  }, [treeManager, getPendingShareInfo]);

  // Isolate and switch Y.Doc per active document to prevent cross-document text bleeding
  useEffect(() => {
    setIsDocHydrated(false);
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

  // Connect EncryptedYjsProvider whenever documentKey or activeDocId changes
  useEffect(() => {
    if (!documentKey) return;

    const wsUrl = getRelayWsUrl();
    const cleanRoomId = activeDocId.startsWith('doc-') ? activeDocId : `doc-${activeDocId}`;

    const newProvider = new EncryptedYjsProvider({
      serverUrl: wsUrl,
      roomId: cleanRoomId,
      yDoc,
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

  // Restore encrypted persistent data from IndexedDB on vault unlock
  useEffect(() => {
    if (!documentKey) return;
    const currentKey = documentKey;
    let isMounted = true;

    async function restoreOfflineVaultData() {
      try {
        const treeSnapshot = await storage.loadTreeSnapshot(currentKey);
        if (treeSnapshot && treeSnapshot.length > 0 && isMounted) {
          treeManager.applyStateUpdate(treeSnapshot);
        }

        // If there is a pending shared document, ensure it is added to tree and selected
        const pendingShare = getPendingShareInfo();
        if (pendingShare && isMounted) {
          treeManager.ensureItem(pendingShare.room, pendingShare.title, 'document', null, 'Share2');
          setActiveDocId(pendingShare.room);
          setTreeVersion(v => v + 1);
        } else {
          // Validate active document exists and is not deleted in trash
          const currentItem = treeManager.getItem(activeDocId);
          if (!currentItem || currentItem.isTrash) {
            const validDocs = treeManager.getAllItems().filter(i => i.type === 'document' && !i.isTrash);
            if (validDocs.length > 0 && validDocs[0] && isMounted) {
              setActiveDocId(validDocs[0].id);
              return;
            }
          }
        }

        const docState = await storage.loadDocumentState(activeDocId, currentKey);
        if (docState.snapshot && docState.snapshot.length > 0 && isMounted) {
          Y.applyUpdate(yDoc, docState.snapshot);
        }
        for (const update of docState.updates) {
          if (isMounted) Y.applyUpdate(yDoc, update);
        }
      } catch (err) {
        console.error('Lỗi khôi phục dữ liệu mã hóa cục bộ:', err);
      } finally {
        if (isMounted) {
          setIsDocHydrated(true);
        }
      }
    }

    restoreOfflineVaultData();
    return () => {
      isMounted = false;
    };
  }, [documentKey, activeDocId, storage, treeManager, yDoc]);

  // Auto-save Document Snapshot to Encrypted IndexedDB on change (Debounced 300ms)
  useEffect(() => {
    if (!documentKey || !isDocHydrated) return;
    const currentKey = documentKey;

    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    const performSave = async () => {
      try {
        const stateBytes = Y.encodeStateAsUpdate(yDoc);
        await storage.saveDocumentSnapshot(activeDocId, stateBytes, currentKey);
        setSaveStatus('saved');
        setLastSavedTime(Date.now());
      } catch (err) {
        console.error('Tự động lưu tài liệu thất bại:', err);
        setSaveStatus('error');
      }
    };

    const handleYDocUpdate = () => {
      setSaveStatus('saving');
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(performSave, 300);
    };

    // Save immediately before page unloads / reloads
    const handleBeforeUnload = () => {
      void performSave();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    yDoc.on('update', handleYDocUpdate);

    return () => {
      if (saveTimer) clearTimeout(saveTimer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      yDoc.off('update', handleYDocUpdate);
      void performSave();
    };
  }, [yDoc, activeDocId, documentKey, storage, isDocHydrated]);

  // Auto-save File Tree Snapshot to Encrypted IndexedDB on change (Debounced 500ms)
  useEffect(() => {
    if (!documentKey) return;
    const currentKey = documentKey;

    let saveTreeTimer: ReturnType<typeof setTimeout> | null = null;

    const handleTreeChange = () => {
      if (saveTreeTimer) clearTimeout(saveTreeTimer);
      saveTreeTimer = setTimeout(async () => {
        try {
          const treeBytes = treeManager.encodeState();
          await storage.saveTreeSnapshot(treeBytes, currentKey);
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
  }, [treeManager, documentKey, storage]);

  // Initialize cryptographic document key on mount if session is not already provided
  useEffect(() => {
    if (session) {
      setDocumentKey(session.vaultRootKey);
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
  }, [session]);

  useEffect(() => {
    const unobserve = treeManager.observe(() => {
      setTreeVersion(v => v + 1);
    });
    return () => unobserve();
  }, [treeManager]);

  // Listen for real-time document title changes from Y.Doc metadata (E2EE Collaborative Title Sync)
  useEffect(() => {
    const metaMap = yDoc.getMap('metadata');
    const handleMetaChange = () => {
      const syncedTitle = metaMap.get('title') as string | undefined;
      if (syncedTitle && syncedTitle.trim() && activeDocId) {
        const currentItem = treeManager.getItem(activeDocId);
        if (currentItem && currentItem.name !== syncedTitle) {
          treeManager.renameItem(activeDocId, syncedTitle);
          setTreeVersion(v => v + 1);
        }
      }
    };
    metaMap.observe(handleMetaChange);
    const initialTitle = metaMap.get('title') as string | undefined;
    if (initialTitle && initialTitle.trim() && activeDocId) {
      const currentItem = treeManager.getItem(activeDocId);
      if (currentItem && currentItem.name !== initialTitle) {
        treeManager.renameItem(activeDocId, initialTitle);
        setTreeVersion(v => v + 1);
      }
    }
    return () => metaMap.unobserve(handleMetaChange);
  }, [yDoc, activeDocId, treeManager]);

  const activeItem = treeManager.getItem(activeDocId);
  const activeDocTitle = activeItem?.name || 'Chào mừng đến với VaultSync';
  const parentFolder = activeItem?.parentId ? treeManager.getItem(activeItem.parentId) : null;
  const folderName = parentFolder?.name || 'Kho Lưu Trữ';

  // Modals state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Command Palette Engine instance
  const [commandPaletteEngine] = useState(() => new CommandPaletteEngine([], (state) => {
    setIsCommandPaletteOpen(state.isOpen);
  }));

  const handleExportDoc = (docId: string, docTitle: string) => {
    setActiveDocId(docId);
    setExportDocTitle(docTitle);
    setIsExportModalOpen(true);
  };

  const handleJoinRoom = (roomId: string, title?: string, key?: CryptoKey) => {
    if (key) {
      setDocumentKey(key);
    }
    const cleanTitle = title || 'Tài Liệu Cộng Tác';
    treeManager.ensureItem(roomId, cleanTitle, 'document', null, 'Share2');
    setActiveDocId(roomId);
    setTreeVersion(v => v + 1);
  };

  const handleTitleChange = (newTitle: string) => {
    if (activeDocId) {
      treeManager.renameItem(activeDocId, newTitle);
      const metaMap = yDoc.getMap('metadata');
      if (metaMap.get('title') !== newTitle) {
        metaMap.set('title', newTitle);
      }
      setTreeVersion(v => v + 1);
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
        title: 'Chia sẻ quyền truy cập tài liệu',
        subtitle: 'Mã hóa an toàn cho thành viên mới',
        category: 'Security',
        keywords: ['share', 'chia se', 'quyen', 'member'],
        handler: () => setIsShareModalOpen(true)
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
      },
      {
        id: 'export-vault',
        title: 'Sao lưu nhị phân mã hóa (.vault)',
        subtitle: 'Bảo toàn toàn bộ cây thư mục & khóa mã hóa',
        category: 'Export',
        keywords: ['export', 'xuat', 'vault', 'backup', 'sao luu'],
        handler: () => {
          setExportDocTitle(activeDocTitle);
          setIsExportModalOpen(true);
        }
      }
    ];

    // Dynamic document navigation items
    const docActions: PaletteAction[] = allDocs.map(doc => ({
      id: `doc-${doc.id}`,
      title: doc.name,
      subtitle: `Tài liệu trong ${folderName}`,
      category: 'Navigation',
      keywords: ['chuyen', 'mo', 'open', 'doc', doc.name.toLowerCase()],
      handler: () => setActiveDocId(doc.id)
    }));

    commandPaletteEngine.setActions([...baseActions, ...docActions]);
  }, [treeManager, activeDocId, activeDocTitle, folderName, commandPaletteEngine, onThemeChange, onLockVault]);

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
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenExportModal={() => {
          setExportDocTitle(activeDocTitle);
          setIsExportModalOpen(true);
        }}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onLockVault={onLockVault}
        providerStatus={providerStatus}
        awarenessUsers={awarenessUsers}
        currentUser={currentUserOptions}
      />

      {/* 2. Main 3-Pane Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Navigation Sidebar */}
        <LeftSidebar
          isOpen={isLeftSidebarOpen}
          activeDocId={activeDocId}
          onSelectDoc={(id) => setActiveDocId(id)}
          onExportDoc={handleExportDoc}
          treeManager={treeManager}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenJoinRoomModal={() => setIsJoinRoomModalOpen(true)}
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
          saveStatus={saveStatus}
          lastSavedTime={lastSavedTime}
          isDocHydrated={isDocHydrated}
          onAddInlineComment={() => setIsRightSidebarOpen(true)}
          onTitleChange={handleTitleChange}
          onCommentClick={handleCommentClickFromEditor}
          activeCommentThreadId={activeCommentThreadId}
        />

        {/* Right Discussion & Chat Sidebar */}
        <RightDiscussionSidebar
          isOpen={isRightSidebarOpen}
          onClose={() => setIsRightSidebarOpen(false)}
          activeDocumentTitle={activeDocTitle}
          commentEngine={commentEngine}
          chatEngine={chatEngine}
          activeThreadId={activeCommentThreadId}
          onSelectThread={handleSelectThreadFromSidebar}
          currentAuthor={{
            id: session?.userProfile.userId || session?.userProfile.displayName || 'user_local',
            name: currentUserOptions.name,
            color: currentUserOptions.color,
            avatar: currentUserOptions.avatar
          }}
        />
      </div>

      {/* MODAL: Chia Sẻ Quyền Cộng Tác Chuẩn Thương Mại (1-Click Invite & Password Gate) */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        documentId={activeDocId}
        documentTitle={activeDocTitle}
        documentKey={documentKey}
        awarenessUsers={awarenessUsers}
        currentUser={currentUserOptions}
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
