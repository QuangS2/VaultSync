import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  Download,
  RefreshCw,
  User,
  Folder,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Lock,
  Sparkles,
  Sun,
  Cloud,
  Moon,
  LogIn,
  UserPlus,
  UploadCloud,
  KeyRound
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { VaultSyncBrandLogo } from '../ui/VaultSyncBrandLogo';
import { VaultAuthEngine } from '../../lib/auth/vault-auth-engine';
import { validateMnemonic12 } from '../../lib/auth/bip39-wordlist';
import { UnlockedVaultSession } from '../../lib/auth/types';
import { AppTheme } from '../../App';

export interface VaultOnboardingModalProps {
  isOpen: boolean;
  onClose?: (() => void) | undefined;
  onVaultCreated: (session: UnlockedVaultSession) => void;
  isFullScreen?: boolean | undefined;
  theme?: AppTheme | undefined;
  onThemeChange?: ((theme: AppTheme) => void) | undefined;
}

const AVATAR_COLORS = [
  { hex: '#2563eb', label: 'Xanh Lam' },
  { hex: '#10b981', label: 'Xanh Lục' },
  { hex: '#8b5cf6', label: 'Tím Khói' },
  { hex: '#f59e0b', label: 'Hổ Phách' },
  { hex: '#ec4899', label: 'Hồng Ngọc' },
  { hex: '#06b6d4', label: 'Xanh Mòng Két' }
];

