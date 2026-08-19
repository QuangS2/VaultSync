import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import { TreeStateManager } from '../tree-state-manager';

describe('TreeStateManager — CRDT Hierarchical Workspace Unit Tests', () => {
  it('should initialize default tree structure with root documents and folders', () => {
    const yDoc = new Y.Doc();
    const manager = new TreeStateManager(yDoc);

    const rootItems = manager.getChildren(null);
    expect(rootItems.length).toBeGreaterThanOrEqual(2);

    const allItems = manager.getAllItems();
    expect(allItems.some(item => item.name === 'Ghi Chú Nhanh & Việc Cần Làm')).toBe(true);
    expect(allItems.some(item => item.name === 'Hướng Dẫn Mời Bạn Bè & Cộng Tác')).toBe(true);
  });

  it('should create new folders and child documents cleanly', () => {
    const yDoc = new Y.Doc();
    const manager = new TreeStateManager(yDoc);

    const newFolder = manager.createItem('Bảo Mật Hệ Thống', 'folder', null);
    expect(newFolder.id).toBeDefined();
    expect(newFolder.type).toBe('folder');
    expect(newFolder.parentId).toBeNull();

    const subDoc = manager.createItem('Báo Cáo Audit.md', 'document', newFolder.id);
    expect(subDoc.parentId).toBe(newFolder.id);
    expect(subDoc.type).toBe('document');

    const children = manager.getChildren(newFolder.id);
    expect(children.length).toBe(1);
    expect(children[0]?.id).toBe(subDoc.id);
  });

  it('should rename items and update timestamp', () => {
    const yDoc = new Y.Doc();
    const manager = new TreeStateManager(yDoc);

    const folder = manager.createItem('Old Folder Name', 'folder', null);
    const renamed = manager.renameItem(folder.id, 'New Folder Name');

    expect(renamed).toBe(true);
    expect(manager.getItem(folder.id)?.name).toBe('New Folder Name');
  });

  it('should prevent cycle creation when moving a parent folder into its child folder', () => {
    const yDoc = new Y.Doc();
    const manager = new TreeStateManager(yDoc);

    const parentFolder = manager.createItem('Parent Folder', 'folder', null);
    const childFolder = manager.createItem('Child Folder', 'folder', parentFolder.id);

    // Attempting to move parentFolder into childFolder must throw error
    expect(() => {
      manager.moveItem(parentFolder.id, childFolder.id);
    }).toThrow();
  });

  it('should recursively delete folder and all nested descendants', () => {
    const yDoc = new Y.Doc();
    const manager = new TreeStateManager(yDoc);

    const rootFolder = manager.createItem('Folder To Delete', 'folder', null);
    const nestedDoc1 = manager.createItem('Doc 1', 'document', rootFolder.id);
    const subFolder = manager.createItem('Sub Folder', 'folder', rootFolder.id);
    const nestedDoc2 = manager.createItem('Doc 2', 'document', subFolder.id);

    expect(manager.getItem(rootFolder.id)).toBeDefined();
    expect(manager.getItem(nestedDoc1.id)).toBeDefined();
    expect(manager.getItem(nestedDoc2.id)).toBeDefined();

    // Delete rootFolder recursively
    manager.deleteItem(rootFolder.id);

    expect(manager.getItem(rootFolder.id)).toBeUndefined();
    expect(manager.getItem(nestedDoc1.id)).toBeUndefined();
    expect(manager.getItem(subFolder.id)).toBeUndefined();
    expect(manager.getItem(nestedDoc2.id)).toBeUndefined();
  });

  it('should sync hierarchical file tree changes between Doc A and Doc B', () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();

    const managerA = new TreeStateManager(docA);

    // Create custom item on Doc A
    const customFolder = managerA.createItem('Dự Án Alpha', 'folder', null);

    // Sync state to Doc B
    const update = Y.encodeStateAsUpdate(docA);
    Y.applyUpdate(docB, update);

    const managerB = new TreeStateManager(docB);
    const folderOnB = managerB.getItem(customFolder.id);

    expect(folderOnB).toBeDefined();
    expect(folderOnB?.name).toBe('Dự Án Alpha');
  });
});
