import React, { useState } from 'react';
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
  Wifi,
  WifiOff,
  RefreshCw,
  Users,
  Search,
  Settings,
  LogOut
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AppTheme } from '../../App';
import { ProviderConnectionStatus, AwarenessUser } from '../../lib/yjs/types';
import { OnlineCollaboratorsPopover } from './OnlineCollaboratorsPopover';

export interface HeaderBarProps {
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  isLeftSidebarOpen: boolean;
  onToggleLeftSidebar: () => void;
  isRightSidebarOpen: boolean;
  onToggleRightSidebar: () => void;
  onOpenShareModal: () => void;
  onOpenExportModal: () => void;
  onOpenCommandPalette?: (() => void) | undefined;
  onOpenSettingsModal?: (() => void) | undefined;
  onLockVault?: (() => void) | undefined;
  activeCollaboratorCount?: number | undefined;
  providerStatus?: ProviderConnectionStatus | undefined;
  awarenessUsers?: AwarenessUser[] | undefined;
  currentUser?: AwarenessUser | undefined;
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
  onOpenCommandPalette,
  onOpenSettingsModal,
  onLockVault,
  activeCollaboratorCount,
  providerStatus,
  awarenessUsers = [],
  currentUser
}) => {
  const [isCollaboratorsOpen, setIsCollaboratorsOpen] = useState(false);

  const isConnected = providerStatus?.connected ?? false;
  const isConnecting = providerStatus?.connecting ?? false;
  
  const uniqueUsers = React.useMemo(() => {
    const map = new Map<string, AwarenessUser>();
    for (const u of awarenessUsers) {
      if (u.name) map.set(u.name, u);
    }
    return Array.from(map.values());
  }, [awarenessUsers]);

  const onlineCount = uniqueUsers.length > 0 ? uniqueUsers.length : (activeCollaboratorCount ?? 1);

  return (
    <header className="h-12 border-b border-theme-border bg-theme-bg/80 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between z-10 select-none relative">
      {/* 1. Left Section: Sidebar Toggle & Brand Identity */}
      <div className="flex items-center gap-2.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleLeftSidebar}
          title={isLeftSidebarOpen ? 'Thu gọn thanh bên (Ctrl+B)' : 'Mở thanh bên (Ctrl+B)'}
          className="text-theme-text-secondary h-8 w-8"
        >
          <PanelLeft className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-2">
          <div className="w-6.5 h-6.5 rounded-md bg-theme-accent text-white flex items-center justify-center shadow-xs">
            <Lock className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-theme-text hidden sm:inline">VaultSync</span>
          <Badge variant="accent" size="sm" className="hidden lg:inline-flex text-[10px] py-0 px-1.5">
            Bảo Mật Riêng Tư
          </Badge>
        </div>
      </div>

      {/* 2. Center Section: Quick Search Command Bar & Status Badge */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Spotlight Command Search Trigger */}
        {onOpenCommandPalette && (
          <button
            onClick={onOpenCommandPalette}
            title="Tìm kiếm nhanh hoặc thực hiện lệnh (Ctrl+K)"
            className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-theme-card hover:bg-theme-card-hover border border-theme-border text-xs text-theme-text-muted hover:text-theme-text transition-all shadow-xs cursor-pointer w-48 lg:w-64 justify-between"
          >
            <span className="flex items-center gap-1.5 truncate">
              <Search className="w-3.5 h-3.5 text-theme-text-muted shrink-0" />
              <span className="truncate">Tìm kiếm & Lệnh...</span>
            </span>
            <kbd className="px-1.5 py-0.2 text-[10px] font-mono bg-theme-bg rounded border border-theme-border text-theme-text-muted shrink-0">
              Ctrl K
            </kbd>
          </button>
        )}

        {/* Security Pill Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden lg:inline">Bảo Vệ Đầu-Cuối</span>
        </div>

        {/* Live WebSocket Online Collaborators Trigger */}
        <button
          onClick={() => setIsCollaboratorsOpen(!isCollaboratorsOpen)}
          title="Xem danh sách thành viên trực tuyến"
          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-theme-card hover:bg-theme-card-hover border border-theme-border text-[11px] text-theme-text-muted transition-colors cursor-pointer"
        >
          {isConnected ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <Wifi className="w-3 h-3 text-emerald-500" />
              <span className="hidden sm:inline">Đã đồng bộ •</span>
              <span>{onlineCount} online</span>
              <Users className="w-3 h-3 ml-0.5 text-theme-accent" />
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
              <span>Ngoại tuyến</span>
            </>
          )}
        </button>
      </div>

      {/* 3. Right Section: Action Controls & User Menu */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Share Button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenShareModal}
          className="text-theme-text-secondary border-theme-border hover:text-theme-text h-8 px-2.5"
          title="Chia sẻ quyền truy cập tài liệu"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Chia Sẻ</span>
        </Button>

        {/* Export Button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenExportModal}
          className="text-theme-text-secondary border-theme-border hover:text-theme-text h-8 px-2.5"
          title="Xuất file tài liệu hoặc sao lưu kho"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Xuất File</span>
        </Button>

        {/* Settings Button */}
        {onOpenSettingsModal && (
          <Button
            variant="secondary"
            size="icon"
            onClick={onOpenSettingsModal}
            className="text-theme-text-secondary border-theme-border hover:text-theme-text h-8 w-8"
            title="Cài đặt kho lưu trữ (Settings)"
          >
            <Settings className="w-3.5 h-3.5" />
          </Button>
        )}

        <div className="h-4 w-px bg-theme-border mx-0.5 sm:mx-1 hidden sm:block" />

        {/* 3-Tier Theme Switcher */}
        <div className="flex items-center bg-theme-card p-0.5 rounded-lg border border-theme-border shadow-xs">
          <button
            onClick={() => onThemeChange('sun')}
            title="Chế độ Kem Sữa (Sun Mode - Alt+1)"
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              theme === 'sun' ? 'bg-theme-bg-subtle text-amber-600 shadow-xs' : 'text-theme-text-muted hover:text-theme-text'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onThemeChange('cloud')}
            title="Chế độ Mây Trắng Xám (Cloud Mode - Alt+2)"
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              theme === 'cloud' ? 'bg-theme-bg-subtle text-sky-500 shadow-xs' : 'text-theme-text-muted hover:text-theme-text'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onThemeChange('night')}
            title="Chế độ Đêm Huyền Bí (Night Mode - Alt+3)"
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              theme === 'night' ? 'bg-theme-bg-subtle text-indigo-400 shadow-xs' : 'text-theme-text-muted hover:text-theme-text'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-4 w-px bg-theme-border mx-0.5 sm:mx-1" />

        {/* Quick Lock Vault Button */}
        {onLockVault && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onLockVault}
            title="Khóa kho lưu trữ tức thì (Ctrl+Shift+L)"
            className="text-theme-text-muted hover:text-red-500 h-8 w-8"
          >
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        )}

        {/* Discussion Panel Toggle Button */}
        <Button
          variant={isRightSidebarOpen ? 'primary' : 'secondary'}
          size="icon"
          onClick={onToggleRightSidebar}
          title={isRightSidebarOpen ? 'Đóng Thảo luận (Ctrl+Shift+D)' : 'Mở Thảo luận (Ctrl+Shift+D)'}
          className="relative h-8 w-8"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full" />
        </Button>
      </div>

      {/* Online Collaborators Popover */}
      <OnlineCollaboratorsPopover
        isOpen={isCollaboratorsOpen}
        onClose={() => setIsCollaboratorsOpen(false)}
        users={uniqueUsers}
        currentUser={currentUser}
      />
    </header>
  );
};
