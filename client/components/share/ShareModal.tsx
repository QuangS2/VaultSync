import React, { useState, useEffect } from 'react';
import {
  Share2,
  Lock,
  Copy,
  Check,
  X,
  Users,
  ShieldCheck,
  Link,
  Send,
  AlertTriangle,
  CheckCircle2,
  QrCode,
  Key
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { AwarenessUser } from '../../lib/yjs/types';
import { VaultAuthEngine } from '../../lib/auth/vault-auth-engine';

import { BinaryUtils } from '../../lib/crypto/binary-utils';
import { SimpleQRCode } from '../../lib/share/qr-code-generator';

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
  targetType?: 'document' | 'folder' | undefined;
  folderManifest?: { folder: any; items: any[] } | null | undefined;
  documentKey?: CryptoKey | null | undefined;
  awarenessUsers?: AwarenessUser[] | undefined;
  currentUser?: AwarenessUser | undefined;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  targetType = 'document',
  folderManifest,
  documentKey,
  awarenessUsers = [],
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'link' | 'qr' | 'peers' | 'code'>('link');

  // Password Authorization State
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Link & Share State
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPasscode, setCopiedPasscode] = useState(false);
  const [invitedUsers, setInvitedUsers] = useState<Record<string, boolean>>({});

  // Exported Key State
  const [exportedKeyB64, setExportedKeyB64] = useState<string>('');
  const [showRawKey, setShowRawKey] = useState(false);

  const isFolder = targetType === 'folder';
  const manifestB64 = isFolder && folderManifest
    ? BinaryUtils.bufferToBase64Url(new TextEncoder().encode(JSON.stringify(folderManifest)))
    : '';

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:5173';
  const shareLink = isFolder
    ? `${originUrl}/?folder=${encodeURIComponent(documentId)}&title=${encodeURIComponent(documentTitle)}${exportedKeyB64 ? `&key=${exportedKeyB64}` : ''}${manifestB64 ? `&manifest=${manifestB64}` : ''}`
    : `${originUrl}/?room=${encodeURIComponent(documentId)}&title=${encodeURIComponent(documentTitle)}${exportedKeyB64 ? `&key=${exportedKeyB64}` : ''}`;
  const roomCode = isFolder
    ? `VS-DIR-${documentId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || 'DIR999'}`
    : `VS-${documentId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || '789214'}`;
  const securePasscode = isFolder
    ? `VS-DIR:${documentId}#${exportedKeyB64}${manifestB64 ? `#${manifestB64}` : ''}`
    : `VS-KEY:${documentId}#${exportedKeyB64}`;

  // Export document key when modal opens
  useEffect(() => {
    if (documentKey) {
      crypto.subtle.exportKey('raw', documentKey)
        .then(raw => {
          const b64 = BinaryUtils.bufferToBase64Url(new Uint8Array(raw));
          setExportedKeyB64(b64);
        })
        .catch(err => console.error('Lỗi xuất khóa chia sẻ:', err));
    }
  }, [documentKey, isOpen]);

  // Reset states when opened
  useEffect(() => {
    if (isOpen) {
      setPasswordInput('');
      setAuthError(null);
      setCopiedLink(false);
      setCopiedCode(false);
      setShowRawKey(false);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!passwordInput) {
      setAuthError('Vui lòng nhập mật khẩu chủ để cấp quyền chia sẻ.');
      return;
    }

    setIsVerifying(true);
    try {
      const record = await VaultAuthEngine.getSavedVaultRecord();
      if (!record) {
        setAuthError('Không tìm thấy thông tin kho lưu trữ.');
        return;
      }

      await VaultAuthEngine.unlockVaultWithPassword(record, passwordInput);
      setIsAuthorized(true);
      setPasswordInput('');
    } catch {
      setAuthError('Mật khẩu chủ không chính xác. Không thể mở khóa quyền chia sẻ.');
    } finally {
      setIsVerifying(false);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleInvitePeer = (userName: string) => {
    setInvitedUsers(prev => ({ ...prev, [userName]: true }));
  };

  const otherPeers = awarenessUsers.filter(u => !currentUser || u.name !== currentUser.name);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-theme-bg rounded-2xl border border-theme-border shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-theme-border flex items-center justify-between bg-theme-card">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-theme-accent text-white flex items-center justify-center shadow-xs">
              <Share2 className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <h3 className="font-semibold text-sm sm:text-base text-theme-text flex items-center gap-2">
                <span>{isFolder ? 'Chia Sẻ Thư Mục & Đa Phòng' : 'Chia Sẻ Quyền Cộng Tác'}</span>
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {isFolder ? 'E2EE Multi-Room' : 'Mã Hóa Đầu-Cuối'}
                </span>
              </h3>
              <span className="text-xs text-theme-text-muted truncate max-w-xs sm:max-w-sm">
                {isFolder ? 'Thư mục: ' : 'Tài liệu: '}<strong className="text-theme-text">{documentTitle}</strong>
                {isFolder && folderManifest?.items && (
                  <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono">
                    {folderManifest.items.length} tệp con
                  </span>
                )}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-theme-text-muted hover:text-theme-text hover:bg-theme-bg-subtle transition-colors cursor-pointer"
            title="Đóng (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 flex flex-col gap-4">
          {!isAuthorized ? (
            /* Password Verification Guard before sharing */
            <form onSubmit={handleAuthorize} className="flex flex-col gap-3.5 p-4 rounded-xl bg-theme-card border border-theme-border">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-theme-text">Xác Minh Mật Khẩu Chủ Trước Khi Chia Sẻ</span>
                  <span className="text-[11px] text-theme-text-muted mt-0.5 leading-relaxed">
                    Để ngăn chặn người khác tự ý copy khóa hoặc chia sẻ tài liệu khi bạn rời máy tính (AFK), vui lòng nhập mật khẩu chủ để cấp quyền.
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Input
                  type="password"
                  placeholder="Nhập mật khẩu chủ của bạn..."
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  autoFocus
                  className="text-xs"
                />
              </div>

              {authError && (
                <div className="p-2 rounded-md bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" type="button" onClick={onClose}>
                  Hủy Bỏ
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={!passwordInput || isVerifying}>
                  {isVerifying ? 'Đang xác minh...' : 'Cấp Quyền & Mở Chia Sẻ'}
                </Button>
              </div>
            </form>
          ) : (
            /* Authorized Share Options */
            <div className="flex flex-col gap-4">
              {/* Tab Selector */}
              <div className="flex items-center p-1 bg-theme-card rounded-lg border border-theme-border text-xs gap-1">
                <button
                  onClick={() => setActiveTab('link')}
                  className={`flex-1 py-1.5 rounded-md font-medium transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                    activeTab === 'link'
                      ? 'bg-theme-bg text-theme-accent shadow-xs border border-theme-border'
                      : 'text-theme-text-muted hover:text-theme-text'
                  }`}
                >
                  <Link className="w-3.5 h-3.5" />
                  <span>Link 1 Chạm</span>
                </button>

                <button
                  onClick={() => setActiveTab('qr')}
                  className={`flex-1 py-1.5 rounded-md font-medium transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                    activeTab === 'qr'
                      ? 'bg-theme-bg text-theme-accent shadow-xs border border-theme-border'
                      : 'text-theme-text-muted hover:text-theme-text'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Mã QR</span>
                </button>

                <button
                  onClick={() => setActiveTab('code')}
                  className={`flex-1 py-1.5 rounded-md font-medium transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                    activeTab === 'code'
                      ? 'bg-theme-bg text-theme-accent shadow-xs border border-theme-border'
                      : 'text-theme-text-muted hover:text-theme-text'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Mã Ghép Nối</span>
                </button>

                <button
                  onClick={() => setActiveTab('peers')}
                  className={`flex-1 py-1.5 rounded-md font-medium transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                    activeTab === 'peers'
                      ? 'bg-theme-bg text-theme-accent shadow-xs border border-theme-border'
                      : 'text-theme-text-muted hover:text-theme-text'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Trực Tuyến ({otherPeers.length})</span>
                </button>
              </div>

              {/* Tab 1: One-Click Share Link */}
              {activeTab === 'link' && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-theme-text">Liên Kết Mời Cộng Tác Tự Động (Tự Nạp Khóa):</label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={shareLink}
                        readOnly
                        className="text-xs font-mono text-theme-text select-all"
                      />
                      <Button variant="primary" size="sm" onClick={copyShareLink} className="gap-1.5 shrink-0">
                        {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Đã sao chép' : 'Sao chép Link'}</span>
                      </Button>
                    </div>
                    <span className="text-[11px] text-theme-text-muted leading-relaxed">
                      💡 Người nhận chỉ cần mở liên kết này trên trình duyệt điện thoại/PC để tự động tham gia soạn thảo chung thời gian thực mà không cần copy khóa thủ công.
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-theme-card border border-theme-border flex items-start gap-2.5 text-xs text-theme-text-muted">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>Mọi dữ liệu trao đổi được tự động mã hóa bằng thuật toán AES-256-GCM. Máy chủ trung gian hoàn toàn không thể đọc trộm nội dung.</span>
                  </div>
                </div>
              )}

              {/* Tab 2: Visual QR Code */}
              {activeTab === 'qr' && (
                <div className="flex flex-col items-center gap-3 p-3 rounded-xl bg-theme-card border border-theme-border text-center">
                  <span className="text-xs font-semibold text-theme-text">
                    Quét Mã Bằng Camera Điện Thoại Để Tham Gia Ngay
                  </span>
                  
                  {/* Render QR SVG */}
                  <div
                    className="p-3 bg-white rounded-2xl shadow-md border border-theme-border"
                    dangerouslySetInnerHTML={{
                      __html: SimpleQRCode.toSVG(shareLink, 200, '#0f172a', '#ffffff')
                    }}
                  />

                  <div className="flex items-center gap-2 mt-1">
                    <Button variant="primary" size="sm" onClick={copyShareLink} className="gap-1.5 text-xs">
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Đã sao chép Link' : 'Sao chép Link QR'}</span>
                    </Button>
                  </div>
                  <span className="text-[11px] text-theme-text-muted leading-relaxed max-w-sm">
                    📱 Mở ứng dụng Camera hoặc Zalo trên điện thoại quét mã này để mở phiên làm việc chung tức thì.
                  </span>
                </div>
              )}

              {/* Tab 3: Passcode & Room Code */}
              {activeTab === 'code' && (
                <div className="flex flex-col gap-3">
                  {/* Complete Self-Contained Passcode with Key */}
                  <div className="p-3.5 rounded-xl bg-theme-card border border-theme-border flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-theme-text flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Mã Ghép Nối Toàn Diện (Kèm Khóa E2EE):</span>
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-mono">
                        Khuyên dùng
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        value={securePasscode}
                        readOnly
                        className="text-[11px] font-mono text-theme-text select-all"
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(securePasscode);
                          setCopiedPasscode(true);
                          setTimeout(() => setCopiedPasscode(false), 2500);
                        }}
                        className="gap-1.5 shrink-0"
                      >
                        {copiedPasscode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedPasscode ? 'Đã chép' : 'Chép Mã'}</span>
                      </Button>
                    </div>
                    <span className="text-[10px] text-theme-text-muted">
                      💡 Mã ghép nối này đã tích hợp sẵn ID phòng và Khóa giải mã, bên nhận chỉ cần dán vào ô "Tham gia phòng".
                    </span>
                  </div>

                  {/* Short Room Code */}
                  <div className="p-3 rounded-xl bg-theme-card border border-theme-border flex flex-col items-center gap-1.5 text-center">
                    <span className="text-[11px] text-theme-text-muted">Mã phòng rút gọn:</span>
                    <span className="font-mono text-xl font-bold tracking-widest text-theme-accent bg-theme-bg px-3 py-1 rounded-lg border border-theme-border">
                      {roomCode}
                    </span>
                    <Button variant="secondary" size="sm" onClick={copyRoomCode} className="gap-1.5 mt-1 text-xs">
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Đã sao chép' : 'Sao chép mã ngắn'}</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Tab 4: Active Online Peers */}
              {activeTab === 'peers' && (
                <div className="flex flex-col gap-3">
                  <label className="text-xs font-medium text-theme-text">Thành Viên Đang Trực Tuyến Trong Hệ Thống:</label>
                  {otherPeers.length === 0 ? (
                    <div className="p-6 rounded-xl bg-theme-card border border-theme-border text-center text-xs text-theme-text-muted flex flex-col items-center gap-2">
                      <Users className="w-6 h-6 text-theme-text-muted/60" />
                      <span>Hiện chưa có cộng tác viên nào khác trực tuyến cùng phòng.</span>
                      <span className="text-[10px]">Hãy gửi Liên Kết 1 Chạm hoặc Mã QR ở tab bên cạnh cho bạn bè của bạn!</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                      {otherPeers.map((peer, idx) => {
                        const isInvited = invitedUsers[peer.name];
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-theme-card border border-theme-border text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0"
                                style={{ backgroundColor: peer.color || '#2563eb' }}
                              >
                                {peer.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-medium text-theme-text truncate">{peer.name}</span>
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Đang trực tuyến</span>
                              </div>
                            </div>

                            <Button
                              variant={isInvited ? 'secondary' : 'primary'}
                              size="sm"
                              onClick={() => handleInvitePeer(peer.name)}
                              className="h-7 text-xs gap-1"
                            >
                              {isInvited ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>Đã Cấp Quyền</span>
                                </>
                              ) : (
                                <>
                                  <Send className="w-3.5 h-3.5" />
                                  <span>Cấp Quyền Ngay</span>
                                </>
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Security Key Masking Notice */}
              <div className="pt-2 border-t border-theme-border flex items-center justify-between text-[11px] text-theme-text-muted">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-theme-accent" />
                  <span>Khóa phiên tài liệu: <code className="font-mono">{showRawKey ? (exportedKeyB64 ? `${exportedKeyB64.slice(0, 24)}...` : 'AES256-GCM') : '••••••••••••••••••••••••••••••••••••••••'}</code></span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowRawKey(!showRawKey)}
                  className="text-theme-text hover:text-theme-accent transition-colors cursor-pointer text-[10px] underline ml-2"
                >
                  {showRawKey ? 'Ẩn chuỗi khóa' : 'Hiện chuỗi khóa'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
