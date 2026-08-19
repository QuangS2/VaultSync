import React, { useState, useEffect } from 'react';
import { HeaderBar } from './HeaderBar';
import { LeftSidebar } from './LeftSidebar';
import { EditorCanvas } from './EditorCanvas';
import { RightDiscussionSidebar } from './RightDiscussionSidebar';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { TreeStateManager } from '../../lib/tree/tree-state-manager';
import { InlineCommentAnchorEngine } from '../../lib/yjs/inline-comment-engine';
import { RoomChatEngine } from '../../lib/yjs/room-chat-engine';
import * as Y from 'yjs';
import { AppTheme } from '../../App';
import {
  ShieldCheck,
  Copy,
  Check
} from 'lucide-react';

import { CommandPaletteModal } from '../palette/CommandPaletteModal';
import { ExportModal } from '../export/ExportModal';
import { CommandPaletteEngine, PaletteAction } from '../../lib/palette/command-palette-engine';
import { IdentityKeys, ECDHKeyPair } from '../../lib/crypto/identity-keys';
import { EnvelopeEncryptionManager, WrappedKeyEnvelope } from '../../lib/crypto/envelope-encryption';
import { UnlockedVaultSession } from '../../lib/auth/types';
import { EncryptedYjsProvider } from '../../lib/yjs/encrypted-yjs-provider';
import { ProviderConnectionStatus, AwarenessUser, CollaborationUserOptions } from '../../lib/yjs/types';
import { EncryptedIndexedDBStorage } from '../../lib/storage/encrypted-indexeddb-storage';

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
  const [activeDocId, setActiveDocId] = useState('doc-welcome');
  const [exportDocTitle, setExportDocTitle] = useState('Chào mừng đến VaultSync');
  const [, setTreeVersion] = useState(0);

  // Zero-Knowledge Offline-First Persistent Storage
  const [storage] = useState(() => new EncryptedIndexedDBStorage());
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<number>(Date.now());

  // Yjs Collaboration & Discussion Engines
  const [yDoc] = useState(() => new Y.Doc());
  const [commentEngine] = useState(() => new InlineCommentAnchorEngine(yDoc));
  const [chatEngine] = useState(() => new RoomChatEngine(yDoc));
  const [activeCommentThreadId, setActiveCommentThreadId] = useState<string | null>(null);

  // Asymmetric Cryptographic Identity State (ECDH P-256)
  const [userECDHKeyPair, setUserECDHKeyPair] = useState<ECDHKeyPair | null>(session ? session.userECDHKeyPair : null);
  const [userPublicKeySPKI, setUserPublicKeySPKI] = useState<string>(session ? session.userPublicKeySPKI : '');
  const [documentKey, setDocumentKey] = useState<CryptoKey | null>(session ? session.vaultRootKey : null);
  const [generatedEnvelope, setGeneratedEnvelope] = useState<WrappedKeyEnvelope | null>(null);
  const [wrapError, setWrapError] = useState<string | null>(null);
  const [copiedEnvelope, setCopiedEnvelope] = useState(false);

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

  const currentUserOptions: CollaborationUserOptions = React.useMemo(() => {
    if (session) {
      return {
        name: session.userProfile.displayName,
        color: session.userProfile.avatarColor,
        avatar: session.userProfile.displayName.charAt(0).toUpperCase()
      };
    }
    return {
      name: 'Bạn (Cục bộ)',
      color: '#2563eb',
      avatar: 'B'
    };
  }, [session]);

  // Connect EncryptedYjsProvider whenever documentKey or activeDocId changes
  useEffect(() => {
    if (!documentKey) return;

    const wsUrl = getRelayWsUrl();
    const newProvider = new EncryptedYjsProvider({
      serverUrl: wsUrl,
      roomId: `doc-${activeDocId}`,
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

        const docState = await storage.loadDocumentState(activeDocId, currentKey);
        if (docState.snapshot && docState.snapshot.length > 0 && isMounted) {
          Y.applyUpdate(yDoc, docState.snapshot);
        }
        for (const update of docState.updates) {
          if (isMounted) Y.applyUpdate(yDoc, update);
        }
      } catch (err) {
        console.error('Lỗi khôi phục dữ liệu mã hóa cục bộ:', err);
      }
    }

    restoreOfflineVaultData();
    return () => {
      isMounted = false;
    };
  }, [documentKey, activeDocId, storage, treeManager, yDoc]);

  // Auto-save Document Snapshot to Encrypted IndexedDB on change (Debounced 300ms)
  useEffect(() => {
    if (!documentKey) return;
    const currentKey = documentKey;

    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    const handleYDocUpdate = () => {
      setSaveStatus('saving');
      if (saveTimer) clearTimeout(saveTimer);

      saveTimer = setTimeout(async () => {
        try {
          const stateBytes = Y.encodeStateAsUpdate(yDoc);
          await storage.saveDocumentSnapshot(activeDocId, stateBytes, currentKey);
          setSaveStatus('saved');
          setLastSavedTime(Date.now());
        } catch (err) {
          console.error('Tự động lưu tài liệu thất bại:', err);
          setSaveStatus('error');
        }
      }, 300);
    };

    yDoc.on('update', handleYDocUpdate);
    return () => {
      if (saveTimer) clearTimeout(saveTimer);
      yDoc.off('update', handleYDocUpdate);
    };
  }, [yDoc, activeDocId, documentKey, storage]);

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

  // Initialize cryptographic keys on mount if session is not already provided
  useEffect(() => {
    if (session) {
      setUserECDHKeyPair(session.userECDHKeyPair);
      setUserPublicKeySPKI(session.userPublicKeySPKI);
      setDocumentKey(session.vaultRootKey);
      return;
    }

    async function initCrypto() {
      try {
        const keyPair = await IdentityKeys.generateECDHKeyPair();
        setUserECDHKeyPair(keyPair);
        const spki = await IdentityKeys.exportPublicKeySPKI(keyPair.publicKey);
        setUserPublicKeySPKI(spki);

        const dek = await EnvelopeEncryptionManager.generateDocumentKey();
        setDocumentKey(dek);
      } catch (err) {
        console.error('Failed to initialize ECDH keys:', err);
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

  const activeItem = treeManager.getItem(activeDocId);
  const activeDocTitle = activeItem?.name || 'Chào mừng đến với VaultSync';
  const parentFolder = activeItem?.parentId ? treeManager.getItem(activeItem.parentId) : null;
  const folderName = parentFolder?.name || 'Kho Lưu Trữ';

  // Modals state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [recipientKeyInput, setRecipientKeyInput] = useState('');
  const [recipientIdInput, setRecipientIdInput] = useState('user_bob_peer');
  const [copiedKey, setCopiedKey] = useState(false);

  // Command Palette Engine instance
  const [commandPaletteEngine] = useState(() => new CommandPaletteEngine([], (state) => {
    setIsCommandPaletteOpen(state.isOpen);
  }));

  const handleExportDoc = (docId: string, docTitle: string) => {
    setActiveDocId(docId);
    setExportDocTitle(docTitle);
    setIsExportModalOpen(true);
  };

  const handleTitleChange = (newTitle: string) => {
    if (activeDocId) {
      treeManager.renameItem(activeDocId, newTitle);
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

  const copyPublicKey = () => {
    if (userPublicKeySPKI) {
      navigator.clipboard?.writeText(userPublicKeySPKI);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const copyEnvelope = () => {
    if (generatedEnvelope) {
      navigator.clipboard?.writeText(JSON.stringify(generatedEnvelope, null, 2));
      setCopiedEnvelope(true);
      setTimeout(() => setCopiedEnvelope(false), 2000);
    }
  };

  const handleWrapKeyForRecipient = async () => {
    if (!userECDHKeyPair || !documentKey || !recipientKeyInput.trim()) {
      setWrapError('Vui lòng nhập đầy đủ Khóa công khai của thành viên nhận.');
      return;
    }

    try {
      setWrapError(null);
      const envelope = await EnvelopeEncryptionManager.wrapDocumentKey({
        documentKey: documentKey,
        documentId: activeDocId,
        epoch: 1,
        senderPrivateKey: userECDHKeyPair.privateKey,
        senderPublicKey: userPublicKeySPKI,
        recipientPublicKey: recipientKeyInput.trim(),
        recipientUserId: recipientIdInput.trim() || 'user_peer'
      });
      setGeneratedEnvelope(envelope);
    } catch (err: any) {
      setWrapError(`Lỗi bọc khóa: ${err.message || 'Khóa công khai không đúng định dạng SPKI Base64'}`);
    }
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
        />
      </div>

      {/* MODAL: Chia Sẻ Khóa Tài Liệu (E2EE Envelope Sharing) */}
      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Chia Sẻ Tài Liệu An Toàn (E2EE Key Exchange)"
        description="Mã hóa Khóa Tài liệu (DEK) bằng Khóa Công khai (ECDH P-256) của người nhận."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsShareModalOpen(false)}>Đóng</Button>
            <Button 
              variant="primary" 
              size="sm" 
              onClick={handleWrapKeyForRecipient}
              disabled={!recipientKeyInput.trim()}
            >
              Bọc & Tạo Phong Bì Khóa (Wrap DEK)
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-medium text-theme-text text-xs">Khóa Công Khai Của Bạn (ECDH P-256 SPKI Base64):</label>
            <div className="flex items-center gap-2">
              <Input 
                value={userPublicKeySPKI || 'Đang khởi tạo khóa...'} 
                readOnly 
                className="font-mono text-[10px]" 
              />
              <Button variant="secondary" size="icon" onClick={copyPublicKey} title="Sao chép khóa công khai">
                {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-theme-text text-xs">Mã Định Danh Người Nhận (Recipient ID):</label>
              <Input
                placeholder="Ví dụ: user_bob"
                value={recipientIdInput}
                onChange={(e) => setRecipientIdInput(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-theme-text text-xs">Kỷ Nguyên Khóa (Epoch):</label>
              <Input
                value="Epoch 1 (Khóa Hiện Tại)"
                readOnly
                className="text-xs font-mono text-theme-text-muted"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-medium text-theme-text text-xs">Nhập Khóa Công Khai Của Thành Viên Mới (SPKI Base64):</label>
            <Input
              placeholder="Dán mã khóa công khai SPKI Base64..."
              value={recipientKeyInput}
              onChange={(e) => setRecipientKeyInput(e.target.value)}
              className="font-mono text-[10px]"
            />
          </div>

          {wrapError && (
            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
              {wrapError}
            </div>
          )}

          {generatedEnvelope && (
            <div className="flex flex-col gap-2 p-3 rounded-lg bg-theme-bg border border-theme-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Đã Tạo Phong Bì Khóa (WrappedKeyEnvelope)
                </span>
                <Button variant="secondary" size="sm" onClick={copyEnvelope} className="h-6 text-[10px] gap-1">
                  {copiedEnvelope ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedEnvelope ? 'Đã chép' : 'Sao chép JSON'}</span>
                </Button>
              </div>
              <pre className="text-[10px] font-mono bg-theme-bg-subtle p-2 rounded max-h-28 overflow-y-auto text-theme-text">
                {JSON.stringify(generatedEnvelope, null, 2)}
              </pre>
            </div>
          )}

          <div className="bg-theme-card p-3 rounded-lg border border-theme-border flex items-start gap-2.5 text-[11px] text-theme-text-muted">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>Server chỉ lưu trữ bản mã của khóa (Wrapped Key Envelope). Không ai có thể giải mã ngoại trừ người giữ Private Key tương ứng.</span>
          </div>
        </div>
      </Modal>

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
    </div>
  );
};
