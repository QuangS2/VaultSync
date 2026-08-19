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
  Sparkles
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { VaultAuthEngine } from '../../lib/auth/vault-auth-engine';
import { UnlockedVaultSession } from '../../lib/auth/types';

export interface VaultOnboardingModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onVaultCreated: (session: UnlockedVaultSession) => void;
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
  onVaultCreated
}) => {
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

  // Submission state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Generate 12-word seed phrase when moving to step 3
  const generateNewSeedPhrase = async () => {
    try {
      setIsGeneratingPhrase(true);
      const phrase = await VaultAuthEngine.generateRecoveryPhrase();
      setRecoveryPhrase(phrase);
    } catch (err: any) {
      setErrorMessage(`Lỗi sinh khóa khôi phục: ${err.message}`);
    } finally {
      setIsGeneratingPhrase(false);
    }
  };

  useEffect(() => {
    if (isOpen && step === 3 && !recoveryPhrase) {
      generateNewSeedPhrase();
    }
  }, [isOpen, step, recoveryPhrase]);

  const passwordStrength = VaultAuthEngine.evaluatePasswordStrength(password);

  const handleNextToPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMessage('Vui lòng nhập Tên hiển thị của bạn.');
      return;
    }
    setErrorMessage(null);
    setStep(2);
  };

  const handleNextToRecovery = (e: React.FormEvent) => {
    e.preventDefault();
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
    if (!recoveryPhrase) {
      generateNewSeedPhrase();
    }
  };

  const handleCopyPhrase = () => {
    if (recoveryPhrase) {
      navigator.clipboard?.writeText(recoveryPhrase);
      setCopiedPhrase(true);
      setTimeout(() => setCopiedPhrase(false), 2500);
    }
  };

  const handleDownloadBackupFile = () => {
    if (!recoveryPhrase) return;
    const content = [
      `=== VAULTSYNC ZERO-KNOWLEDGE RECOVERY BACKUP ===`,
      `Kho Lưu Trữ: ${vaultName}`,
      `Chủ Sở Hữu: ${displayName}`,
      `Thời Gian Tạo: ${new Date().toISOString()}`,
      ``,
      `12 TỪ KHÓA KHÔI PHỤC BÍ MẬT (BIP-39 RECOVERY PHRASE):`,
      recoveryPhrase,
      ``,
      `CẢNH BÁO QUAN TRỌNG:`,
      `- Tuyệt đối KHÔNG chia sẻ 12 từ khóa này cho bất kỳ ai.`,
      `- Bất kỳ ai có 12 từ này đều có thể giải mã và khôi phục toàn bộ kho ghi chú của bạn.`,
      `- Lưu trữ tệp này ở nơi ngoại tuyến an toàn (USB mã hóa hoặc in ra giấy).`
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VaultSync-Recovery-${vaultName.toLowerCase().replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadedPhrase(true);
  };

  const handleFinalSubmit = async () => {
    if (!hasSavedRecovery) {
      setErrorMessage('Vui lòng tích xác nhận bạn đã lưu 12 từ khóa khôi phục trước khi tiếp tục.');
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
      setErrorMessage(`Lỗi tạo kho lưu trữ: ${err.message || 'Không thể hoàn tất khởi tạo'}`);
      setIsLoading(false);
    }
  };

  const strengthColorMap: Record<number, string> = {
    0: 'bg-rose-500',
    1: 'bg-rose-500',
    2: 'bg-amber-500',
    3: 'bg-sky-500',
    4: 'bg-emerald-500'
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose ? onClose : () => {}}
      title="Khởi Tạo Kho Bảo Mật (Zero-Knowledge Onboarding)"
      description="Thiết lập danh tính mật mã cá nhân và tạo Master Key bảo vệ dữ liệu."
      maxWidth="lg"
    >
      <div className="flex flex-col gap-5">
        {/* Step Indicator Wizard */}
        <div className="flex items-center justify-between pb-3 border-b border-theme-border text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === 1
                  ? 'bg-theme-accent text-white'
                  : step > 1
                  ? 'bg-emerald-500 text-white'
                  : 'bg-theme-card text-theme-text-muted border border-theme-border'
              }`}
            >
              {step > 1 ? <Check className="w-3 h-3" /> : '1'}
            </span>
            <span className={`font-medium ${step === 1 ? 'text-theme-text font-semibold' : 'text-theme-text-muted'}`}>
              Định danh
            </span>
          </div>

          <div className="w-8 h-px bg-theme-border" />

          <div className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === 2
                  ? 'bg-theme-accent text-white'
                  : step > 2
                  ? 'bg-emerald-500 text-white'
                  : 'bg-theme-card text-theme-text-muted border border-theme-border'
              }`}
            >
              {step > 2 ? <Check className="w-3 h-3" /> : '2'}
            </span>
            <span className={`font-medium ${step === 2 ? 'text-theme-text font-semibold' : 'text-theme-text-muted'}`}>
              Mật khẩu chủ
            </span>
          </div>

          <div className="w-8 h-px bg-theme-border" />

          <div className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === 3
                  ? 'bg-theme-accent text-white'
                  : 'bg-theme-card text-theme-text-muted border border-theme-border'
              }`}
            >
              3
            </span>
            <span className={`font-medium ${step === 3 ? 'text-theme-text font-semibold' : 'text-theme-text-muted'}`}>
              12 Từ khôi phục
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

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
                  {vaultName.trim() || 'Personal Vault'} • Cặp khóa ECDH P-256
                </p>
              </div>
              <Badge variant="accent" size="sm">Zero-Knowledge</Badge>
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
                Tên này dùng để hiển thị khi bạn cộng tác và bình luận trên tài liệu.
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

        {/* STEP 2: MASTER PASSWORD & PBKDF2 DERIVATION */}
        {step === 2 && (
          <form onSubmit={handleNextToRecovery} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-theme-text">Thiết lập Mật khẩu chủ (Master Passphrase):</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu an toàn của bạn..."
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

            {/* Password Strength Meter */}
            {password.length > 0 && (
              <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-theme-bg border border-theme-border">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-theme-text-muted">Độ mạnh mật khẩu:</span>
                  <span className="font-semibold text-theme-text">{passwordStrength.label}</span>
                </div>
                <div className="h-1.5 w-full bg-theme-bg-subtle rounded-full overflow-hidden flex gap-1">
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className={`h-full flex-1 rounded-full transition-colors ${
                        idx < passwordStrength.score ? strengthColorMap[passwordStrength.score] : 'bg-theme-border'
                      }`}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1.5 mt-1 text-[10px] text-theme-text-muted">
                  <span className={`flex items-center gap-1 ${passwordStrength.hasMinLength ? 'text-emerald-500 font-medium' : ''}`}>
                    {passwordStrength.hasMinLength ? <Check className="w-3 h-3" /> : '•'} Ít nhất 8 ký tự
                  </span>
                  <span className={`flex items-center gap-1 ${passwordStrength.hasUppercase && passwordStrength.hasLowercase ? 'text-emerald-500 font-medium' : ''}`}>
                    {passwordStrength.hasUppercase && passwordStrength.hasLowercase ? <Check className="w-3 h-3" /> : '•'} Chữ hoa & chữ thường
                  </span>
                  <span className={`flex items-center gap-1 ${passwordStrength.hasNumber ? 'text-emerald-500 font-medium' : ''}`}>
                    {passwordStrength.hasNumber ? <Check className="w-3 h-3" /> : '•'} Chứa chữ số (0-9)
                  </span>
                  <span className={`flex items-center gap-1 ${passwordStrength.hasSpecial ? 'text-emerald-500 font-medium' : ''}`}>
                    {passwordStrength.hasSpecial ? <Check className="w-3 h-3" /> : '•'} Ký tự đặc biệt (!@#$)
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-theme-text">Xác nhận lại mật khẩu chủ:</label>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Nhập lại chính xác mật khẩu..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                prefixIcon={<Lock className="w-3.5 h-3.5" />}
              />
            </div>

            {/* Zero-Knowledge Security Notice */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px] flex items-start gap-2.5 leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Nguyên tắc Zero-Knowledge:</strong> Mật khẩu chủ chỉ dùng để dẫn xuất Master Key trực tiếp trong trình duyệt của bạn (PBKDF2 100.000 vòng). Máy chủ không bao giờ nhận hay lưu mật khẩu này.
              </span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" size="md" type="button" onClick={() => setStep(1)}>
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại</span>
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={password.length < 6 || password !== confirmPassword}
              >
                <span>Tiếp tục: 12 Từ khôi phục</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </form>
        )}

        {/* STEP 3: 12-WORD BIP-39 RECOVERY PHRASE */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-theme-text flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-theme-accent" /> 12 Từ Khóa Khôi Phục Bí Mật (BIP-39):
                </p>
                <p className="text-[11px] text-theme-text-muted mt-0.5">
                  Dùng để khôi phục quyền truy cập nếu bạn quên Mật khẩu chủ.
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={generateNewSeedPhrase}
                disabled={isGeneratingPhrase || isLoading}
                className="gap-1 text-[11px]"
                title="Tạo lại bộ từ khóa ngẫu nhiên khác"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingPhrase ? 'animate-spin' : ''}`} />
                <span>Tạo lại</span>
              </Button>
            </div>

            {/* 12-Word Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-3.5 rounded-xl bg-theme-bg border border-theme-border font-mono text-xs select-all">
              {recoveryPhrase.split(' ').map((word, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-1.5 rounded-md bg-theme-card border border-theme-border/60 text-theme-text"
                >
                  <span className="text-[10px] text-theme-text-muted font-sans w-4 text-right">{idx + 1}.</span>
                  <span className="font-semibold text-theme-accent tracking-wide">{word}</span>
                </div>
              ))}
            </div>

            {/* Actions: Copy & Download */}
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyPhrase}
                className="flex-1 gap-1.5 text-xs h-8"
              >
                {copiedPhrase ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPhrase ? 'Đã sao chép 12 từ' : 'Sao chép 12 từ khóa'}</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownloadBackupFile}
                className="flex-1 gap-1.5 text-xs h-8"
              >
                {downloadedPhrase ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Download className="w-3.5 h-3.5" />}
                <span>{downloadedPhrase ? 'Đã tải tệp .txt' : 'Tải tệp sao lưu (.txt)'}</span>
              </Button>
            </div>

            {/* Confirmation Checkbox */}
            <label className="flex items-start gap-2.5 p-3 rounded-lg bg-theme-card border border-theme-border cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasSavedRecovery}
                onChange={(e) => setHasSavedRecovery(e.target.checked)}
                className="mt-0.5 rounded border-theme-border text-theme-accent focus:ring-0 cursor-pointer"
              />
              <span className="text-xs text-theme-text leading-snug">
                Tôi xác nhận đã lưu trữ 12 từ khóa này an toàn. Tôi hiểu rằng VaultSync không thể khôi phục dữ liệu nếu tôi làm mất cả Mật khẩu và 12 từ này.
              </span>
            </label>

            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" size="md" onClick={() => setStep(2)} disabled={isLoading}>
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại</span>
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleFinalSubmit}
                isLoading={isLoading}
                disabled={!hasSavedRecovery || isLoading}
                className="gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Hoàn tất & Mở Kho Lưu Trữ</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
