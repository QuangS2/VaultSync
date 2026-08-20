import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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
  LogOut,
  MoreVertical,
  X,
  ChevronRight
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
  hasUnreadDiscussion?: boolean | undefined;
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
  currentUser,
  hasUnreadDiscussion
}) => {
  const [isCollaboratorsOpen, setIsCollaboratorsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isConnected = providerStatus?.connected ?? false;
  const isConnecting = providerStatus?.connecting ?? false;
  
  // Handle Escape key to close mobile menu
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  const uniqueUsers = React.useMemo(() => {
    const map = new Map<string, AwarenessUser>();
    for (const u of awarenessUsers) {
      if (u.name) map.set(u.name, u);
    }
    return Array.from(map.values());
  }, [awarenessUsers]);

  const onlineCount = uniqueUsers.length > 0 ? uniqueUsers.length : (activeCollaboratorCount ?? 1);

  return (
    <header className="h-12 border-b border-theme-border bg-theme-bg/80 backdrop-blur-md px-2 sm:px-4 flex items-center justify-between z-20 select-none relative flex-nowrap gap-1 sm:gap-2">
      {/* 1. Left Section: Sidebar Toggle & Brand Identity */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleLeftSidebar}
          title={isLeftSidebarOpen ? 'Thu gọn thanh bên (Ctrl+B)' : 'Mở thanh bên (Ctrl+B)'}
          className="text-theme-text-secondary h-8 w-8 shrink-0"
        >
          <PanelLeft className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-6.5 h-6.5 rounded-md bg-theme-accent text-white flex items-center justify-center shadow-xs shrink-0">
            <Lock className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-theme-text hidden sm:inline">VaultSync</span>
          <Badge variant="accent" size="sm" className="hidden lg:inline-flex text-[10px] py-0 px-1.5">
            Bảo Mật Riêng Tư
          </Badge>
        </div>
      </div>

      {/* 2. Center Section: Quick Search Command Bar & Status Badge */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
        {/* Spotlight Command Search Trigger */}
        {onOpenCommandPalette && (
          <button
            onClick={onOpenCommandPalette}
            title="Tìm kiếm nhanh hoặc thực hiện lệnh (Ctrl+K)"
            className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-theme-card hover:bg-theme-card-hover border border-theme-border text-xs text-theme-text-muted hover:text-theme-text transition-all shadow-xs cursor-pointer w-36 lg:w-56 justify-between shrink-0"
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
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Bảo Vệ Đầu-Cuối</span>
        </div>

        {/* Live WebSocket Online Collaborators Trigger */}
        <button
          onClick={() => setIsCollaboratorsOpen(!isCollaboratorsOpen)}
          title="Xem danh sách thành viên trực tuyến"
          className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 rounded-md bg-theme-card hover:bg-theme-card-hover border border-theme-border text-[11px] text-theme-text-muted transition-colors cursor-pointer shrink-0"
        >
          {isConnected ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <Wifi className="w-3 h-3 text-emerald-500 shrink-0" />
              <span className="hidden sm:inline">Đã đồng bộ •</span>
              <span>{onlineCount} online</span>
              <Users className="w-3 h-3 ml-0.5 text-theme-accent shrink-0 hidden sm:inline" />
            </>
          ) : isConnecting ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping shrink-0" />
              <RefreshCw className="w-3 h-3 text-amber-500 animate-spin shrink-0" />
              <span>Đang kết nối lại...</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
              <WifiOff className="w-3 h-3 text-slate-400 shrink-0" />
              <span>Ngoại tuyến</span>
            </>
          )}
        </button>
      </div>

      {/* 3. Right Section: Action Controls & User Menu */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Desktop Action Controls (>= 640px) */}
        <div className="hidden sm:flex items-center gap-1 sm:gap-1.5">
          {/* Share Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenShareModal}
            className="text-theme-text-secondary border-theme-border hover:text-theme-text h-8 px-2 sm:px-2.5 shrink-0"
            title="Chia sẻ quyền truy cập tài liệu"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline ml-1">Chia Sẻ</span>
          </Button>

          {/* Export Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenExportModal}
            className="text-theme-text-secondary border-theme-border hover:text-theme-text h-8 px-2 sm:px-2.5 shrink-0"
            title="Xuất file tài liệu hoặc sao lưu kho"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline ml-1">Xuất File</span>
          </Button>

          {/* Settings Button */}
          {onOpenSettingsModal && (
            <Button
              variant="secondary"
              size="icon"
              onClick={onOpenSettingsModal}
              className="text-theme-text-secondary border-theme-border hover:text-theme-text h-8 w-8 shrink-0"
              title="Cài đặt kho lưu trữ (Settings)"
            >
              <Settings className="w-3.5 h-3.5" />
            </Button>
          )}

          <div className="h-4 w-px bg-theme-border mx-0.5 shrink-0" />

          {/* 3-Tier Theme Switcher */}
          <div className="flex items-center bg-theme-card p-0.5 rounded-lg border border-theme-border shadow-xs shrink-0">
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

          <div className="h-4 w-px bg-theme-border mx-0.5 shrink-0" />

          {/* Quick Lock Vault Button */}
          {onLockVault && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onLockVault}
              title="Khóa kho lưu trữ tức thì (Ctrl+Shift+L)"
              className="text-theme-text-muted hover:text-red-500 h-8 w-8 shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* Mobile Quick Actions Menu Trigger (< 640px) */}
        <div className="flex sm:hidden items-center gap-1">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setIsMobileMenuOpen(true)}
            title="Tùy chọn nhanh & Đăng xuất"
            className="text-theme-text h-8 w-8 shrink-0"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>

        {/* Discussion Panel Toggle Button (Always visible on mobile & desktop) */}
        <Button
          variant={isRightSidebarOpen ? 'primary' : 'secondary'}
          size="icon"
          onClick={onToggleRightSidebar}
          title={isRightSidebarOpen ? 'Đóng Thảo luận (Ctrl+Shift+D)' : 'Mở Thảo luận (Ctrl+Shift+D)'}
          className="relative h-8 w-8 shrink-0 cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {hasUnreadDiscussion && !isRightSidebarOpen && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-theme-bg animate-pulse shadow-sm" />
          )}
        </Button>
      </div>

      {/* Online Collaborators Popover */}
      <OnlineCollaboratorsPopover
        isOpen={isCollaboratorsOpen}
        onClose={() => setIsCollaboratorsOpen(false)}
        users={uniqueUsers}
        currentUser={currentUser}
      />

      {/* Mobile Quick Action Bottom Sheet Drawer (< 640px) */}
      {isMobileMenuOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-end sm:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Sheet Body */}
          <div className="relative w-full bg-theme-bg border-t border-theme-border rounded-t-2xl p-4 pb-6 shadow-2xl z-10 flex flex-col gap-3 animate-in slide-in-from-bottom duration-200">
            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-2 border-b border-theme-border">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-theme-accent text-white flex items-center justify-center text-xs font-bold">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold text-sm text-theme-text">Tùy Chọn & Tài Khoản</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded-md text-theme-text-muted hover:text-theme-text cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 3-Tier Theme Switcher Row */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-theme-text-muted">Chế độ giao diện:</span>
              <div className="grid grid-cols-3 gap-2 bg-theme-card p-1.5 rounded-xl border border-theme-border">
                <button
                  onClick={() => onThemeChange('sun')}
                  className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 text-xs font-medium transition-all cursor-pointer ${
                    theme === 'sun' ? 'bg-amber-500/15 text-amber-600 border border-amber-500/30 font-semibold' : 'text-theme-text-muted'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Kem Sữa</span>
                </button>
                <button
                  onClick={() => onThemeChange('cloud')}
                  className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 text-xs font-medium transition-all cursor-pointer ${
                    theme === 'cloud' ? 'bg-sky-500/15 text-sky-500 border border-sky-500/30 font-semibold' : 'text-theme-text-muted'
                  }`}
                >
                  <Cloud className="w-4 h-4 text-sky-500" />
                  <span>Mây Trắng</span>
                </button>
                <button
                  onClick={() => onThemeChange('night')}
                  className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 text-xs font-medium transition-all cursor-pointer ${
                    theme === 'night' ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 font-semibold' : 'text-theme-text-muted'
                  }`}
                >
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span>Đêm Tối</span>
                </button>
              </div>
            </div>

            {/* Quick Action Buttons List */}
            <div className="flex flex-col gap-1.5 pt-1">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenShareModal();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-theme-card hover:bg-theme-card-hover border border-theme-border text-xs font-medium text-theme-text transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Share2 className="w-4 h-4 text-theme-accent" />
                  <span>Chia Sẻ Quyền Truy Cập (Mã phòng & Link)</span>
                </div>
                <ChevronRight className="w-4 h-4 text-theme-text-muted" />
              </button>

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenExportModal();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-theme-card hover:bg-theme-card-hover border border-theme-border text-xs font-medium text-theme-text transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Download className="w-4 h-4 text-emerald-500" />
                  <span>Xuất File & Sao Lưu Kho (.md, .html, .vault)</span>
                </div>
                <ChevronRight className="w-4 h-4 text-theme-text-muted" />
              </button>

              {onOpenSettingsModal && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenSettingsModal();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-theme-card hover:bg-theme-card-hover border border-theme-border text-xs font-medium text-theme-text transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Settings className="w-4 h-4 text-theme-text-secondary" />
                    <span>Cài Đặt Kho Lưu Trữ (Settings)</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-theme-text-muted" />
                </button>
              )}
            </div>

            {/* Prominent Red Lock Vault / Logout Button */}
            {onLockVault && (
              <div className="pt-2 border-t border-theme-border">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLockVault();
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Khóa Kho Lưu Trữ (Đăng Xuất Ngay)</span>
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </header>
  );
};