export const VaultOnboardingModal: React.FC<VaultOnboardingModalProps> = ({
  isOpen,
  onClose,
  onVaultCreated,
  theme,
  onThemeChange
}) => {
  // Auth Mode: 'register' (Tạo mới) | 'login_recovery' (12 từ khóa) | 'login_backup' (.vault file)
  const [authMode, setAuthMode] = useState<'register' | 'login_recovery' | 'login_backup'>('register');

  // Registration State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [displayName, setDisplayName] = useState('');
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]?.hex ?? '#2563eb');
  const [vaultName, setVaultName] = useState('Personal Vault');
  
  // Password step state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Recovery phrase step state
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [isGeneratingPhrase, setIsGeneratingPhrase] = useState(false);
  const [hasSavedRecovery, setHasSavedRecovery] = useState(false);
  const [copiedPhrase, setCopiedPhrase] = useState(false);
  const [downloadedPhrase, setDownloadedPhrase] = useState(false);

  // Login via Recovery Phrase State (For Existing Users on New Device)
  const [importRecoveryPhrase, setImportRecoveryPhrase] = useState('');
  const [importDisplayName, setImportDisplayName] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [importConfirmPassword, setImportConfirmPassword] = useState('');
  const [backupFileName, setBackupFileName] = useState<string | null>(null);
  const [backupFileContent, setBackupFileContent] = useState<string | null>(null);
  const [backupPassword, setBackupPassword] = useState('');
  const [showImportPassword, setShowImportPassword] = useState(false);
  const [showBackupPassword, setShowBackupPassword] = useState(false);

  // Submission state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Generate 12-word seed phrase when moving to step 3
  const generateNewSeedPhrase = async () => {
    try {
      setIsGeneratingPhrase(true);
      setErrorMessage(null);
      const phrase = await VaultAuthEngine.generateRecoveryPhrase();
      setRecoveryPhrase(phrase);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi tạo từ khóa khôi phục.');
    } finally {
      setIsGeneratingPhrase(false);
    }
  };

  useEffect(() => {
    if (step === 3 && !recoveryPhrase) {
      generateNewSeedPhrase();
    }
  }, [step, recoveryPhrase]);

  if (!isOpen) return null;

  // Step 1 -> Step 2 validation
  const handleNextToPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMessage('Vui lòng nhập tên hiển thị của bạn.');
      return;
    }
    setErrorMessage(null);
    setStep(2);
  };

  // Step 2 -> Step 3 validation
  const handleNextToRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu chủ.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Mật khẩu chủ phải có ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp.');
      return;
    }
    setErrorMessage(null);
    setStep(3);
  };

  // Step 3 submission: Finish & create vault
  const handleFinishRegistration = async () => {
    if (!hasSavedRecovery) {
      setErrorMessage('Vui lòng xác nhận rằng bạn đã lưu trữ an toàn 12 từ khóa bí mật.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      const result = await VaultAuthEngine.createVault({
        vaultName: vaultName.trim() || 'Personal Vault',
        displayName: displayName.trim(),
        avatarColor,
        masterPassword: password,
        customRecoveryPhrase: recoveryPhrase
      });

      onVaultCreated(result.session);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể khởi tạo kho lưu trữ.');
      setIsLoading(false);
    }
  };

  // Existing User Login via 12-Word Recovery Phrase
  const handleLoginWithRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhrase = importRecoveryPhrase.trim().toLowerCase();
    if (!cleanPhrase) {
      setErrorMessage('Vui lòng nhập 12 từ khóa khôi phục bí mật.');
      return;
    }

    const isValid = await validateMnemonic12(cleanPhrase);
    if (!isValid) {
      setErrorMessage('12 từ khóa khôi phục không đúng định dạng chuẩn (12 từ tiếng Anh hợp lệ).');
      return;
    }

    if (!importDisplayName.trim()) {
      setErrorMessage('Vui lòng nhập tên hiển thị của bạn.');
      return;
    }

    if (!importPassword || importPassword.length < 6) {
      setErrorMessage('Vui lòng đặt mật khẩu chủ mới (ít nhất 6 ký tự) cho thiết bị này.');
      return;
    }

    if (importPassword !== importConfirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      const result = await VaultAuthEngine.createVault({
        vaultName: 'Restored Vault',
        displayName: importDisplayName.trim(),
        avatarColor: AVATAR_COLORS[1]?.hex ?? '#10b981',
        masterPassword: importPassword,
        customRecoveryPhrase: cleanPhrase
      });

      onVaultCreated(result.session);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể khôi phục kho lưu trữ từ từ khóa bí mật.');
      setIsLoading(false);
    }
  };

  // Existing User Login via .vault Backup File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBackupFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setBackupFileContent(content);
    };
    reader.readAsText(file);
  };

  const handleLoginWithBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupFileContent) {
      setErrorMessage('Vui lòng chọn tệp sao lưu (.vault).');
      return;
    }

    if (!backupPassword) {
      setErrorMessage('Vui lòng nhập mật khẩu chủ của tệp sao lưu.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      const parsedBackup = JSON.parse(backupFileContent);
      if (!parsedBackup.vaultRecord) {
        throw new Error('Tệp sao lưu không đúng định dạng .vault chuẩn.');
      }

      await VaultAuthEngine.saveVaultRecord(parsedBackup.vaultRecord);
      const session = await VaultAuthEngine.unlockVaultWithPassword(parsedBackup.vaultRecord, backupPassword);
      onVaultCreated(session);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể mở khóa tệp sao lưu. Vui lòng kiểm tra lại mật khẩu.');
      setIsLoading(false);
    }
  };

  const copyPhraseToClipboard = () => {
    navigator.clipboard.writeText(recoveryPhrase);
    setCopiedPhrase(true);
    setTimeout(() => setCopiedPhrase(false), 2500);
  };

  const downloadRecoveryFile = () => {
    const content = `VAULTSYNC ZERO-KNOWLEDGE RECOVERY PHRASE\n=========================================\n\nOwner: ${displayName}\nVault: ${vaultName}\nDate: ${new Date().toISOString()}\n\n12-Word Recovery Phrase:\n${recoveryPhrase}\n\nIMPORTANT: Keep this file offline and strictly confidential.\nAnyone with this phrase can restore your vault identity.`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vaultsync-recovery-${displayName.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadedPhrase(true);
    setTimeout(() => setDownloadedPhrase(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-theme-bg/85 backdrop-blur-md overflow-y-auto select-none font-sans">
      <div className="w-full max-w-lg bg-theme-bg border border-theme-border rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header with Brand & Theme Switcher */}
        <div className="p-5 sm:p-6 border-b border-theme-border flex items-center justify-between bg-theme-card">
          <div className="flex items-center gap-3">
            <VaultSyncBrandLogo size="lg" animated />
            <div className="flex flex-col">
              <h1 className="text-base sm:text-lg font-bold text-theme-text flex items-center gap-2">
                <span>VaultSync</span>
              </h1>
              <p className="text-xs text-theme-text-muted">
                {authMode === 'register' ? 'Đăng Ký & Khởi Tạo Kho Lưu Trữ Mới' : 'Đăng Nhập & Khôi Phục Kho Lưu Trữ'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 3-Tier Theme Switcher */}
            {onThemeChange && (
              <div className="flex items-center gap-1 p-1 bg-theme-bg rounded-lg border border-theme-border">
                <button
                  type="button"
                  onClick={() => onThemeChange('sun')}
                  title="Giao diện Kem Sữa (Sun)"
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    theme === 'sun' ? 'bg-amber-100 text-amber-900 shadow-xs' : 'text-theme-text-muted hover:text-theme-text'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onThemeChange('cloud')}
                  title="Giao diện Mây Trắng (Cloud)"
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    theme === 'cloud' ? 'bg-slate-200 text-slate-800 shadow-xs' : 'text-theme-text-muted hover:text-theme-text'
                  }`}
                >
                  <Cloud className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onThemeChange('night')}
                  title="Giao diện Đêm Huyền Bí (Night)"
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    theme === 'night' ? 'bg-slate-800 text-white shadow-xs' : 'text-theme-text-muted hover:text-theme-text'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-theme-text-muted hover:text-theme-text hover:bg-theme-bg cursor-pointer transition-colors border border-theme-border"
                title="Đóng"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Auth Mode Tabs (Tạo Mới vs Đăng Nhập) */}
        <div className="px-5 pt-4 pb-0 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
              authMode === 'register'
                ? 'bg-theme-card text-theme-accent border-theme-border shadow-xs'
                : 'bg-theme-bg-subtle text-theme-text-muted border-transparent hover:text-theme-text'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Tạo Kho Mới (Đăng Ký)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('login_recovery');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
              authMode !== 'register'
                ? 'bg-theme-card text-theme-accent border-theme-border shadow-xs'
                : 'bg-theme-bg-subtle text-theme-text-muted border-transparent hover:text-theme-text'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Đăng Nhập / Khôi Phục</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 flex flex-col gap-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 1. REGISTRATION MODE (3 CLEAR STEPS) */}
          {/* ========================================================================= */}
          {authMode === 'register' && (
            <div className="flex flex-col gap-4">
              {/* Stepper Progress Indicator */}
              <div className="flex items-center justify-between text-xs pb-2 border-b border-theme-border">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      step >= 1 ? 'bg-theme-accent text-white' : 'bg-theme-card text-theme-text-muted border border-theme-border'
                    }`}
                  >
                    1
                  </span>
                  <span className={`font-medium ${step >= 1 ? 'text-theme-text font-semibold' : 'text-theme-text-muted'}`}>
                    Hồ sơ
                  </span>
                </div>
                <div className="h-0.5 w-8 bg-theme-border" />
                <div className="flex items-center gap-2">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      step >= 2 ? 'bg-theme-accent text-white' : 'bg-theme-card text-theme-text-muted border border-theme-border'
                    }`}
                  >
                    2
                  </span>
                  <span className={`font-medium ${step >= 2 ? 'text-theme-text font-semibold' : 'text-theme-text-muted'}`}>
                    Mật khẩu chủ
                  </span>
                </div>
                <div className="h-0.5 w-8 bg-theme-border" />
                <div className="flex items-center gap-2">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      step === 3 ? 'bg-theme-accent text-white' : 'bg-theme-card text-theme-text-muted border border-theme-border'
                    }`}
                  >
                    3
                  </span>
                  <span className={`font-medium ${step === 3 ? 'text-theme-text font-semibold' : 'text-theme-text-muted'}`}>
                    Khôi phục bí mật
                  </span>
                </div>
              </div>

              {/* STEP 1: IDENTITY & VAULT PROFILE */}
              {step === 1 && (
                <form onSubmit={handleNextToPassword} className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-theme-card border border-theme-border">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs"
                      style={{ backgroundColor: avatarColor }}
                    >
                      {displayName.trim() ? displayName.trim().charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-theme-text truncate">
                        {displayName.trim() || 'Người dùng mới'}
                      </p>
                      <p className="text-[11px] text-theme-text-muted truncate">
                        {vaultName.trim() || 'Kho Cá Nhân'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-theme-text">Tên hiển thị của bạn:</label>
                    <Input
                      placeholder="Ví dụ: Lê Anh Quang, Alice..."
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      autoFocus
                      prefixIcon={<User className="w-3.5 h-3.5" />}
                    />
                    <span className="text-[10px] text-theme-text-muted">
                      Tên này dùng để hiển thị khi bạn cộng tác và ghi chú trong tài liệu.
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-theme-text">Màu đại diện của bạn:</label>
                    <div className="flex items-center gap-2">
                      {AVATAR_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setAvatarColor(c.hex)}
                          title={c.label}
                          className={`w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                            avatarColor === c.hex ? 'scale-110 ring-2 ring-theme-accent ring-offset-2 ring-offset-theme-bg' : 'opacity-80 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: c.hex }}
                        >
                          {avatarColor === c.hex && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-theme-text">Tên Kho Lưu Trữ (Vault Name):</label>
                    <Input
                      placeholder="Ví dụ: Personal Vault, Engineering Notes..."
                      value={vaultName}
                      onChange={(e) => setVaultName(e.target.value)}
                      prefixIcon={<Folder className="w-3.5 h-3.5" />}
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button variant="primary" size="md" type="submit" disabled={!displayName.trim()}>
                      <span>Tiếp tục: Mật khẩu chủ</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </form>
              )}

              {/* STEP 2: MASTER PASSWORD */}
              {step === 2 && (
                <form onSubmit={handleNextToRecovery} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-theme-text">Đặt Mật Khẩu Chủ:</label>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Nhập mật khẩu an toàn (tối thiểu 6 ký tự)..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoFocus
                      prefixIcon={<Lock className="w-3.5 h-3.5" />}
                      suffixIcon={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-theme-text-muted hover:text-theme-text cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-theme-text">Xác Nhận Mật Khẩu Chủ:</label>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Nhập chính xác mật khẩu..."
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      prefixIcon={<Lock className="w-3.5 h-3.5" />}
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-theme-card border border-theme-border flex items-start gap-2.5 text-xs text-theme-text-muted">
                    <ShieldCheck className="w-4 h-4 text-theme-accent shrink-0 mt-0.5" />
                    <span>Mật khẩu này dùng để bảo vệ và mở khóa an toàn kho lưu trữ trên thiết bị của bạn.</span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button variant="secondary" size="md" type="button" onClick={() => setStep(1)}>
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Quay lại</span>
                    </Button>
                    <Button variant="primary" size="md" type="submit" disabled={!password || password.length < 6}>
                      <span>Tiếp tục: Khóa khôi phục</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </form>
              )}

              {/* STEP 3: 12-WORD RECOVERY PHRASE */}
              {step === 3 && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-theme-text flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-theme-accent" />
                      <span>12 Từ Khóa Khôi Phục Bí Mật:</span>
                    </label>
                    <button
                      type="button"
                      onClick={generateNewSeedPhrase}
                      disabled={isGeneratingPhrase}
                      className="text-xs text-theme-accent hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${isGeneratingPhrase ? 'animate-spin' : ''}`} />
                      <span>Tạo lại bộ từ</span>
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-theme-card border border-theme-border grid grid-cols-3 gap-2">
                    {recoveryPhrase.split(' ').map((word, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 p-1.5 rounded bg-theme-bg border border-theme-border text-xs font-mono"
                      >
                        <span className="text-[10px] text-theme-text-muted w-4 text-right select-none">{idx + 1}.</span>
                        <span className="font-semibold text-theme-text">{word}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={copyPhraseToClipboard} className="flex-1 gap-1.5 text-xs">
                      {copiedPhrase ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPhrase ? 'Đã sao chép' : 'Sao chép 12 từ'}</span>
                    </Button>
                    <Button variant="secondary" size="sm" onClick={downloadRecoveryFile} className="flex-1 gap-1.5 text-xs">
                      {downloadedPhrase ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Download className="w-3.5 h-3.5" />}
                      <span>{downloadedPhrase ? 'Đã tải xuống' : 'Tải tệp .txt'}</span>
                    </Button>
                  </div>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasSavedRecovery}
                      onChange={(e) => setHasSavedRecovery(e.target.checked)}
                      className="mt-0.5 accent-theme-accent cursor-pointer"
                    />
                    <span>Tôi đã lưu trữ an toàn 12 từ khóa khôi phục ở nơi bí mật và hiểu rằng không ai có thể khôi phục dữ liệu nếu tôi làm mất.</span>
                  </label>

                  <div className="flex items-center justify-between pt-2">
                    <Button variant="secondary" size="md" onClick={() => setStep(2)}>
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Quay lại</span>
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleFinishRegistration}
                      disabled={!hasSavedRecovery || isLoading}
                      className="gap-1.5"
                    >
                      {isLoading ? (
                        <span>Đang khởi tạo...</span>
                      ) : (
                        <>
                          <span>Hoàn tất & Mở Kho Lưu Trữ</span>
                          <Sparkles className="w-3.5 h-3.5" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. LOGIN / RECOVERY MODE FOR EXISTING USERS */}
          {/* ========================================================================= */}
          {authMode !== 'register' && (
            <div className="flex flex-col gap-4">
              {/* Method Switcher within Login Mode */}
              <div className="flex items-center p-1 bg-theme-card rounded-lg border border-theme-border text-xs">
                <button
                  type="button"
                  onClick={() => setAuthMode('login_recovery')}
                  className={`flex-1 py-1.5 rounded-md font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    authMode === 'login_recovery'
                      ? 'bg-theme-bg text-theme-accent shadow-xs border border-theme-border'
                      : 'text-theme-text-muted hover:text-theme-text'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>12 Từ Khóa Khôi Phục</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAuthMode('login_backup')}
                  className={`flex-1 py-1.5 rounded-md font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    authMode === 'login_backup'
                      ? 'bg-theme-bg text-theme-accent shadow-xs border border-theme-border'
                      : 'text-theme-text-muted hover:text-theme-text'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Tệp Sao Lưu (.vault)</span>
                </button>
              </div>

              {/* Login Method A: 12-Word Recovery Phrase */}
              {authMode === 'login_recovery' && (
                <form onSubmit={handleLoginWithRecovery} className="flex flex-col gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-theme-text">Dán 12 Từ Khóa Khôi Phục Bí Mật Của Bạn:</label>
                    <textarea
                      rows={3}
                      placeholder="Ví dụ: apple banana cherry diamond elephant flame gorilla horizon island jungle knight legend"
                      value={importRecoveryPhrase}
                      onChange={(e) => setImportRecoveryPhrase(e.target.value)}
                      className="w-full p-2.5 rounded-lg bg-theme-card border border-theme-border text-xs font-mono text-theme-text focus:outline-none focus:ring-1 focus:ring-theme-accent"
                      autoFocus
                    />
                    <span className="text-[10px] text-theme-text-muted">
                      Nhập đúng 12 từ tiếng Anh ngăn cách bằng dấu cách.
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-theme-text">Tên Hiển Thị Của Bạn:</label>
                    <Input
                      placeholder="Ví dụ: Lê Anh Quang"
                      value={importDisplayName}
                      onChange={(e) => setImportDisplayName(e.target.value)}
                      prefixIcon={<User className="w-3.5 h-3.5" />}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-theme-text">Đặt Mật Khẩu Chủ Mới:</label>
                      <Input
                        type={showImportPassword ? 'text' : 'password'}
                        placeholder="Mật khẩu chủ..."
                        value={importPassword}
                        onChange={(e) => setImportPassword(e.target.value)}
                        prefixIcon={<Lock className="w-3.5 h-3.5" />}
                        suffixIcon={
                          <button
                            type="button"
                            onClick={() => setShowImportPassword(!showImportPassword)}
                            className="text-theme-text-muted hover:text-theme-text cursor-pointer"
                          >
                            {showImportPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-theme-text">Xác Nhận Mật Khẩu:</label>
                      <Input
                        type={showImportPassword ? 'text' : 'password'}
                        placeholder="Xác nhận mật khẩu..."
                        value={importConfirmPassword}
                        onChange={(e) => setImportConfirmPassword(e.target.value)}
                        prefixIcon={<Lock className="w-3.5 h-3.5" />}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button variant="primary" size="md" type="submit" disabled={isLoading} className="gap-1.5">
                      {isLoading ? <span>Đang khôi phục...</span> : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Khôi Phục & Đăng Nhập</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}

              {/* Login Method B: .vault Backup File */}
              {authMode === 'login_backup' && (
                <form onSubmit={handleLoginWithBackup} className="flex flex-col gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-theme-text">Chọn Tệp Sao Lưu (.vault):</label>
                    <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-theme-border rounded-xl hover:bg-theme-card/60 transition-colors cursor-pointer">
                      <UploadCloud className="w-8 h-8 text-theme-accent mb-1" />
                      <span className="text-xs font-medium text-theme-text">
                        {backupFileName ? backupFileName : 'Nhấp để chọn tệp .vault từ máy tính'}
                      </span>
                      <span className="text-[10px] text-theme-text-muted mt-0.5">Tệp sao lưu mã hóa hoàn chỉnh</span>
                      <input type="file" accept=".vault,.json" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-theme-text">Mật Khẩu Chủ Của Tệp Sao Lưu:</label>
                    <Input
                      type={showBackupPassword ? 'text' : 'password'}
                      placeholder="Nhập mật khẩu chủ đã dùng khi sao lưu..."
                      value={backupPassword}
                      onChange={(e) => setBackupPassword(e.target.value)}
                      prefixIcon={<Lock className="w-3.5 h-3.5" />}
                      suffixIcon={
                        <button
                          type="button"
                          onClick={() => setShowBackupPassword(!showBackupPassword)}
                          className="text-theme-text-muted hover:text-theme-text cursor-pointer"
                        >
                          {showBackupPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      }
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button variant="primary" size="md" type="submit" disabled={!backupFileContent || !backupPassword || isLoading} className="gap-1.5">
                      {isLoading ? <span>Đang mở khóa...</span> : (
                        <>
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Mở Khóa & Nhập Dữ Liệu</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer Toggle */}
        <div className="p-4 border-t border-theme-border bg-theme-card/60 text-center text-xs text-theme-text-muted">
          {authMode === 'register' ? (
            <span>
              Bạn đã có tài khoản hoặc 12 từ khóa khôi phục?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login_recovery');
                  setErrorMessage(null);
                }}
                className="text-theme-accent font-semibold hover:underline cursor-pointer"
              >
                Đăng nhập / Khôi phục ngay
              </button>
            </span>
          ) : (
            <span>
              Bạn là người dùng mới?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setStep(1);
                  setErrorMessage(null);
                }}
                className="text-theme-accent font-semibold hover:underline cursor-pointer"
              >
                Tạo kho lưu trữ mới miễn phí
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
