import React, { useState, useEffect } from 'react';
import { TreeNodeItem } from './TreeNodeItem';
import { ContextMenu } from './ContextMenu';
import { TreeStateManager } from '../../lib/tree/tree-state-manager';
import { TreeNode } from '../../lib/tree/types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { 
  FolderPlus, 
  FilePlus, 
  AlertTriangle, 
  FolderOpen, 
  FolderClosed
} from 'lucide-react';

export interface TreeViewProps {
  treeManager: TreeStateManager;
  activeDocId: string;
  onSelectDoc: (docId: string) => void;
  onExportDoc?: ((docId: string, docTitle: string) => void) | undefined;
  searchQuery?: string | undefined;
  viewFilter?: ('all' | 'favorites' | 'trash') | undefined;
  className?: string | undefined;
}

const STORAGE_KEY = 'vaultsync_expanded_folders';

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  targetItem: TreeNode | null;
  isRootContext: boolean;
}

interface DeleteModalState {
  isOpen: boolean;
  item: TreeNode | null;
  descendantCount: number;
}

export const TreeView: React.FC<TreeViewProps> = ({
  treeManager,
  activeDocId,
  onSelectDoc,
  onExportDoc,
  searchQuery = '',
  viewFilter = 'all',
  className = ''
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return new Set(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
    return new Set(['folder-core-arch', 'folder-crypto', 'folder-drafts']);
  });

  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [isRootDragOver, setIsRootDragOver] = useState(false);
  const [renamingItemId, setRenamingItemId] = useState<string | null>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    targetItem: null,
    isRootContext: false
  });

  // Delete Confirmation Modal state
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    isOpen: false,
    item: null,
    descendantCount: 0
  });

  const refreshTree = () => {
    setTreeNodes(treeManager.getTree(expandedFolders));
  };

  useEffect(() => {
    refreshTree();
    const unobserve = treeManager.observe(() => {
      refreshTree();
    });
    return () => unobserve();
  }, [expandedFolders, viewFilter]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(expandedFolders)));
    } catch {
      // ignore
    }
  }, [expandedFolders]);

  const handleToggleExpand = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    const allFolderIds = treeManager.getAllFolderIds();
    setExpandedFolders(new Set(allFolderIds));
  };

  const handleCollapseAll = () => {
    setExpandedFolders(new Set());
  };

  const handleCreateDoc = (parentId: string | null = null) => {
    const newDoc = treeManager.createItem('Tài liệu mới', 'document', parentId);
    onSelectDoc(newDoc.id);
    if (parentId) {
      setExpandedFolders(prev => new Set(prev).add(parentId));
    }
    // Start renaming immediately on creation
    setRenamingItemId(newDoc.id);
  };

  const handleCreateFolder = (parentId: string | null = null) => {
    const newFolder = treeManager.createItem('Thư mục mới', 'folder', parentId);
    setExpandedFolders(prev => new Set(prev).add(newFolder.id));
    if (parentId) {
      setExpandedFolders(prev => new Set(prev).add(parentId));
    }
    setRenamingItemId(newFolder.id);
  };

  const handleMoveItem = (draggedId: string, targetParentId: string | null) => {
    try {
      treeManager.moveItem(draggedId, targetParentId);
      refreshTree();
    } catch (err: any) {
      console.warn('Cannot move item:', err.message);
    }
  };

  // --- Inline Rename Handlers ---
  const handleStartRename = (id: string) => {
    setRenamingItemId(id);
  };

  const handleRenameSubmit = (id: string, newName: string) => {
    treeManager.renameItem(id, newName);
    setRenamingItemId(null);
    refreshTree();
  };

  const handleRenameCancel = () => {
    setRenamingItemId(null);
  };

  // --- Context Menu Handlers ---
  const handleItemContextMenu = (e: React.MouseEvent, node: TreeNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      targetItem: node,
      isRootContext: false
    });
  };

  const handleRootContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // Only open if clicking on empty area
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      targetItem: null,
      isRootContext: true
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  };

  // --- Duplicate Handler ---
  const handleDuplicate = (item: TreeNode) => {
    const duplicated = treeManager.duplicateItem(item.id);
    if (duplicated && duplicated.type === 'document') {
      onSelectDoc(duplicated.id);
    }
    refreshTree();
  };

  // --- Favorite Handler ---
  const handleToggleFavorite = (item: TreeNode) => {
    treeManager.toggleFavorite(item.id);
    refreshTree();
  };

  // --- Copy Link / ID Handler ---
  const handleCopyLink = (item: TreeNode) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`[[${item.name}]] (${item.id})`);
    }
  };

  // --- Export Handler ---
  const handleExport = (item: TreeNode) => {
    if (onExportDoc) {
      onExportDoc(item.id, item.name);
    }
  };

  // --- Delete Handlers ---
  const handleDeletePrompt = (item: TreeNode) => {
    const descendantIds = treeManager.getAllDescendantIds(item.id);
    if (item.type === 'folder' && descendantIds.length > 0) {
      setDeleteModal({
        isOpen: true,
        item,
        descendantCount: descendantIds.length
      });
    } else {
      performDelete(item.id);
    }
  };

  const performDelete = (id: string) => {
    treeManager.moveToTrash(id);
    // If active document is deleted, switch active doc
    if (activeDocId === id) {
      const remaining = treeManager.getAllItems().filter(i => i.type === 'document' && !i.isTrash && i.id !== id);
      if (remaining.length > 0 && remaining[0]) {
        onSelectDoc(remaining[0].id);
      }
    }
    setDeleteModal({ isOpen: false, item: null, descendantCount: 0 });
    refreshTree();
  };

  // Root level drop handler
  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsRootDragOver(true);
  };

  const handleRootDragLeave = () => {
    setIsRootDragOver(false);
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsRootDragOver(false);
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId) {
      handleMoveItem(draggedId, null);
    }
  };

  // Filter nodes according to Search & ViewFilter
  const filteredNodes = React.useMemo(() => {
    let baseNodes = treeNodes;

    // View Filter
    if (viewFilter === 'favorites') {
      const favs = treeManager.getFavoriteItems();
      const favIds = new Set(favs.map(f => f.id));
      const filterFav = (nodes: TreeNode[]): TreeNode[] => {
        const res: TreeNode[] = [];
        for (const node of nodes) {
          if (favIds.has(node.id)) {
            res.push(node);
          } else if (node.children) {
            const children = filterFav(node.children);
            if (children.length > 0) {
              res.push({ ...node, isExpanded: true, children });
            }
          }
        }
        return res;
      };
      baseNodes = filterFav(baseNodes);
    }

    // Search Query
    if (!searchQuery.trim()) return baseNodes;
    const query = searchQuery.toLowerCase();

    const filterFn = (nodes: TreeNode[]): TreeNode[] => {
      const res: TreeNode[] = [];
      for (const node of nodes) {
        const matches = node.name.toLowerCase().includes(query);
        const childMatches = node.children ? filterFn(node.children) : undefined;
        if (matches || (childMatches && childMatches.length > 0)) {
          res.push({
            ...node,
            isExpanded: true,
            ...(childMatches !== undefined ? { children: childMatches } : {})
          });
        }
      }
      return res;
    };

    return filterFn(baseNodes);
  }, [treeNodes, searchQuery, viewFilter]);

  return (
    <div 
      className={`flex flex-col flex-1 overflow-y-auto select-none ${className}`}
      onContextMenu={handleRootContextMenu}
    >
      {/* Header controls for creating root items */}
      <div className="flex items-center justify-between px-2 pt-2 pb-1 text-[11px] font-semibold text-theme-text-muted uppercase tracking-wider">
        <span>Không Gian Làm Việc</span>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => handleCreateDoc(null)} 
            title="Tạo tài liệu gốc" 
            className="p-1 rounded hover:bg-theme-card-hover text-theme-text-secondary hover:text-theme-text cursor-pointer"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => handleCreateFolder(null)} 
            title="Tạo thư mục gốc" 
            className="p-1 rounded hover:bg-theme-card-hover text-theme-text-secondary hover:text-theme-text cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={expandedFolders.size > 0 ? handleCollapseAll : handleExpandAll} 
            title={expandedFolders.size > 0 ? "Thu gọn tất cả" : "Mở rộng tất cả"} 
            className="p-1 rounded hover:bg-theme-card-hover text-theme-text-secondary hover:text-theme-text cursor-pointer"
          >
            {expandedFolders.size > 0 ? (
              <FolderClosed className="w-3.5 h-3.5" />
            ) : (
              <FolderOpen className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Tree Nodes List */}
      <div 
        className={`flex flex-col gap-0.5 flex-1 p-1 min-h-[140px] transition-colors rounded-lg ${
          isRootDragOver ? 'bg-theme-accent-subtle/30 border-2 border-dashed border-theme-accent' : ''
        }`}
        onDragOver={handleRootDragOver}
        onDragLeave={handleRootDragLeave}
        onDrop={handleRootDrop}
      >
        {filteredNodes.map(node => (
          <TreeNodeItem
            key={node.id}
            node={node}
            activeDocId={activeDocId}
            isExpanded={expandedFolders.has(node.id)}
            renamingItemId={renamingItemId}
            onToggleExpand={handleToggleExpand}
            onSelectDoc={onSelectDoc}
            onCreateDoc={handleCreateDoc}
            onCreateFolder={handleCreateFolder}
            onMoveItem={handleMoveItem}
            isDescendantOf={(c, a) => treeManager.isDescendantOf(c, a)}
            onContextMenu={handleItemContextMenu}
            onRenameSubmit={handleRenameSubmit}
            onRenameCancel={handleRenameCancel}
            onStartRename={handleStartRename}
          />
        ))}

        {filteredNodes.length === 0 && (
          <div className="p-4 text-center text-xs text-theme-text-muted">
            {viewFilter === 'favorites' 
              ? 'Chưa có tài liệu nào trong mục Yêu thích.' 
              : 'Không tìm thấy tài liệu hoặc thư mục nào.'}
          </div>
        )}
      </div>

      {/* Floating Context Menu */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={{ x: contextMenu.x, y: contextMenu.y }}
        targetItem={contextMenu.targetItem}
        isRootContext={contextMenu.isRootContext}
        onClose={handleCloseContextMenu}
        onRename={(item) => handleStartRename(item.id)}
        onDuplicate={handleDuplicate}
        onCreateDoc={(parentId) => handleCreateDoc(parentId)}
        onCreateFolder={(parentId) => handleCreateFolder(parentId)}
        onToggleFavorite={handleToggleFavorite}
        onDelete={handleDeletePrompt}
        onExport={handleExport}
        onCopyLink={handleCopyLink}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
        onRefresh={refreshTree}
        onToggleExpandBranch={handleToggleExpand}
      />

      {/* Delete Folder & Sub-items Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, item: null, descendantCount: 0 })}
        title="Xác Nhận Xóa Thư Mục"
        description="Thư mục này có chứa các tài liệu hoặc thư mục con bên trong."
        footer={
          <>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setDeleteModal({ isOpen: false, item: null, descendantCount: 0 })}
            >
              Hủy
            </Button>
            <Button 
              variant="danger" 
              size="sm" 
              onClick={() => deleteModal.item && performDelete(deleteModal.item.id)}
            >
              Xóa Toàn Bộ
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3 p-2 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-600 dark:text-rose-400">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="font-semibold">Cảnh báo xóa dữ liệu:</span>
            <span>
              Thư mục <strong>"{deleteModal.item?.name}"</strong> chứa <strong>{deleteModal.descendantCount}</strong> mục con. Toàn bộ nội dung bên trong sẽ được chuyển vào Thùng rác.
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
};
