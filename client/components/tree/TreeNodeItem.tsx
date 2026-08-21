import React, { useState, useRef, useEffect } from 'react';
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  FilePlus, 
  FolderPlus, 
  Sparkles,
  MoreVertical,
  GripVertical,
  Star
} from 'lucide-react';
import { TreeNode } from '../../lib/tree/types';
import { DocumentPermissions } from '../../lib/auth/permissions';

export interface TreeNodeItemProps {
  node: TreeNode;
  activeDocId: string;
  isExpanded: boolean;
  renamingItemId: string | null;
  permissions?: DocumentPermissions | undefined;
  onToggleExpand: (folderId: string) => void;
  onSelectDoc: (docId: string) => void;
  onCreateDoc: (parentId: string | null) => void;
  onCreateFolder: (parentId: string | null) => void;
  onMoveItem: (draggedId: string, targetParentId: string | null) => void;
  isDescendantOf: (candidateChildId: string, ancestorId: string) => boolean;
  onContextMenu: (e: React.MouseEvent, node: TreeNode) => void;
  onRenameSubmit: (id: string, newName: string) => void;
  onRenameCancel: () => void;
  onStartRename: (id: string) => void;
  hasUnread?: boolean | undefined;
  unreadDocIds?: string[] | undefined;
}

export const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
  node,
  activeDocId,
  isExpanded,
  renamingItemId,
  permissions,
  onToggleExpand,
  onSelectDoc,
  onCreateDoc,
  onCreateFolder,
  onMoveItem,
  isDescendantOf,
  onContextMenu,
  onRenameSubmit,
  onRenameCancel,
  onStartRename,
  hasUnread,
  unreadDocIds
}) => {
  const isOwner = !permissions || permissions.role === 'owner';
  const canEdit = isOwner || Boolean(permissions?.canEdit);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isInvalidDrop, setIsInvalidDrop] = useState(false);
  const [editName, setEditName] = useState(node.name);

  const inputRef = useRef<HTMLInputElement>(null);
  const isFolder = node.type === 'folder';
  const isActive = node.id === activeDocId;
  const isRenaming = renamingItemId === node.id;

  // Auto focus & select text when entering rename mode
  useEffect(() => {
    if (isRenaming) {
      setEditName(node.name);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 20);
    }
  }, [isRenaming, node.name]);

  const handleFinishRename = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== node.name) {
      onRenameSubmit(node.id, trimmed);
    } else {
      onRenameCancel();
    }
  };

  const handleKeyDownRename = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleFinishRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setEditName(node.name);
      onRenameCancel();
    }
  };

  // --- Drag & Drop Handlers ---
  const handleDragStart = (e: React.DragEvent) => {
    if (isRenaming) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', node.id);
    e.dataTransfer.setData('application/vaultsync-item-type', node.type);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // If node is a document, we don't allow dropping inside it
    if (!isFolder) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }

    const draggedId = e.dataTransfer.types.includes('text/plain') ? 'valid' : '';
    if (!draggedId) return;

    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setIsInvalidDrop(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setIsInvalidDrop(false);

    if (!isFolder) return;

    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId || draggedId === node.id) return;

    // Check Cycle Prevention
    if (isDescendantOf(node.id, draggedId)) {
      setIsInvalidDrop(true);
      setTimeout(() => setIsInvalidDrop(false), 2000);
      return;
    }

    onMoveItem(draggedId, node.id);
    if (!isExpanded) {
      onToggleExpand(node.id);
    }
  };

  const handleItemContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, node);
  };

  const handleMoreButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, node);
  };

  if (isFolder) {
    return (
      <div 
        className="flex flex-col select-none"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Folder Header Row */}
        <div 
          draggable={!isRenaming && canEdit}
          onDragStart={handleDragStart}
          onContextMenu={handleItemContextMenu}
          className={`group flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer ${
            isDragOver 
              ? 'bg-theme-accent-subtle/80 border border-theme-accent shadow-xs' 
              : isInvalidDrop 
              ? 'bg-rose-500/20 border border-rose-500 text-rose-600' 
              : 'hover:bg-theme-card-hover text-theme-text border border-transparent'
          }`}
        >
          <div 
            onClick={() => !isRenaming && onToggleExpand(node.id)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (canEdit) onStartRename(node.id);
            }}
            className="flex items-center gap-1.5 overflow-hidden flex-1 text-left"
          >
            <span className="text-theme-text-muted hover:text-theme-text shrink-0 p-0.5">
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </span>

            {isExpanded ? (
              <FolderOpen className="w-3.5 h-3.5 text-theme-accent shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-theme-accent shrink-0" />
            )}

            {isRenaming ? (
              <input
                ref={inputRef}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleFinishRename}
                onKeyDown={handleKeyDownRename}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-theme-bg px-1.5 py-0.5 text-xs font-medium text-theme-text rounded border border-theme-accent focus:outline-none shadow-xs"
              />
            ) : (
              <span className="truncate flex-1">{node.name}</span>
            )}

            {node.isFavorite && (
              <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
            )}
          </div>

          {/* Folder Actions (Quick Create & Item Count & More Menu) */}
          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            {canEdit && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateDoc(node.id);
                  }}
                  title="Tạo tài liệu con"
                  className="p-0.5 rounded hover:bg-theme-bg text-theme-text-muted hover:text-theme-text cursor-pointer"
                >
                  <FilePlus className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateFolder(node.id);
                  }}
                  title="Tạo thư mục con"
                  className="p-0.5 rounded hover:bg-theme-bg text-theme-text-muted hover:text-theme-text cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                </button>
              </>
            )}
            <button
              onClick={handleMoreButtonClick}
              title="Thao tác khác"
              className="p-0.5 rounded hover:bg-theme-bg text-theme-text-muted hover:text-theme-text cursor-pointer"
            >
              <MoreVertical className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
            </button>
            <span className="text-[10px] font-mono text-theme-text-muted px-0.5">
              {node.children?.length ?? 0}
            </span>
          </div>
        </div>

        {/* Nested Children */}
        {isExpanded && node.children && (
          <div className="ml-3 pl-2 border-l border-theme-border flex flex-col gap-0.5 mt-0.5">
            {node.children.map(child => (
              <TreeNodeItem
                key={child.id}
                node={child}
                activeDocId={activeDocId}
                isExpanded={child.isExpanded ?? false}
                renamingItemId={renamingItemId}
                permissions={permissions}
                onToggleExpand={onToggleExpand}
                onSelectDoc={onSelectDoc}
                onCreateDoc={onCreateDoc}
                onCreateFolder={onCreateFolder}
                onMoveItem={onMoveItem}
                isDescendantOf={isDescendantOf}
                onContextMenu={onContextMenu}
                onRenameSubmit={onRenameSubmit}
                onRenameCancel={onRenameCancel}
                onStartRename={onStartRename}
                hasUnread={unreadDocIds?.includes(child.id)}
                unreadDocIds={unreadDocIds}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Document Item
  return (
    <div
      draggable={!isRenaming && canEdit}
      onDragStart={handleDragStart}
      onContextMenu={handleItemContextMenu}
      onClick={() => !isRenaming && onSelectDoc(node.id)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (canEdit) onStartRename(node.id);
      }}
      className={`group flex items-center justify-between px-2 py-1 rounded-md text-xs transition-colors cursor-pointer select-none ${
        isActive 
          ? 'bg-theme-accent-subtle text-theme-accent font-medium' 
          : 'text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover'
      }`}
    >
      <div className="flex items-center gap-2 overflow-hidden flex-1">
        <GripVertical className="w-3 h-3 text-theme-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-grab" />
        {node.icon === 'Sparkles' ? (
          <Sparkles className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-theme-accent' : 'text-amber-500'}`} />
        ) : (
          <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-theme-accent' : 'text-theme-text-muted'}`} />
        )}

        {isRenaming ? (
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleFinishRename}
            onKeyDown={handleKeyDownRename}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-theme-bg px-1.5 py-0.5 text-xs font-normal text-theme-text rounded border border-theme-accent focus:outline-none shadow-xs"
          />
        ) : (
          <span className="truncate flex-1">{node.name}</span>
        )}

        {node.isFavorite && (
          <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
        )}

        {(hasUnread || unreadDocIds?.includes(node.id)) && !isActive && (
          <span 
            className="w-2 h-2 rounded-full bg-rose-500 shrink-0 ml-auto mr-1 shadow-xs animate-pulse" 
            title="Có thảo luận hoặc tin nhắn mới" 
          />
        )}
      </div>

      <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-theme-text-muted flex items-center">
        <button
          onClick={handleMoreButtonClick}
          title="Tùy chọn thao tác"
          className="p-0.5 rounded hover:bg-theme-bg text-theme-text-muted hover:text-theme-text cursor-pointer"
        >
          <MoreVertical className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
        </button>
      </div>
    </div>
  );
};
