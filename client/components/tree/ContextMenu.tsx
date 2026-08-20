import React, { useEffect, useRef } from 'react';
import { 
  FolderPlus, 
  FilePlus, 
  Edit3, 
  Copy, 
  Trash2, 
  Download, 
  Star, 
  Link2, 
  FolderOpen, 
  FolderClosed,
  RotateCw
} from 'lucide-react';
import { TreeNode } from '../../lib/tree/types';
import { Share2, RotateCcw } from 'lucide-react';

export interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  targetItem: TreeNode | null;
  isRootContext?: boolean | undefined;
  onClose: () => void;
  onRename?: ((item: TreeNode) => void) | undefined;
  onDuplicate?: ((item: TreeNode) => void) | undefined;
  onCreateDoc?: ((parentId: string | null) => void) | undefined;
  onCreateFolder?: ((parentId: string | null) => void) | undefined;
  onToggleFavorite?: ((item: TreeNode) => void) | undefined;
  onDelete?: ((item: TreeNode) => void) | undefined;
  onExport?: ((item: TreeNode) => void) | undefined;
  onCopyLink?: ((item: TreeNode) => void) | undefined;
  onExpandAll?: (() => void) | undefined;
  onCollapseAll?: (() => void) | undefined;
  onRefresh?: (() => void) | undefined;
  onToggleExpandBranch?: ((folderId: string) => void) | undefined;
  onShareFolder?: ((folder: TreeNode) => void) | undefined;
  onRestore?: ((item: TreeNode) => void) | undefined;
  onPermanentDelete?: ((item: TreeNode) => void) | undefined;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  position,
  targetItem,
  isRootContext = false,
  onClose,
  onRename,
  onDuplicate,
  onCreateDoc,
  onCreateFolder,
  onToggleFavorite,
  onDelete,
  onExport,
  onCopyLink,
  onExpandAll,
  onCollapseAll,
  onRefresh,
  onToggleExpandBranch,
  onShareFolder,
  onRestore,
  onPermanentDelete
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Use window listener for global click/escape detection
    window.addEventListener('pointerdown', handlePointerDown, { capture: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Viewport Boundary Guard Calculation
  const menuWidth = 220;
  const menuHeight = isRootContext ? 180 : (targetItem?.type === 'folder' ? 240 : 250);
  const padding = 8;

  let left = position.x;
  let top = position.y;

  if (typeof window !== 'undefined') {
    if (left + menuWidth > window.innerWidth - padding) {
      left = Math.max(padding, window.innerWidth - menuWidth - padding);
    }
    if (top + menuHeight > window.innerHeight - padding) {
      top = Math.max(padding, window.innerHeight - menuHeight - padding);
    }
  }

  const handleAction = (callback?: () => void) => {
    if (callback) {
      callback();
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{ top: `${top}px`, left: `${left}px` }}
      className="fixed z-50 min-w-[210px] bg-theme-bg-subtle/95 backdrop-blur-md border border-theme-border rounded-lg shadow-xl py-1 text-xs text-theme-text select-none animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Root / Empty Area Context Menu */}
      {isRootContext && (
        <div className="flex flex-col">
          <div className="px-3 py-1 text-[10px] font-semibold text-theme-text-muted uppercase tracking-wider">
            Không Gian Làm Việc
          </div>
          <button
            onClick={() => handleAction(() => onCreateDoc?.(null))}
            className="flex items-center justify-between px-3 py-1.5 hover:bg-theme-card-hover text-theme-text hover:text-theme-accent transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <FilePlus className="w-3.5 h-3.5 text-theme-accent" />
              <span>Tạo tài liệu mới</span>
            </div>
            <span className="text-[10px] font-mono text-theme-text-muted">⌘N</span>
          </button>

          <button
            onClick={() => handleAction(() => onCreateFolder?.(null))}
            className="flex items-center justify-between px-3 py-1.5 hover:bg-theme-card-hover text-theme-text hover:text-theme-accent transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <FolderPlus className="w-3.5 h-3.5 text-amber-500" />
              <span>Tạo thư mục mới</span>
            </div>
          </button>

          <div className="h-px bg-theme-border my-1" />

          <button
            onClick={() => handleAction(() => onExpandAll?.())}
            className="flex items-center justify-between px-3 py-1.5 hover:bg-theme-card-hover text-theme-text-secondary hover:text-theme-text transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="w-3.5 h-3.5 text-theme-text-muted" />
              <span>Mở rộng tất cả</span>
            </div>
          </button>

          <button
            onClick={() => handleAction(() => onCollapseAll?.())}
            className="flex items-center justify-between px-3 py-1.5 hover:bg-theme-card-hover text-theme-text-secondary hover:text-theme-text transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <FolderClosed className="w-3.5 h-3.5 text-theme-text-muted" />
              <span>Thu gọn tất cả</span>
            </div>
          </button>

          <div className="h-px bg-theme-border my-1" />

          <button
            onClick={() => handleAction(() => onRefresh?.())}
            className="flex items-center justify-between px-3 py-1.5 hover:bg-theme-card-hover text-theme-text-secondary hover:text-theme-text transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <RotateCw className="w-3.5 h-3.5 text-theme-text-muted" />
              <span>Làm mới danh sách</span>
            </div>
          </button>
        </div>
      )}

      {/* 2. Trashed Item Context Menu (When item is in Trash) */}
      {!isRootContext && targetItem && targetItem.isTrash && (
        <div className="flex flex-col">
          <div className="px-3 py-1 text-[10px] font-semibold text-theme-text-muted truncate max-w-[200px]">
            🗑️ {targetItem.name} (Thùng rác)
          </div>

          <button
            onClick={() => handleAction(() => onRestore?.(targetItem))}
            className="flex items-center justify-between px-3 py-1.5 hover:bg-theme-card-hover text-emerald-600 dark:text-emerald-400 transition-colors text-left cursor-pointer font-medium"
          >
            <div className="flex items-center gap-2">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi phục {targetItem.type === 'folder' ? 'thư mục' : 'tài liệu'}</span>
            </div>
          </button>

          <div className="h-px bg-theme-border my-1" />

          <button
            onClick={() => handleAction(() => onPermanentDelete?.(targetItem))}
            className="flex items-center justify-between px-3 py-1.5 hover:bg-rose-500/10 text-rose-500 transition-colors text-left cursor-pointer font-medium"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Xóa vĩnh viễn</span>
            </div>
            <span className="text-[10px] font-mono text-rose-400">Shift+Del</span>
          </button>
        </div>
      )}

      {/* 3. Folder Context Menu (Active) */}
      {!isRootContext && targetItem && targetItem.type === 'folder' && !targetItem.isTrash && (
        <div className="flex flex-col">
          <div className="px-3 py-1 text-[10px] font-semibold text-theme-text-muted truncate max-w-[200px]">
            📁 {targetItem.name}
          </div>

          <button
            onClick={() => handleAction(() => onCreateDoc?.(targetItem.id))}
            className="flex items-center justify-between px-3 py-1.5 hover:bg-theme-card-hover text-theme-text hover:text-theme-accent transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <FilePlus className="w-3.5 h-3.5 text-theme-accent" />
              <span>Tạo tài liệu con</span>
            </div>
          </button>

          <button
            onClick={() => handleAction(() => onCreateFolder?.(targetItem.id))}
            className="flex items-center justify-between px-3 py-1.5 hover:bg-theme-card-hover text-theme-text hover:text-theme-accent transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <FolderPlus className="w-3.5 h-3.5 text-amber-500" />
              <span>Tạo thư mục con</span>
            </div>
          </button>

          <button
            onClick={() => handleAction(() => onShareFolder?.(targetItem))}
            className="flex items-center justify-between px-3 py-1.5 hover:bg-theme-card-hover text-emerald-600 dark:text-emerald-400 font-medium transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Share2 className="w-3.5 h-3.5" />
              <span>Chia sẻ thư mục...</span>
            </div>
          </button>

          <div className="h-px bg-theme-border my-1" />

          <button
            onClick={() => handleAction(() => onRename?.(targetItem))}
            className="flex items-center justify-between px-3 py-1.5 hover:bg-theme-card-hover text-theme-text-secondary hover:text-theme-text transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Edit3 className="w-3.5 h-3.5 text-theme-text-muted" />
              <span>Đổi tên thư mục</span>
            </div>
            <span className="text-[10px] font-mono text-theme-text-muted">F2</span>
          </button>

          <button
            onClick={() => handleAction(() => onDuplicate?.(targetItem))}
            className="flex items-center justify-between px-3 py-1.5 hover:bg-theme-card-hover text-theme-text-secondary hover:text-theme-text transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Copy className="w-3.5 h-3.5 text-theme-text-muted" />
              <span>Nhân bản thư mục</span>
            </div>
            <span className="text-[10px] font-mono text-theme-text-muted">⌘D</span>
          </button>

          <button
            onClick={() => handleAction(() => onToggleExpandBranch?.(targetItem.id))}
            className="flex items-center justify-between px-3 py-1.5 hover:bg-theme-card-hover text-theme-text-secondary hover:text-theme-text transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {targetItem.isExpanded ? (
                <FolderClosed className="w-3.5 h-3.5 text-theme-text-muted" />
              ) : (
                <FolderOpen className="w-3.5 h-3.5 text-theme-text-muted" />
              )}
              <span>{targetItem.isExpanded ? 'Thu gọn nhánh này' : 'Mở rộng nhánh này'}</span>
            </div>
          </button>

          <button
            onClick={() => handleAction(() => onToggleFavorite?.(targetItem))}
            className="flex items-center justify-between px-3 py-1.5 hover:bg-theme-card-hover text-theme-text-secondary hover:text-theme-text transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Star className={`w-3.5 h-3.5 ${targetItem.isFavorite ? 'text-amber-500 fill-amber-500' : 'text-theme-text-muted'}`} />
              <span>{targetItem.isFavorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}</span>
            </div>
          </button>

          <div className="h-px bg-theme-border my-1" />

          <button
            onClick={() => handleAction(() => onDelete?.(targetItem))}
            className="flex items-center justify-between px-3 py-1.5 hover:bg-rose-500/10 text-rose-500 transition-colors text-left cursor-pointer font-medium"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Chuyển vào thùng rác</span>
            </div>
            <span className="text-[10px] font-mono text-rose-400">Del</span>
          </button>
        </div>
      )}

      {/* 4. Document Context Menu (Active) */}
      {!isRootContext && targetItem && targetItem.type === 'document' && !targetItem.isTrash && (
        <div className="flex flex-col">
          <div className="px-3 py-1 text-[10px] font-semibold text-theme-text-muted truncate max-w-[200px]">
            📄 {targetItem.name}
          </div>

          <button
            onClick={() => handleAction(() => onRename?.(targetItem))}
            className="flex items-center justify-between px-3 py-1.5 hover:bg-theme-card-hover text-theme-text hover:text-theme-accent transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Edit3 className="w-3.5 h-3.5 text-theme-accent" />
              <span>Đổi tên tài liệu</span>
            </div>
            <span className="text-[10px] font-mono text-theme-text-muted">F2</span>
          </button>

          <button
            onClick={() => handleAction(() => onDuplicate?.(targetItem))}
            className="flex items-center justify-between px-3 py-1.5 hover:bg-theme-card-hover text-theme-text-secondary hover:text-theme-text transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Copy className="w-3.5 h-3.5 text-theme-text-muted" />
              <span>Nhân bản tài liệu</span>
            </div>
            <span className="text-[10px] font-mono text-theme-text-muted">⌘D</span>
          </button>

          <button
            onClick={() => handleAction(() => onCreateDoc?.(targetItem.parentId))}
            className="flex items-center justify-between px-3 py-1.5 hover:bg-theme-card-hover text-theme-text-secondary hover:text-theme-text transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <FilePlus className="w-3.5 h-3.5 text-theme-text-muted" />
              <span>Tạo tài liệu cùng cấp</span>
            </div>
          </button>

          <div className="h-px bg-theme-border my-1" />

          <button
            onClick={() => handleAction(() => onToggleFavorite?.(targetItem))}
            className="flex items-center justify-between px-3 py-1.5 hover:bg-theme-card-hover text-theme-text-secondary hover:text-theme-text transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Star className={`w-3.5 h-3.5 ${targetItem.isFavorite ? 'text-amber-500 fill-amber-500' : 'text-theme-text-muted'}`} />
              <span>{targetItem.isFavorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}</span>
            </div>
          </button>

          <button
            onClick={() => handleAction(() => onCopyLink?.(targetItem))}
            className="flex items-center justify-between px-3 py-1.5 hover:bg-theme-card-hover text-theme-text-secondary hover:text-theme-text transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Link2 className="w-3.5 h-3.5 text-theme-text-muted" />
              <span>Sao chép ID tài liệu</span>
            </div>
          </button>

          <button
            onClick={() => handleAction(() => onExport?.(targetItem))}
            className="flex items-center justify-between px-3 py-1.5 hover:bg-theme-card-hover text-theme-text-secondary hover:text-theme-text transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Xuất tài liệu...</span>
            </div>
          </button>

          <div className="h-px bg-theme-border my-1" />

          <button
            onClick={() => handleAction(() => onDelete?.(targetItem))}
            className="flex items-center justify-between px-3 py-1.5 hover:bg-rose-500/10 text-rose-500 transition-colors text-left cursor-pointer font-medium"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Chuyển vào thùng rác</span>
            </div>
            <span className="text-[10px] font-mono text-rose-400">Del</span>
          </button>
        </div>
      )}
    </div>
  );
};
