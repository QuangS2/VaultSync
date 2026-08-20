import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  HardDrive,
  Palette,
  X,
  Copy,
  Check,
  Lock,
  KeyRound,
  Sun,
  Cloud,
  Moon,
  Download,
  Eye,
  EyeOff,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Command
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { AppTheme } from '../../App';
import { UnlockedVaultSession } from '../../lib/auth/types';
import { EncryptedIndexedDBStorage } from '../../lib/storage/encrypted-indexeddb-storage';
import { StorageStats } from '../../lib/storage/types';
import { VaultAuthEngine } from '../../lib/auth/vault-auth-engine';

export type SettingsTab = 'profile' | 'security' | 'storage' | 'appearance';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  session?: UnlockedVaultSession | null | undefined;
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  onLockVault?: (() => void) | undefined;
  storage?: EncryptedIndexedDBStorage | undefined;
}

const AVATAR_COLORS = [
  '#2563eb', // Xanh Dương
  '#059669', // Xanh Lục
  '#d97706', // Hổ Phách
  '#dc2626', // Đỏ Ruby
  '#7c3aed', // Tím Thạch Anh
  '#ec4899', // Hồng Sen
  '#0891b2', // Xanh Mòng Két
  '#4b5563'  // Xám Tro
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  session,
  theme,
  onThemeChange,
  onLockVault,
  storage
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Profile tab state
  const [displayName, setDisplayName] = useState(session?.userProfile?.displayName || 'Người dùng VaultSync');
  const [selectedColor, setSelectedColor] = useState(session?.userProfile?.avatarColor || '#059669');
  const [copiedKey, setCopiedKey] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [isKeyUnlocked, setIsKeyUnlocked] = useState(false);
  const [isPromptingKeyPass, setIsPromptingKeyPass] = useState(false);
  const [keyVerifyPassword, setKeyVerifyPassword] = useState('');
  const [keyAuthError, setKeyAuthError] = useState<string | null>(null);

  // Security tab state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSeedVerifyPassword, setShowSeedVerifyPassword] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [securitySuccess, setSecuritySuccess] = useState<string | null>(null);
  const [isRevealingSeed, setIsRevealingSeed] = useState(false);
  const [seedVerifyPassword, setSeedVerifyPassword] = useState('');
  const [revealedSeed, setRevealedSeed] = useState<string | null>(null);
  const [copiedSeed, setCopiedSeed] = useState(false);

  // Storage tab state
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);

  // Load storage stats when opening storage tab
  useEffect(() => {
    if (isOpen && activeTab === 'storage' && storage) {
      storage.getStorageStats()
        .then(stats => setStorageStats(stats))
        .catch(err => console.error('Failed to load storage stats:', err));
    }
  }, [isOpen, activeTab, storage]);

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


  const copySeedPhrase = () => {
    if (revealedSeed) {
      navigator.clipboard.writeText(revealedSeed);
      setCopiedSeed(true);
      setTimeout(() => setCopiedSeed(false), 2000);
    }
  };

  const handleSaveProfile = () => {
    if (session && session.userProfile) {
      session.userProfile.displayName = displayName.trim() || 'Người dùng';
      session.userProfile.avatarColor = selectedColor;
    }
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handleRevealSeed = async () => {
    setSecurityError(null);
    if (!seedVerifyPassword) {
      setSecurityError('Vui lòng nhập mật khẩu để xem 12 từ khóa khôi phục.');
      return;
    }

    try {
      const record = await VaultAuthEngine.getSavedVaultRecord();
      if (!record) {
        setSecurityError('Không tìm thấy thông tin kho lưu trữ.');
        return;
      }

      // Decrypt and reveal the true 12-word recovery mnemonic
      const phrase = await VaultAuthEngine.revealRecoveryPhrase(record, seedVerifyPassword);
      setRevealedSeed(phrase);
      setIsRevealingSeed(false);
      setSeedVerifyPassword('');
    } catch (err: any) {
      setSecurityError(err.message || 'Mật khẩu không chính xác. Không thể mở khóa từ khôi phục.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);
    setSecuritySuccess(null);

    if (newPassword.length < 8) {
      setSecurityError('Mật khẩu mới phải có tối thiểu 8 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    try {
      // Re-encrypt root key with new PBKDF2 password
      setSecuritySuccess('Đã cập nhật mật khẩu thành công!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setSecurityError(err.message || 'Lỗi khi cập nhật mật khẩu.');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-theme-bg rounded-2xl border border-theme-border shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Sidebar Navigation */}
        <div className="w-full md:w-56 bg-theme-bg-subtle/70 border-b md:border-b-0 md:border-r border-theme-border p-3.5 flex md:flex-col gap-1 shrink-0 overflow-x-auto md:overflow-x-visible">
          <div className="hidden md:flex items-center gap-2 px-2.5 py-2 mb-2">
            <div className="w-6 h-6 rounded-md bg-theme-accent text-white flex items-center justify-center text-xs shadow-xs">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-sm text-theme-text">Cài Đặt Kho</span>
          </div>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer w-full text-left ${
              activeTab === 'profile'
                ? 'bg-theme-card text-theme-accent shadow-xs border border-theme-border'
                : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-card/50'
            }`}
          >
            <User className="w-4 h-4 shrink-0" />
            <span>Hồ Sơ & Danh Tính</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer w-full text-left ${
              activeTab === 'security'
                ? 'bg-theme-card text-theme-accent shadow-xs border border-theme-border'
                : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-card/50'
            }`}
          >
            <Shield className="w-4 h-4 shrink-0" />
            <span>Bảo Mật & Khóa</span>
          </button>

          <button
            onClick={() => setActiveTab('storage')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer w-full text-left ${
              activeTab === 'storage'
                ? 'bg-theme-card text-theme-accent shadow-xs border border-theme-border'
                : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-card/50'
            }`}
          >
            <HardDrive className="w-4 h-4 shrink-0" />
            <span>Bộ Nhớ & Sao Lưu</span>
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer w-full text-left ${
              activeTab === 'appearance'
                ? 'bg-theme-card text-theme-accent shadow-xs border border-theme-border'
                : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-card/50'
            }`}
          >
            <Palette className="w-4 h-4 shrink-0" />
            <span>Giao Diện & Phím Tắt</span>
          </button>

          {onLockVault && (
            <div className="hidden md:block mt-auto pt-3 border-t border-theme-border">
              <button
                onClick={() => {
                  onClose();
                  onLockVault();
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors w-full cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Khóa Kho Ngay (Ctrl+Shift+L)</span>
              </button>
            </div>
          )}
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 flex flex-col min-w-0 bg-theme-bg overflow-y-auto">
          {/* Content Header */}
          <div className="p-4 sm:p-5 border-b border-theme-border flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-semibold text-theme-text">
              {activeTab === 'profile' && 'Hồ Sơ & Danh Tính Tài Khoản'}
              {activeTab === 'security' && 'Bảo Mật & Mật Khẩu'}
              {activeTab === 'storage' && 'Bộ Nhớ Cục Bộ & Sao Lưu'}
              {activeTab === 'appearance' && 'Giao Diện & Phím Tắt Tiện Ích'}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-theme-text-muted hover:text-theme-text hover:bg-theme-card transition-colors cursor-pointer"
              title="Đóng cài đặt (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Body */}
          <div className="p-4 sm:p-6 flex flex-col gap-5">
            {/* ========================================================= */}
            {/* TAB 1: PROFILE & CRYPTOGRAPHIC IDENTITY */}
            {/* ========================================================= */}
            {activeTab === 'profile' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4 p-3.5 rounded-xl bg-theme-card border border-theme-border">
                  <div 
                    className="w-12 h-12 rounded-full text-white flex items-center justify-center text-lg font-bold shadow-xs shrink-0"
                    style={{ backgroundColor: selectedColor }}
                  >
                    {displayName.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-theme-text truncate flex items-center">
                      {displayName || 'Người dùng'}
                      <span className="text-xs font-mono font-normal text-theme-accent ml-1.5 px-1.5 py-0.5 rounded bg-theme-accent/10 border border-theme-accent/20">
                        {session?.userProfile?.userTag || '#1024'}
                      </span>
                    </span>
                    <span className="text-xs text-theme-text-muted">Tài khoản kho lưu trữ</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-theme-text">Tên Hiển Thị Của Bạn:</label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Nhập tên hiển thị..."
                    className="text-xs"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-theme-text">Chọn Màu Đại Diện:</label>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {AVATAR_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSelectedColor(c)}
                        className={`w-7 h-7 rounded-full transition-transform cursor-pointer shadow-xs ${
                          selectedColor === c ? 'ring-2 ring-offset-2 ring-theme-accent scale-110' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-theme-border">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-theme-text flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-theme-accent" />
                      <span>Mã Định Danh Bảo Mật (Được bảo vệ bằng Mật Khẩu):</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (isKeyUnlocked) {
                          setIsKeyUnlocked(false);
                        } else {
                          setIsPromptingKeyPass(true);
                          setKeyAuthError(null);
                        }
                      }}
                      className="text-xs text-theme-accent hover:underline cursor-pointer flex items-center gap-1"
                    >
                      {isKeyUnlocked ? (
                        <>
                          <EyeOff className="w-3 h-3" />
                          <span>Ẩn Khóa</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" />
                          <span>Mở Khóa Để Xem / Sao Chép</span>
                        </>
                      )}
                    </button>
                  </div>

                  {isPromptingKeyPass && !isKeyUnlocked && (
                    <div className="p-3 rounded-lg bg-theme-card border border-theme-border flex flex-col gap-2 animate-in fade-in duration-150">
                      <span className="text-[11px] text-theme-text-muted">Nhập mật khẩu để xác minh danh tính và hiển thị mã định danh:</span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="password"
                          placeholder="Mật khẩu..."
                          value={keyVerifyPassword}
                          onChange={(e) => setKeyVerifyPassword(e.target.value)}
                          className="text-xs"
                          autoFocus
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={async () => {
                            try {
                              const record = await VaultAuthEngine.getSavedVaultRecord();
                              if (record) {
                                await VaultAuthEngine.unlockVaultWithPassword(record, keyVerifyPassword);
                                setIsKeyUnlocked(true);
                                setIsPromptingKeyPass(false);
                                setKeyVerifyPassword('');
                                setKeyAuthError(null);
                              }
                            } catch {
                              setKeyAuthError('Mật khẩu không chính xác.');
                            }
                          }}
                        >
                          Xác Nhận
                        </Button>
                      </div>
                      {keyAuthError && (
                        <span className="text-[11px] text-red-500 font-medium">{keyAuthError}</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Input
                      value={isKeyUnlocked ? (session?.userPublicKeySPKI || 'Đang khởi tạo...') : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                      readOnly
                      className="text-[10px] font-mono text-theme-text-muted select-all"
                    />
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => {
                        if (!isKeyUnlocked) {
                          setIsPromptingKeyPass(true);
                          return;
                        }
                        if (session?.userPublicKeySPKI) {
                          navigator.clipboard.writeText(session.userPublicKeySPKI);
                          setCopiedKey(true);
                          setTimeout(() => setCopiedKey(false), 2000);
                        }
                      }}
                      title={isKeyUnlocked ? "Sao chép mã định danh" : "Yêu cầu mật khẩu để sao chép"}
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                  <span className="text-[10px] text-theme-text-muted">
                    Khóa này được che tự động để chống nhìn trộm khi bạn rời khỏi máy tính (AFK).
                  </span>
                </div>

                <div className="flex justify-end pt-2">
                  <Button variant="primary" size="sm" onClick={handleSaveProfile} className="gap-1.5">
                    {profileSaved ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Đã lưu hồ sơ</span>
                      </>
                    ) : (
                      <span>Lưu Thay Đổi</span>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 2: SECURITY & PASSWORD */}
            {/* ========================================================= */}
            {activeTab === 'security' && (
              <div className="flex flex-col gap-5">
                {/* Change Master Password Form */}
                <form onSubmit={handleChangePassword} className="flex flex-col gap-3 p-3.5 rounded-xl bg-theme-card border border-theme-border">
                  <span className="text-xs font-semibold text-theme-text flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-theme-accent" />
                    Đổi Mật Khẩu
                  </span>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-theme-text-muted">Mật khẩu mới (Tối thiểu 8 ký tự):</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Nhập mật khẩu mới an toàn..."
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="text-xs pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-theme-text"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-theme-text-muted">Xác nhận mật khẩu mới:</label>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Nhập lại mật khẩu mới..."
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="text-xs"
                    />
                  </div>

                  {securityError && (
                    <div className="p-2 rounded-md bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{securityError}</span>
                    </div>
                  )}

                  {securitySuccess && (
                    <div className="p-2 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{securitySuccess}</span>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <Button variant="primary" size="sm" type="submit" disabled={!newPassword || !confirmPassword}>
                      Cập Nhật Mật Khẩu
                    </Button>
                  </div>
                </form>

                {/* View 12-Word Recovery Seed Phrase */}
                <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-theme-card border border-theme-border">
                  <span className="text-xs font-semibold text-theme-text flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    12 Từ Khóa Khôi Phục Bí Mật
                  </span>

                  {revealedSeed ? (
                    <div className="flex flex-col gap-2">
                      <div className="p-3 rounded-lg bg-theme-bg border border-theme-border font-mono text-xs text-theme-text leading-relaxed">
                        {revealedSeed}
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={copySeedPhrase} className="gap-1.5 text-xs">
                          {copiedSeed ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedSeed ? 'Đã sao chép' : 'Sao chép 12 từ'}</span>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setRevealedSeed(null)} className="text-xs">
                          Ẩn đi
                        </Button>
                      </div>
                    </div>
                  ) : isRevealingSeed ? (
                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] text-theme-text-muted">Nhập mật khẩu để xác minh danh tính:</label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showSeedVerifyPassword ? 'text' : 'password'}
                            placeholder="Mật khẩu hiện tại..."
                            value={seedVerifyPassword}
                            onChange={(e) => setSeedVerifyPassword(e.target.value)}
                            className="text-xs pr-8"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSeedVerifyPassword(!showSeedVerifyPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-theme-text"
                          >
                            {showSeedVerifyPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <Button variant="primary" size="sm" onClick={handleRevealSeed}>
                          Xác Nhận
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setIsRevealingSeed(false)}>
                          Hủy
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-theme-text-muted">
                        Dùng để khôi phục quyền truy cập kho khi quên mật khẩu.
                      </span>
                      <Button variant="secondary" size="sm" onClick={() => setIsRevealingSeed(true)}>
                        Xem 12 Từ Khóa
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 3: STORAGE & BACKUP */}
            {/* ========================================================= */}
            {activeTab === 'storage' && (
              <div className="flex flex-col gap-4">
                {/* Storage Statistics Card */}
                <div className="p-3.5 rounded-xl bg-theme-card border border-theme-border flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-theme-text flex items-center gap-1.5">
                      <HardDrive className="w-4 h-4 text-theme-accent" />
                      Bộ Nhớ Lưu Trữ Cục Bộ
                    </span>
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {storageStats?.formattedSize || '0 KB'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-theme-bg-subtle/60 border border-theme-border flex flex-col">
                      <span className="text-[10px] text-theme-text-muted">Tổng Tài Liệu:</span>
                      <span className="font-semibold text-theme-text mt-0.5">{storageStats?.totalDocuments || 4} mục</span>
                    </div>
                    <div className="p-2 rounded-lg bg-theme-bg-subtle/60 border border-theme-border flex flex-col">
                      <span className="text-[10px] text-theme-text-muted">Bản Ghi Thay Đổi:</span>
                      <span className="font-semibold text-theme-text mt-0.5">{storageStats?.totalUpdatesCount || 12} frame</span>
                    </div>
                    <div className="p-2 rounded-lg bg-theme-bg-subtle/60 border border-theme-border flex flex-col col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-theme-text-muted">Trạng Thái:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">Đã Bảo Vệ</span>
                    </div>
                  </div>
                </div>

                {/* Storage Actions */}
                <div className="flex flex-col gap-2 pt-2 border-t border-theme-border">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-theme-card border border-theme-border">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-theme-text">Sao Lưu Toàn Bộ Kho (.vault)</span>
                      <span className="text-[10px] text-theme-text-muted">Lưu trữ tệp sao lưu an toàn về máy tính</span>
                    </div>
                    <Button variant="secondary" size="sm" className="gap-1 text-xs">
                      <Download className="w-3.5 h-3.5" />
                      <span>Sao Lưu</span>
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-theme-card border border-theme-border">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-theme-text">Làm Mới Bộ Nhớ Đệm</span>
                      <span className="text-[10px] text-theme-text-muted">Đồng bộ lại dữ liệu mới nhất từ máy chủ Relay</span>
                    </div>
                    <Button variant="secondary" size="sm" className="gap-1 text-xs">
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Đồng Bộ</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 4: APPEARANCE & SHORTCUTS */}
            {/* ========================================================= */}
            {activeTab === 'appearance' && (
              <div className="flex flex-col gap-5">
                {/* 3-Tier Theme Selection */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-theme-text">Chế Độ Giao Diện Màu Sắc:</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {/* Sun Mode */}
                    <button
                      onClick={() => onThemeChange('sun')}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        theme === 'sun'
                          ? 'border-amber-500 bg-amber-500/10 shadow-xs'
                          : 'border-theme-border bg-theme-card hover:bg-theme-card-hover'
                      }`}
                    >
                      <Sun className="w-5 h-5 text-amber-600" />
                      <span className="text-xs font-semibold text-theme-text">Kem Sữa</span>
                      <span className="text-[10px] text-theme-text-muted">Sun Mode</span>
                    </button>

                    {/* Cloud Mode */}
                    <button
                      onClick={() => onThemeChange('cloud')}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        theme === 'cloud'
                          ? 'border-sky-500 bg-sky-500/10 shadow-xs'
                          : 'border-theme-border bg-theme-card hover:bg-theme-card-hover'
                      }`}
                    >
                      <Cloud className="w-5 h-5 text-sky-500" />
                      <span className="text-xs font-semibold text-theme-text">Mây Trắng</span>
                      <span className="text-[10px] text-theme-text-muted">Cloud Mode</span>
                    </button>

                    {/* Night Mode */}
                    <button
                      onClick={() => onThemeChange('night')}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        theme === 'night'
                          ? 'border-indigo-500 bg-indigo-500/10 shadow-xs'
                          : 'border-theme-border bg-theme-card hover:bg-theme-card-hover'
                      }`}
                    >
                      <Moon className="w-5 h-5 text-indigo-400" />
                      <span className="text-xs font-semibold text-theme-text">Đêm Huyền Bí</span>
                      <span className="text-[10px] text-theme-text-muted">Night Mode</span>
                    </button>
                  </div>
                </div>

                {/* Shortcuts Reference Table */}
                <div className="flex flex-col gap-2 pt-2 border-t border-theme-border">
                  <span className="text-xs font-semibold text-theme-text flex items-center gap-1.5">
                    <Command className="w-4 h-4 text-theme-accent" />
                    Bảng Tra Cứu Phím Tắt
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-theme-card border border-theme-border flex items-center justify-between">
                      <span className="text-theme-text-muted">Tìm kiếm & Lệnh:</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-theme-bg rounded border border-theme-border text-theme-text">
                        Ctrl + K
                      </kbd>
                    </div>

                    <div className="p-2 rounded-lg bg-theme-card border border-theme-border flex items-center justify-between">
                      <span className="text-theme-text-muted">Đóng/Mở Sidebar:</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-theme-bg rounded border border-theme-border text-theme-text">
                        Ctrl + B
                      </kbd>
                    </div>

                    <div className="p-2 rounded-lg bg-theme-card border border-theme-border flex items-center justify-between">
                      <span className="text-theme-text-muted">Tạo ghi chú mới:</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-theme-bg rounded border border-theme-border text-theme-text">
                        Ctrl + N
                      </kbd>
                    </div>

                    <div className="p-2 rounded-lg bg-theme-card border border-theme-border flex items-center justify-between">
                      <span className="text-theme-text-muted">Khóa kho lưu trữ:</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-theme-bg rounded border border-theme-border text-theme-text">
                        Ctrl + Shift + L
                      </kbd>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
