import React, { useState, useEffect } from 'react';
import { HeaderBar } from './HeaderBar';
import { LeftSidebar } from './LeftSidebar';
import { EditorCanvas } from './EditorCanvas';
import { RightDiscussionSidebar } from './RightDiscussionSidebar';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CryptoPlaygroundModal } from '../crypto/CryptoPlaygroundModal';
import { TreeStateManager } from '../../lib/tree/tree-state-manager';
import { InlineCommentAnchorEngine } from '../../lib/yjs/inline-comment-engine';
import { RoomChatEngine } from '../../lib/yjs/room-chat-engine';
import * as Y from 'yjs';
import { AppTheme } from '../../App';
import {
  Download,
  ShieldCheck,
  Copy,
  Check,
  FileText,
  Code,
  Lock
} from 'lucide-react';

import { DualPaneGuestSandbox } from '../sandbox/DualPaneGuestSandbox';
import { IdentityKeys, ECDHKeyPair } from '../../lib/crypto/identity-keys';
import { EnvelopeEncryptionManager, WrappedKeyEnvelope } from '../../lib/crypto/envelope-encryption';

export interface MainLayoutProps {
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  theme,
  onThemeChange
}) => {
  const [treeManager] = useState(() => new TreeStateManager());
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [activeDocId, setActiveDocId] = useState('doc-welcome');
  const [exportDocTitle, setExportDocTitle] = useState('Chào mừng đến VaultSync');
  const [, setTreeVersion] = useState(0);

  // Yjs Collaboration & Discussion Engines
  const [yDoc] = useState(() => new Y.Doc());
  const [commentEngine] = useState(() => new InlineCommentAnchorEngine(yDoc));
  const [chatEngine] = useState(() => new RoomChatEngine(yDoc));
  const [activeCommentThreadId, setActiveCommentThreadId] = useState<string | null>(null);

  // Asymmetric Cryptographic Identity State (ECDH P-256)
  const [userECDHKeyPair, setUserECDHKeyPair] = useState<ECDHKeyPair | null>(null);
  const [userPublicKeySPKI, setUserPublicKeySPKI] = useState<string>('');
  const [documentKey, setDocumentKey] = useState<CryptoKey | null>(null);
  const [generatedEnvelope, setGeneratedEnvelope] = useState<WrappedKeyEnvelope | null>(null);
  const [wrapError, setWrapError] = useState<string | null>(null);
  const [copiedEnvelope, setCopiedEnvelope] = useState(false);

  // Initialize cryptographic keys on mount
  useEffect(() => {
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
  }, []);

  // Seed sample contextual comments & chat if empty
  useEffect(() => {
    const commentsMap = yDoc.getMap('vaultsync-inline-threads');
    if (commentsMap.size === 0) {
      const yText = yDoc.getText('content');
      if (yText.length === 0) {
        yText.insert(0, 'VaultSync là không gian làm việc cộng tác thời gian thực chuẩn doanh nghiệp, được bảo vệ bởi kiến trúc Mã hóa Đầu-Cuối (End-to-End Encryption / Zero-Knowledge) kết hợp cấu trúc dữ liệu phân tán CRDTs (Yjs).');
      }

      // Create initial sample threads
      const phrase1 = 'Mã hóa Đầu-Cuối (End-to-End Encryption / Zero-Knowledge)';
      const idx1 = yText.toString().indexOf(phrase1);
      if (idx1 >= 0) {
        const t1 = commentEngine.createThread({
          yType: yText,
          from: idx1,
          to: idx1 + phrase1.length,
          quotedText: phrase1,
          authorId: 'user_alice',
          authorName: 'Alice (Trưởng Nhóm)',
          content: 'Đã hoàn thiện module AES-256-GCM với AAD binding để chống tấn công hoán đổi bản mã.'
        });

        commentEngine.addReply(t1.id, {
          authorId: 'user_bob',
          authorName: 'Bob (Reviewer)',
          content: 'Tuyệt vời! Cần lưu ý thêm kiểm tra tính kết hợp assoc: 0 cho start anchor nhé.'
        });
      }
    }

    const chatArr = yDoc.getArray('vaultsync-room-chat');
    if (chatArr.length === 0) {
      chatEngine.sendMessage({
        authorId: 'user_alice',
        authorName: 'Alice',
        authorColor: '#2563eb',
        content: 'Chào cả phòng! Mọi người kiểm tra nhánh develop nhé.'
      });
      chatEngine.sendMessage({
        authorId: 'user_bob',
        authorName: 'Bob',
        authorColor: '#059669',
        content: 'Đã nhận! Đang chạy test runner kiểm tra tính năng live cursor và comment highlight.'
      });
    }
  }, [yDoc, commentEngine, chatEngine]);

  useEffect(() => {
    const unobserve = treeManager.observe(() => {
      setTreeVersion(v => v + 1);
    });
    return () => unobserve();
  }, [treeManager]);

  const activeItem = treeManager.getItem(activeDocId);
  const activeDocTitle = activeItem?.name || 'Chào mừng đến VaultSync';
  const parentFolder = activeItem?.parentId ? treeManager.getItem(activeItem.parentId) : null;
  const folderName = parentFolder?.name || 'Engineering Vault';

  // Modals state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSandboxModalOpen, setIsSandboxModalOpen] = useState(false);
  const [isCryptoModalOpen, setIsCryptoModalOpen] = useState(false);
  const [recipientKeyInput, setRecipientKeyInput] = useState('');
  const [recipientIdInput, setRecipientIdInput] = useState('user_bob_peer');
  const [copiedKey, setCopiedKey] = useState(false);

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
        onOpenSandboxModal={() => setIsSandboxModalOpen(true)}
        onOpenCryptoModal={() => setIsCryptoModalOpen(true)}
        activeCollaboratorCount={2}
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
        />

        {/* Center Editor Canvas */}
        <EditorCanvas
          documentId={activeDocId}
          documentTitle={activeDocTitle}
          folderName={folderName}
          yDoc={yDoc}
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

      {/* MODAL: WebCrypto Playground & Benchmark Center */}
      <CryptoPlaygroundModal
        isOpen={isCryptoModalOpen}
        onClose={() => setIsCryptoModalOpen(false)}
      />

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

      {/* MODAL: Xuất Dữ Liệu Đa Định Dạng */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title={`Xuất Dữ Liệu: ${exportDocTitle}`}
        description="Xuất nội dung đã giải mã hoặc tạo bản sao lưu mã hóa nhị phân an toàn."
        footer={
          <Button variant="ghost" size="sm" onClick={() => setIsExportModalOpen(false)}>Đóng</Button>
        }
      >
        <div className="grid grid-cols-1 gap-2.5">
          <button
            onClick={() => setIsExportModalOpen(false)}
            className="flex items-center justify-between p-3 rounded-lg bg-theme-card hover:bg-theme-card-hover border border-theme-border transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-theme-accent" />
              <div>
                <div className="font-medium text-theme-text text-xs">Xuất Markdown (.md)</div>
                <div className="text-[11px] text-theme-text-muted">Kèm siêu dữ liệu YAML frontmatter</div>
              </div>
            </div>
            <Download className="w-4 h-4 text-theme-text-muted" />
          </button>

          <button
            onClick={() => setIsExportModalOpen(false)}
            className="flex items-center justify-between p-3 rounded-lg bg-theme-card hover:bg-theme-card-hover border border-theme-border transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Code className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <div className="font-medium text-theme-text text-xs">Xuất Trang HTML Độc Lập (.html)</div>
                <div className="text-[11px] text-theme-text-muted">Tích hợp sẵn CSS để xem offline ở bất kỳ đâu</div>
              </div>
            </div>
            <Download className="w-4 h-4 text-theme-text-muted" />
          </button>

          <button
            onClick={() => setIsExportModalOpen(false)}
            className="flex items-center justify-between p-3 rounded-lg bg-theme-card hover:bg-theme-card-hover border border-theme-border transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-indigo-500" />
              <div>
                <div className="font-medium text-theme-text text-xs">Bản Sao Lưu Mã Hóa (.vault)</div>
                <div className="text-[11px] text-theme-text-muted">Bản nhị phân nguyên vẹn có chữ ký HMAC-SHA256</div>
              </div>
            </div>
            <Download className="w-4 h-4 text-theme-text-muted" />
          </button>
        </div>
      </Modal>

      {/* Dual-Pane Guest Sandbox */}
      <DualPaneGuestSandbox
        isOpen={isSandboxModalOpen}
        onClose={() => setIsSandboxModalOpen(false)}
      />
    </div>
  );
};
