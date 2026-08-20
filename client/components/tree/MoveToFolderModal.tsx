import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  Check, 
  HardDrive, 
  CornerDownRight, 
  FileText 
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { TreeStateManager } from '../../lib/tree/tree-state-manager';
import { TreeNode } from '../../lib/tree/types';

export interface MoveToFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: TreeNode | null;
  treeManager: TreeStateManager;
  onMoveSuccess?: ((itemId: string, targetFolderId: string | null) => void) | undefined;
}

export const MoveToFolderModal: React.FC<MoveToFolderModalProps> = ({
  isOpen,
  onClose,
  item,
  treeManager,
  onMoveSuccess
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Set initial selected folder to current parent when modal opens
  useEffect(() => {
    if (isOpen && item) {
      setSelectedFolderId(item.parentId || null);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  // Retrieve all non-trash folders
  const allFolders = treeManager.getAllItems().filter(
    i => i.type === 'folder' && !i.isTrash
  );

  // Helper to build hierarchy for rendering
  const getNestedFolders = (parentId: string | null, depth = 0): Array<{ id: string; name: string; depth: number }> => {
    const list = allFolders.filter(f => f.parentId === parentId);
    let result: Array<{ id: string; name: string; depth: number }> = [];
    for (const f of list) {
      // Disallow moving a folder into itself or its own descendant
      if (item.type === 'folder' && (f.id === item.id || treeManager.isDescendantOf(f.id, item.id))) {
        continue;
      }
      result.push({ id: f.id, name: f.name, depth });
      result = result.concat(getNestedFolders(f.id, depth + 1));
    }
    return result;
  };

  const folderList = getNestedFolders(null);

  const handleConfirmMove = () => {
    if (!item) return;
    try {
      treeManager.moveItem(item.id, selectedFolderId);
      if (onMoveSuccess) {
        onMoveSuccess(item.id, selectedFolderId);
      }
      onClose();
    } catch (err: any) {
      alert(err.message || 'Không thể di chuyển tài liệu.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Di Chuyển Tài Liệu / Thư Mục"
      maxWidth="md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="primary" onClick={handleConfirmMove}>
            <CornerDownRight className="w-4 h-4 mr-1" />
            Di Chuyển Đến Đây
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3 select-none">
        {/* Item Info Banner */}
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-theme-bg-subtle border border-theme-border text-xs">
          {item.type === 'folder' ? (
            <Folder className="w-4 h-4 text-theme-accent shrink-0" />
          ) : (
            <FileText className="w-4 h-4 text-theme-accent shrink-0" />
          )}
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-theme-text truncate">{item.name}</span>
            <span className="text-[11px] text-theme-text-muted">
              {item.type === 'folder' ? 'Thư mục' : 'Tài liệu'} đang chọn để di chuyển
            </span>
          </div>
        </div>

        <p className="text-xs text-theme-text-muted">
          Chọn thư mục đích bạn muốn chuyển đến:
        </p>

        {/* Folder List Picker */}
        <div className="flex flex-col gap-1 max-h-60 overflow-y-auto p-1 border border-theme-border rounded-xl bg-theme-card">
          {/* Root Vault Option */}
          <button
            type="button"
            onClick={() => setSelectedFolderId(null)}
            className={`flex items-center justify-between p-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
              selectedFolderId === null
                ? 'bg-theme-accent text-white font-semibold shadow-xs'
                : 'hover:bg-theme-bg-subtle text-theme-text'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <HardDrive className="w-4 h-4 shrink-0 opacity-80" />
              <span className="truncate">📁 Kho Lưu Trữ Gốc (Thư mục chính)</span>
            </div>
            {selectedFolderId === null && <Check className="w-4 h-4 shrink-0" />}
          </button>

          {/* Nested Folders */}
          {folderList.map(({ id, name, depth }) => {
            const isSelected = selectedFolderId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedFolderId(id)}
                style={{ paddingLeft: `${Math.max(10, depth * 16 + 10)}px` }}
                className={`flex items-center justify-between p-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                  isSelected
                    ? 'bg-theme-accent text-white font-semibold shadow-xs'
                    : 'hover:bg-theme-bg-subtle text-theme-text'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Folder className="w-4 h-4 shrink-0 opacity-80" />
                  <span className="truncate">{name}</span>
                </div>
                {isSelected && <Check className="w-4 h-4 shrink-0" />}
              </button>
            );
          })}

          {folderList.length === 0 && (
            <div className="p-4 text-center text-xs text-theme-text-muted">
              Chưa có thư mục con nào. Tài liệu sẽ được lưu tại Kho Lưu Trữ Gốc.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
