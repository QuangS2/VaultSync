import React, { useState } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Key,
  Sun,
  Cloud,
  Moon,
  AlertCircle,
  PlusCircle,
  Sparkles
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { VaultSyncBrandLogo } from '../ui/VaultSyncBrandLogo';
import { AppTheme } from '../../App';
import { EncryptedVaultRecord, UnlockedVaultSession } from '../../lib/auth/types';
import { VaultAuthEngine } from '../../lib/auth/vault-auth-engine';

export interface VaultUnlockScreenProps {
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  record: EncryptedVaultRecord;
  onUnlocked: (session: UnlockedVaultSession) => void;
  onCreateNewVault: () => void;
}

export const VaultUnlockScreen: React.FC<VaultUnlockScreenProps> = ({
  theme,
  onThemeChange,
  record,
  onUnlocked,
  onCreateNewVault
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Recovery mode state
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryPhraseInput, setRecoveryPhraseInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu chủ.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      const session = await VaultAuthEngine.unlockVaultWithPassword(record, password);
      onUnlocked(session);
    } catch (err: any) {
      setErrorMessage(err.message || 'Mật khẩu chủ không chính xác.');
      setIsLoading(false);
    }
  };

  const handleRecoverVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryPhraseInput.trim()) {
      setErrorMessage('Vui lòng nhập 12 từ khóa khôi phục.');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setErrorMessage('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    if (newPassword && newPassword !== confirmNewPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      const result = await VaultAuthEngine.unlockVaultWithRecoveryPhrase(
        record,
        recoveryPhraseInput,
        newPassword || undefined
      );

      onUnlocked(result.session);
    } catch (err: any) {
      setErrorMessage(err.message || 'Khôi phục thất bại.');
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col justify-between overflow-hidden bg-theme-bg text-theme-text font-sans select-none relative">
      {/* Top Header Controls: Logo & Theme Switcher */}
      <header className="h-14 px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <VaultSyncBrandLogo size="sm" animated />
          <span className="font-bold text-sm tracking-tight text-theme-text font-sans">VaultSync</span>
        </div>

        {/* 3-Tier Theme Switcher */}
        <div className="flex items-center bg-theme-card p-0.5 rounded-lg border border-theme-border shadow-xs">
          <button
            onClick={() => onThemeChange('sun')}
            title="Chế độ Kem Sữa (Sun)"
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              theme === 'sun' ? 'bg-theme-bg-subtle text-amber-600 shadow-xs' : 'text-theme-text-muted hover:text-theme-text'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onThemeChange('cloud')}
            title="Chế độ Mây Trắng Xám (Cloud)"
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              theme === 'cloud' ? 'bg-theme-bg-subtle text-sky-500 shadow-xs' : 'text-theme-text-muted hover:text-theme-text'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onThemeChange('night')}
            title="Chế độ Đêm Huyền Bí (Night)"
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              theme === 'night' ? 'bg-theme-bg-subtle text-indigo-400 shadow-xs' : 'text-theme-text-muted hover:text-theme-text'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Center Auth Card */}
      <main className="flex-1 flex items-center justify-center p-4 z-10">
        <div className="w-full max-w-md bg-theme-bg-subtle border border-theme-border rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col gap-6 backdrop-blur-md">
          
          {/* User Vault Header Profile */}
          <div className="flex flex-col items-center text-center gap-2.5">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-md"
              style={{ backgroundColor: record.userProfile.avatarColor || '#2563eb' }}
            >
              {record.userProfile.displayName.charAt(0).toUpperCase()}
            </div>
            
            <div>
              <h2 className="text-base font-bold text-theme-text tracking-tight">
                {record.vaultName}
              </h2>
              <p className="text-xs text-theme-text-muted mt-0.5">
                Chủ sở hữu: <span className="font-medium text-theme-text">{record.userProfile.displayName}</span>
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* NORMAL UNLOCK FORM */}
          {!isRecoveryMode ? (
            <form onSubmit={handleUnlock} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-theme-text">Mật khẩu chủ (Master Password):</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu để mở khóa kho..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                    prefixIcon={<Lock className="w-3.5 h-3.5" />}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-theme-text cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                type="submit"
                isLoading={isLoading}
                disabled={!password || isLoading}
                className="w-full gap-2 mt-1 shadow-sm"
              >
                <span>Mở Khóa Kho Lưu Trữ</span>
                <ArrowRight className="w-4 h-4" />
              </Button>

              {/* Bottom Helpers */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-theme-border">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setIsRecoveryMode(true);
                  }}
                  className="text-theme-text-muted hover:text-theme-accent transition-colors cursor-pointer text-[11px]"
                >
                  Quên mật khẩu? Khôi phục
                </button>

                <button
                  type="button"
                  onClick={onCreateNewVault}
                  className="text-theme-text-muted hover:text-theme-text flex items-center gap-1 transition-colors cursor-pointer text-[11px]"
                >
                  <PlusCircle className="w-3 h-3" />
                  <span>Tạo kho mới</span>
                </button>
              </div>
            </form>
          ) : (
            /* RECOVERY SEED PHRASE FORM */
            <form onSubmit={handleRecoverVault} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-theme-text flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-theme-accent" /> Khôi Phục Bằng 12 Từ Khóa (BIP-39):
                </span>
                <p className="text-[11px] text-theme-text-muted">
                  Dán chính xác 12 từ khóa cách nhau bởi khoảng trắng.
                </p>
              </div>

              <textarea
                rows={3}
                placeholder="abandon ability able about above absent..."
                value={recoveryPhraseInput}
                onChange={(e) => setRecoveryPhraseInput(e.target.value)}
                autoFocus
                className="w-full p-2.5 rounded-lg bg-theme-card border border-theme-border font-mono text-xs text-theme-text focus:outline-none focus:border-theme-accent transition-colors resize-none placeholder:text-theme-text-muted"
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-theme-text">Mật khẩu mới (Tùy chọn):</label>
                <Input
                  type={showRecoveryPassword ? 'text' : 'password'}
                  placeholder="Đặt mật khẩu mới nếu muốn thay đổi..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  prefixIcon={<Lock className="w-3.5 h-3.5" />}
                  suffixIcon={
                    <button
                      type="button"
                      onClick={() => setShowRecoveryPassword(!showRecoveryPassword)}
                      className="text-theme-text-muted hover:text-theme-text cursor-pointer"
                    >
                      {showRecoveryPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  }
                />
              </div>

              {newPassword.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-theme-text">Xác nhận mật khẩu mới:</label>
                  <Input
                    type={showRecoveryPassword ? 'text' : 'password'}
                    placeholder="Nhập lại mật khẩu mới..."
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    prefixIcon={<Lock className="w-3.5 h-3.5" />}
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="md"
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setIsRecoveryMode(false);
                  }}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Quay lại
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  isLoading={isLoading}
                  disabled={!recoveryPhraseInput.trim() || isLoading}
                  className="flex-1 gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Khôi Phục & Mở</span>
                </Button>
              </div>
            </form>
          )}

          {/* Security Badge Footer */}
          <div className="bg-theme-card p-3 rounded-xl border border-theme-border flex items-start gap-2.5 text-[11px] text-theme-text-muted leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Mọi ghi chú và dữ liệu được bảo vệ an toàn trên thiết bị của bạn. Chỉ có bạn mới có quyền mở khóa bằng Mật khẩu chủ hoặc 12 từ khóa khôi phục bí mật.
            </span>
          </div>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="h-10 px-6 flex items-center justify-between text-[11px] text-theme-text-muted border-t border-theme-border bg-theme-card/50 z-10">
        <span>VaultSync v1.0.0 • Không gian ghi chép và làm việc nhóm</span>
        <span>Phím tắt: Nhấn Enter để mở khóa</span>
      </footer>
    </div>
  );
};
