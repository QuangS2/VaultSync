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
  Cpu,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AppTheme } from '../../App';
import { ProviderConnectionStatus, AwarenessUser } from '../../lib/yjs/types';

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
  onOpenInspectorModal?: (() => void) | undefined;
  activeCollaboratorCount?: number | undefined;
  providerStatus?: ProviderConnectionStatus | undefined;
  awarenessUsers?: AwarenessUser[] | undefined;
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
  onOpenInspectorModal,
  activeCollaboratorCount,
  providerStatus,
  awarenessUsers = []
}) => {
  const isConnected = providerStatus?.connected ?? false;
  const isConnecting = providerStatus?.connecting ?? false;
  const onlineCount = awarenessUsers.length > 0 ? awarenessUsers.length : (activeCollaboratorCount ?? 1);

  return (
    <header className="h-12 border-b border-theme-border bg-theme-bg/80 backdrop-blur-md px-4 flex items-center justify-between z-10 select-none">
      {/* Left Area: Toggle Sidebar, Logo, Document Status */}
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
          <Badge variant="accent" size="sm" className="hidden md:inline-flex">Không Gian Riêng Tư</Badge>
        </div>
      </div>

      {/* Center: Security Badge & Live Connection Status Indicator */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenInspectorModal || onOpenCryptoModal}
          title="Kiểm tra trạng thái bảo vệ mã hóa"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-mono transition-colors cursor-pointer"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-theme-text-secondary hidden sm:inline">Bảo Vệ:</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Đã Mã Hóa Đầu-Cuối</span>
        </button>

        {/* Live WebSocket Connection Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-md bg-theme-card border border-theme-border text-[11px] text-theme-text-muted">
          {isConnected ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <Wifi className="w-3 h-3 text-emerald-500" />
              <span>Đồng bộ máy chủ • {onlineCount} trực tuyến</span>
            </>
          ) : isConnecting ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              <RefreshCw className="w-3 h-3 text-amber-500 animate-spin" />
              <span>Đang kết nối lại...</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <WifiOff className="w-3 h-3 text-slate-400" />
              <span>Cục bộ (Ngoại tuyến)</span>
            </>
          )}
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
          <span>Kiểm Tra Mã Hóa</span>
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenSandboxModal}
          className="text-theme-text-secondary border-theme-border hover:text-theme-text hidden xl:inline-flex"
          title="Mở Thử Nghiệm 2 Cửa Sổ Alice & Bob (Ctrl+Shift+S)"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Mô Phỏng 2 Người</span>
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenShareModal}
          className="text-theme-text-secondary border-theme-border hover:text-theme-text"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Chia Sẻ</span>
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenExportModal}
          className="text-theme-text-secondary border-theme-border hover:text-theme-text"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Xuất File</span>
        </Button>

        <div className="h-4 w-px bg-theme-border mx-1" />

        {/* 3-Tier Theme Switcher */}
        <div className="flex items-center bg-theme-card p-0.5 rounded-lg border border-theme-border shadow-xs">
          <button
            onClick={() => onThemeChange('sun')}
            title="Chế độ Kem Sữa (Sun Mode - Alt+1)"
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              theme === 'sun' ? 'bg-theme-bg-subtle text-amber-600 shadow-xs' : 'text-theme-text-muted hover:text-theme-text'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onThemeChange('cloud')}
            title="Chế độ Mây Trắng Xám (Cloud Mode - Alt+2)"
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              theme === 'cloud' ? 'bg-theme-bg-subtle text-sky-500 shadow-xs' : 'text-theme-text-muted hover:text-theme-text'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onThemeChange('night')}
            title="Chế độ Đêm Huyền Bí (Night Mode - Alt+3)"
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              theme === 'night' ? 'bg-theme-bg-subtle text-indigo-400 shadow-xs' : 'text-theme-text-muted hover:text-theme-text'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-4 w-px bg-theme-border mx-1" />

        <Button
          variant={isRightSidebarOpen ? 'primary' : 'secondary'}
          size="icon"
          onClick={onToggleRightSidebar}
          title={isRightSidebarOpen ? 'Đóng Thảo luận (Ctrl+Shift+D)' : 'Mở Thảo luận (Ctrl+Shift+D)'}
          className="relative"
        >
          <MessageSquare className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
        </Button>
      </div>
    </header>
  );
};
