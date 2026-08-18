import React from 'react';
import {
  Lock,
  Sun,
  Cloud,
  Moon,
  Share2,
  MessageSquare,
  PanelLeft,
  ShieldCheck,
  Download,
  Sparkles,
  Cpu
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AppTheme } from '../../App';

export interface HeaderBarProps {
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  isLeftSidebarOpen: boolean;
  onToggleLeftSidebar: () => void;
  isRightSidebarOpen: boolean;
  onToggleRightSidebar: () => void;
  onOpenShareModal: () => void;
  onOpenExportModal: () => void;
  onOpenSandboxModal: () => void;
  onOpenCryptoModal: () => void;
  activeCollaboratorCount?: number;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  theme,
  onThemeChange,
  isLeftSidebarOpen,
  onToggleLeftSidebar,
  isRightSidebarOpen,
  onToggleRightSidebar,
  onOpenShareModal,
  onOpenExportModal,
  onOpenSandboxModal,
  onOpenCryptoModal,
  activeCollaboratorCount = 2
}) => {
  return (
    <header className="h-13 bg-theme-bg-subtle border-b border-theme-border px-4 flex items-center justify-between shrink-0 select-none z-30">
      {/* Left controls: Toggle Sidebar & Workspace Logo */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleLeftSidebar}
          title={isLeftSidebarOpen ? 'Thu gọn Sidebar (Ctrl+B)' : 'Mở Sidebar (Ctrl+B)'}
          className="text-theme-text-secondary"
        >
          <PanelLeft className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-theme-accent text-white flex items-center justify-center shadow-xs">
            <Lock className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-theme-text hidden sm:inline">VaultSync</span>
          <Badge variant="accent" size="sm" className="hidden md:inline-flex">E2EE Workspace</Badge>
        </div>
      </div>

      {/* Center: Security Badge & WebCrypto Playground Trigger */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenCryptoModal}
          title="Mở Trung Tâm Kiểm Thử Mật Mã (WebCrypto Playground)"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-theme-card hover:bg-theme-card-hover border border-theme-border text-xs font-mono transition-colors cursor-pointer"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-theme-text-secondary hidden sm:inline">WebCrypto:</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">AES-NI Verified</span>
        </button>

        <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-md bg-theme-card border border-theme-border text-[11px] text-theme-text-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{activeCollaboratorCount} người online</span>
        </div>
      </div>

      {/* Right Controls: Crypto Test, Sandbox, Share, Export, Theme, and Discussion Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenCryptoModal}
          className="text-theme-text-secondary border-theme-border hover:text-theme-text hidden md:inline-flex"
        >
          <Cpu className="w-3.5 h-3.5 text-theme-accent" />
          <span>Test Crypto</span>
        </Button>

        {/* Recruiter 1-Click Sandbox Demo Button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenSandboxModal}
          className="text-theme-accent border-theme-accent/30 bg-theme-accent-subtle hover:bg-theme-accent-subtle/80 hidden sm:inline-flex"
        >
          <Sparkles className="w-3.5 h-3.5 text-theme-accent" />
          <span>Guest Sandbox</span>
        </Button>

        {/* Share & Export Buttons */}
        <Button variant="ghost" size="icon" onClick={onOpenExportModal} title="Xuất dữ liệu (Markdown, HTML, .vault)">
          <Download className="w-4 h-4 text-theme-text-secondary" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onOpenShareModal} title="Chia sẻ khóa tài liệu (E2EE Key Share)">
          <Share2 className="w-4 h-4 text-theme-text-secondary" />
        </Button>

        {/* 3-Tier Theme Switcher */}
        <div className="flex items-center bg-theme-card p-0.5 rounded-lg border border-theme-border">
          <button
            onClick={() => onThemeChange('sun')}
            title="Chế độ Kem Sữa (Sun)"
            className={`p-1.5 rounded-md transition-colors ${theme === 'sun' ? 'bg-theme-bg-subtle text-amber-600 shadow-xs' : 'text-theme-text-muted hover:text-theme-text'}`}
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onThemeChange('cloud')}
            title="Chế độ Mây Trắng Xám (Cloud)"
            className={`p-1.5 rounded-md transition-colors ${theme === 'cloud' ? 'bg-theme-bg-subtle text-sky-500 shadow-xs' : 'text-theme-text-muted hover:text-theme-text'}`}
          >
            <Cloud className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onThemeChange('night')}
            title="Chế độ Đêm Huyền Bí (Night)"
            className={`p-1.5 rounded-md transition-colors ${theme === 'night' ? 'bg-theme-bg-subtle text-indigo-400 shadow-xs' : 'text-theme-text-muted hover:text-theme-text'}`}
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Toggle Right Discussion Sidebar */}
        <Button
          variant={isRightSidebarOpen ? 'secondary' : 'ghost'}
          size="icon"
          onClick={onToggleRightSidebar}
          title={isRightSidebarOpen ? 'Ẩn bảng thảo luận' : 'Mở bảng thảo luận & Chat'}
          className={isRightSidebarOpen ? 'border-theme-border text-theme-accent' : 'text-theme-text-secondary'}
        >
          <div className="relative">
            <MessageSquare className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-theme-accent" />
          </div>
        </Button>
      </div>
    </header>
  );
};
