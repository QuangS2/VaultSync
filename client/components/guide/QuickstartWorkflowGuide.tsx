import React, { useState } from 'react';
import {
  FileText,
  Share2,
  Sparkles,
  MessageSquare,
  Command,
  ChevronDown,
  ChevronUp,
  X,
  Lock,
  ArrowRight,
  Plus
} from 'lucide-react';
import { Button } from '../ui/Button';

export interface QuickstartWorkflowGuideProps {
  onCreateNote: () => void;
  onOpenShare: () => void;
  onOpenDiscussions: () => void;
  onOpenCommandPalette: () => void;
  forceVisible?: boolean | undefined;
  onClose?: (() => void) | undefined;
}

const STORAGE_KEY = 'vaultsync_quickstart_dismissed';

export const QuickstartWorkflowGuide: React.FC<QuickstartWorkflowGuideProps> = ({
  onCreateNote,
  onOpenShare,
  onOpenDiscussions,
  onOpenCommandPalette,
  forceVisible = false,
  onClose
}) => {
  const [isDismissed, setIsDismissed] = useState(() => {
    if (forceVisible) return false;
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    }
    return false;
  });
  const [isExpanded, setIsExpanded] = useState(true);

  if (isDismissed && !forceVisible) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    if (onClose) onClose();
  };

  return (
    <div className="mb-4 sm:mb-6 rounded-2xl border border-theme-border bg-theme-card/70 backdrop-blur-md shadow-xs p-3 sm:p-5 transition-all animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-theme-border/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-theme-accent/15 text-theme-accent flex items-center justify-center shrink-0 shadow-xs border border-theme-accent/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-theme-text flex items-center gap-2">
              <span className="truncate">Chào mừng đến với VaultSync</span>
              <span className="hidden sm:inline-flex text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono shrink-0 whitespace-nowrap">
                Zero-Knowledge E2EE
              </span>
            </h3>
            <p className="text-xs text-theme-text-muted truncate">
              Hệ thống ghi chép & cộng tác bảo mật riêng tư tuyệt đối trên mọi thiết bị
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Thu gọn hướng dẫn' : 'Mở rộng hướng dẫn'}
            className="p-1.5 rounded-lg text-theme-text-muted hover:text-theme-text hover:bg-theme-bg transition-colors cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDismiss}
            title="Đóng hướng dẫn"
            className="p-1.5 rounded-lg text-theme-text-muted hover:text-theme-text hover:bg-theme-bg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Workflow Cards */}
      {isExpanded && (
        <div className="pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Use Case 1: Ghi Chú Bảo Mật */}
            <div className="p-3.5 rounded-xl bg-theme-bg/80 border border-theme-border flex flex-col justify-between gap-3 group hover:border-theme-accent/40 transition-colors">
              <div className="space-y-1.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <h4 className="text-xs font-bold text-theme-text flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-500" />
                  Ghi Chú Bảo Mật Riêng Tư
                </h4>
                <p className="text-[11px] text-theme-text-muted leading-relaxed">
                  Soạn thảo Markdown, bảng biểu, danh sách việc cần làm. Dữ liệu tự động mã hóa AES-256 trên thiết bị của bạn.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={onCreateNote}
                className="w-full gap-1.5 text-xs text-theme-accent hover:text-white hover:bg-theme-accent"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo ghi chú mới</span>
              </Button>
            </div>

            {/* Use Case 2: Cộng Tác & Bình Luận */}
            <div className="p-3.5 rounded-xl bg-theme-bg/80 border border-theme-border flex flex-col justify-between gap-3 group hover:border-theme-accent/40 transition-colors">
              <div className="space-y-1.5">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <h4 className="text-xs font-bold text-theme-text flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                  Bình Luận & Thảo Luận Live
                </h4>
                <p className="text-[11px] text-theme-text-muted leading-relaxed">
                  Bôi đen đoạn văn bản trong trình soạn thảo để mở luồng bình luận nội dòng hoặc chat trực tiếp trong phòng cộng tác.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenDiscussions}
                className="w-full gap-1.5 text-xs text-blue-600 hover:text-white hover:bg-blue-600 dark:text-blue-400"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Mở thảo luận & chat</span>
              </Button>
            </div>

            {/* Use Case 3: Chia Sẻ & Quét QR */}
            <div className="p-3.5 rounded-xl bg-theme-bg/80 border border-theme-border flex flex-col justify-between gap-3 group hover:border-theme-accent/40 transition-colors">
              <div className="space-y-1.5">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <h4 className="text-xs font-bold text-theme-text flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-purple-500" />
                  Chia Sẻ Mã QR & Passcode
                </h4>
                <p className="text-[11px] text-theme-text-muted leading-relaxed">
                  Chia sẻ tài liệu cho đồng nghiệp hoặc liên kết điện thoại di động qua mã QR SVG hoặc Passcode tự mã hóa <code className="text-[10px] bg-theme-card px-1 py-0.5 rounded">VS-KEY:...</code>.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenShare}
                className="w-full gap-1.5 text-xs text-purple-600 hover:text-white hover:bg-purple-600 dark:text-purple-400"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Chia sẻ & Quét QR</span>
              </Button>
            </div>
          </div>

          {/* Bottom Quick Hint Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 text-[11px] text-theme-text-muted bg-theme-bg/50 px-3 py-2 rounded-xl border border-theme-border/50">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              Khóa khôi phục 12 từ BIP-39 giúp bạn đăng nhập và phục hồi kho trên bất kỳ thiết bị mới nào.
            </span>
            <button
              onClick={onOpenCommandPalette}
              className="flex items-center gap-1 text-theme-accent hover:underline font-medium cursor-pointer shrink-0"
            >
              <Command className="w-3 h-3" />
              <span>Phím tắt & Lệnh (Ctrl+K)</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
