import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Star, 
  Trash2, 
  HardDrive,
  X
} from 'lucide-react';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { TreeView } from '../tree/TreeView';
import { TreeStateManager } from '../../lib/tree/tree-state-manager';

export interface LeftSidebarProps {
  isOpen: boolean;
  onClose?: (() => void) | undefined;
  activeDocId: string;
  onSelectDoc: (id: string) => void;
  onExportDoc?: ((docId: string, docTitle: string) => void) | undefined;
  onShareFolder?: ((folderId: string, folderTitle: string) => void) | undefined;
  treeManager?: TreeStateManager | undefined;
  onOpenCommandPalette?: (() => void) | undefined;
  onOpenJoinRoomModal?: (() => void) | undefined;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  isOpen,
  onClose,
  activeDocId,
  onSelectDoc,
  onExportDoc,
  onShareFolder,
  treeManager: externalTreeManager,
  onOpenCommandPalette,
  onOpenJoinRoomModal
}) => {
  const [treeManager] = useState(() => externalTreeManager || new TreeStateManager());
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFilter, setViewFilter] = useState<'all' | 'favorites' | 'trash'>('all');
  const [counts, setCounts] = useState({
    all: 0,
    favorites: 0,
    trash: 0
  });

  const updateCounts = () => {
    const all = treeManager.getAllItems().filter(i => i.type === 'document' && !i.isTrash).length;
    const favorites = treeManager.getFavoriteItems().length;
    const trash = treeManager.getTrashItems().length;
    setCounts({ all, favorites, trash });
  };

  useEffect(() => {
    updateCounts();
    const unobserve = treeManager.observe(() => {
      updateCounts();
    });
    return () => unobserve();
  }, [treeManager]);

  if (!isOpen) return null;

  return (
    <aside className="w-72 max-w-[85vw] max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:shadow-2xl md:w-64 md:relative bg-theme-bg-subtle border-r border-theme-border flex flex-col shrink-0 select-none h-full transition-all duration-200">
      {/* Workspace Header & Switcher */}
      <div className="p-3 border-b border-theme-border flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden min-w-0">
          <div className="w-6 h-6 rounded bg-theme-accent-subtle text-theme-accent flex items-center justify-center text-xs font-bold font-mono shrink-0">
            V
          </div>
          <span className="font-semibold text-xs text-theme-text truncate">Engineering Vault</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="outline" size="sm">CRDT</Badge>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="md:hidden h-7 w-7 text-theme-text-muted hover:text-theme-text"
              title="Đóng thanh điều hướng"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Quick Search Trigger */}
      <div className="p-3 border-b border-theme-border">
        <div 
          onClick={onOpenCommandPalette}
          className="cursor-pointer"
        >
          <Input
            placeholder="Tìm kiếm tài liệu... (Cmd+K)"
            value={searchQuery}
            readOnly={Boolean(onOpenCommandPalette)}
            onChange={(e) => setSearchQuery(e.target.value)}
            prefixIcon={<Search className="w-3.5 h-3.5" />}
          />
        </div>
      </div>

      {/* Quick Filter Navigation */}
      <div className="px-2 py-2 border-b border-theme-border flex flex-col gap-0.5 text-xs text-theme-text-secondary">
        <button 
          onClick={() => setViewFilter('all')}
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors cursor-pointer ${
            viewFilter === 'all' 
              ? 'bg-theme-card-hover text-theme-text font-medium' 
              : 'hover:bg-theme-card-hover text-theme-text-secondary hover:text-theme-text'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-theme-accent" />
            <span>Tất cả ghi chú</span>
          </div>
          <span className="text-[10px] font-mono text-theme-text-muted">{counts.all}</span>
        </button>

        <button 
          onClick={() => setViewFilter('favorites')}
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors cursor-pointer ${
            viewFilter === 'favorites' 
              ? 'bg-theme-card-hover text-theme-text font-medium' 
              : 'hover:bg-theme-card-hover text-theme-text-secondary hover:text-theme-text'
          }`}
        >
          <div className="flex items-center gap-2">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Yêu thích</span>
          </div>
          <span className="text-[10px] font-mono text-theme-text-muted">{counts.favorites}</span>
        </button>

        <button 
          onClick={() => setViewFilter('trash')}
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors cursor-pointer ${
            viewFilter === 'trash' 
              ? 'bg-theme-card-hover text-theme-text font-medium' 
              : 'hover:bg-theme-card-hover text-theme-text-secondary hover:text-theme-text'
          }`}
        >
          <div className="flex items-center gap-2">
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Thùng rác</span>
          </div>
          <span className="text-[10px] font-mono text-theme-text-muted">{counts.trash}</span>
        </button>

        {/* Join Shared Room Quick Trigger */}
        {onOpenJoinRoomModal && (
          <button 
            onClick={onOpenJoinRoomModal}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors cursor-pointer hover:bg-theme-card-hover text-emerald-600 dark:text-emerald-400 mt-1 border border-emerald-500/20 bg-emerald-500/5"
            title="Nhập mã phòng rút gọn hoặc liên kết để cộng tác (Ctrl+J)"
          >
            <div className="flex items-center gap-2">
              <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-semibold text-xs">Tham gia phòng</span>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">Ctrl J</span>
          </button>
        )}
      </div>

      {/* Main Drag & Drop Tree View */}
      <div className="flex-1 overflow-y-auto p-1 flex flex-col">
        <TreeView
          treeManager={treeManager}
          activeDocId={activeDocId}
          onSelectDoc={onSelectDoc}
          onExportDoc={onExportDoc}
          onShareFolder={onShareFolder}
          searchQuery={searchQuery}
          viewFilter={viewFilter}
        />
      </div>

      {/* Footer Storage Stats */}
      <div className="p-3 border-t border-theme-border bg-theme-card/60 flex items-center justify-between text-[11px] text-theme-text-muted">
        <div className="flex items-center gap-1.5">
          <HardDrive className="w-3.5 h-3.5 text-theme-accent" />
          <span>Mã hóa IndexedDB</span>
        </div>
        <span className="font-mono text-emerald-600 dark:text-emerald-400">100% E2EE</span>
      </div>
    </aside>
  );
};
