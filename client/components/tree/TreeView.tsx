import React, { useState, useEffect } from 'react';
import { TreeNodeItem } from './TreeNodeItem';
import { TreeStateManager } from '../../lib/tree/tree-state-manager';
import { TreeNode } from '../../lib/tree/types';
import { FolderPlus, FilePlus } from 'lucide-react';

export interface TreeViewProps {
  treeManager: TreeStateManager;
  activeDocId: string;
  onSelectDoc: (docId: string) => void;
  searchQuery?: string;
  className?: string;
}

const STORAGE_KEY = 'vaultsync_expanded_folders';

export const TreeView: React.FC<TreeViewProps> = ({
  treeManager,
  activeDocId,
  onSelectDoc,
  searchQuery = '',
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

  const refreshTree = () => {
    setTreeNodes(treeManager.getTree(expandedFolders));
  };

  useEffect(() => {
    refreshTree();
    const unobserve = treeManager.observe(() => {
      refreshTree();
    });
    return () => unobserve();
  }, [expandedFolders]);

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

  const handleCreateDoc = (parentId: string | null = null) => {
    const newDoc = treeManager.createItem('Tài liệu mới', 'document', parentId);
    onSelectDoc(newDoc.id);
    if (parentId) {
      setExpandedFolders(prev => new Set(prev).add(parentId));
    }
  };

  const handleCreateFolder = (parentId: string | null = null) => {
    const newFolder = treeManager.createItem('Thư mục mới', 'folder', parentId);
    setExpandedFolders(prev => new Set(prev).add(newFolder.id));
  };

  const handleMoveItem = (draggedId: string, targetParentId: string | null) => {
    try {
      treeManager.moveItem(draggedId, targetParentId);
      refreshTree();
    } catch (err: any) {
      console.warn('Cannot move item:', err.message);
    }
  };

  // Root level drop handler (to move items to root parentId: null)
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

  // Filter nodes if search is active
  const filteredNodes = React.useMemo(() => {
    if (!searchQuery.trim()) return treeNodes;
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

    return filterFn(treeNodes);
  }, [treeNodes, searchQuery]);

  return (
    <div className={`flex flex-col flex-1 overflow-y-auto select-none ${className}`}>
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
        </div>
      </div>

      {/* Tree Nodes List */}
      <div 
        className={`flex flex-col gap-0.5 flex-1 p-1 min-h-[120px] transition-colors rounded-lg ${
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
            onToggleExpand={handleToggleExpand}
            onSelectDoc={onSelectDoc}
            onCreateDoc={handleCreateDoc}
            onCreateFolder={handleCreateFolder}
            onMoveItem={handleMoveItem}
            isDescendantOf={(c, a) => treeManager.isDescendantOf(c, a)}
          />
        ))}

        {filteredNodes.length === 0 && (
          <div className="p-4 text-center text-xs text-theme-text-muted">
            Không tìm thấy tài liệu hoặc thư mục nào.
          </div>
        )}
      </div>
    </div>
  );
};
