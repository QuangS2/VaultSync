import React from 'react';
import { 
  FolderTree, 
  Plus, 
  MessageSquare, 
  MoreHorizontal
} from 'lucide-react';

export interface MobileBottomNavBarProps {
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
  onCreateNewNote: () => void;
  onOpenMobileMenu: () => void;
  isLeftSidebarOpen: boolean;
  isRightSidebarOpen: boolean;
  hasUnreadDiscussion?: boolean | undefined;
  activeDocCount?: number | undefined;
}

export const MobileBottomNavBar: React.FC<MobileBottomNavBarProps> = ({
  onToggleLeftSidebar,
  onToggleRightSidebar,
  onCreateNewNote,
  onOpenMobileMenu,
  isLeftSidebarOpen,
  isRightSidebarOpen,
  hasUnreadDiscussion,
  activeDocCount
}) => {
  // Hide bottom navigation bar when discussion panel is open to avoid blocking chat input
  if (isRightSidebarOpen) return null;

  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 h-14 bg-theme-bg/95 backdrop-blur-xl border-t border-theme-border flex items-center justify-around z-40 select-none px-3 shadow-lg">
      {/* 1. Files / Tree Drawer Trigger */}
      <button
        onClick={onToggleLeftSidebar}
        title="Danh sách tài liệu"
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer relative ${
          isLeftSidebarOpen ? 'text-theme-accent font-semibold' : 'text-theme-text-muted hover:text-theme-text'
        }`}
      >
        <FolderTree className="w-4 h-4" />
        <span className="text-[10px] mt-0.5 font-medium">Tài liệu</span>
        {activeDocCount !== undefined && activeDocCount > 0 && (
          <span className="absolute top-0 right-4 text-[9px] px-1 bg-theme-border rounded-full font-mono">
            {activeDocCount}
          </span>
        )}
      </button>

      {/* 2. Primary Center FAB: Create New Note */}
      <div className="flex items-center justify-center flex-1">
        <button
          onClick={onCreateNewNote}
          title="Tạo ghi chú bảo mật mới"
          className="w-10 h-10 rounded-full bg-theme-accent text-white flex items-center justify-center shadow-md hover:bg-theme-accent-hover active:scale-95 transition-all -translate-y-2 cursor-pointer ring-4 ring-theme-bg"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* 3. Discussions & Chat Trigger */}
      <button
        onClick={onToggleRightSidebar}
        title="Thảo luận & Bình luận"
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer relative ${
          isRightSidebarOpen ? 'text-theme-accent font-semibold' : 'text-theme-text-muted hover:text-theme-text'
        }`}
      >
        <MessageSquare className="w-4 h-4" />
        <span className="text-[10px] mt-0.5 font-medium">Thảo luận</span>
        {hasUnreadDiscussion && !isRightSidebarOpen && (
          <span className="absolute top-0.5 right-4 w-2 h-2 rounded-full bg-rose-500 ring-1 ring-theme-bg animate-pulse shadow-xs" />
        )}
      </button>

      {/* 4. Mobile More Menu / Settings Trigger */}
      <button
        onClick={onOpenMobileMenu}
        title="Tùy chọn tài khoản & Giao diện"
        className="flex flex-col items-center justify-center flex-1 py-1 text-theme-text-muted hover:text-theme-text transition-colors cursor-pointer"
      >
        <MoreHorizontal className="w-4 h-4" />
        <span className="text-[10px] mt-0.5 font-medium">Tùy chọn</span>
      </button>
    </nav>
  );
};
