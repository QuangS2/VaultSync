/**
 * Hierarchical File System & Tree State Types for VaultSync
 * Backed by Yjs CRDTs for real-time collaborative directory synchronization.
 */

export type FileSystemItemType = 'document' | 'folder';

export interface FileSystemItem {
  id: string;
  parentId: string | null; // null for root items
  name: string;
  type: FileSystemItemType;
  icon?: string | undefined;
  isFavorite?: boolean | undefined;
  isTrash?: boolean | undefined;
  trashedAt?: number | undefined;
  createdAt: number;
  updatedAt: number;
  order: number;
}

export interface TreeNode extends FileSystemItem {
  children?: TreeNode[];
  depth: number;
  isExpanded?: boolean;
}

export type ContextMenuTargetType = 'document' | 'folder' | 'root';

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface TreeValidationResult {
  allPassed: boolean;
  treeHierarchyPass: boolean;
  cyclePreventionPass: boolean;
  recursiveDeletePass: boolean;
  concurrentReorderPass: boolean;
  details: string[];
}

