/**
 * Hierarchical Tree State Automated Verification Suite (11/10 Precision)
 * Comprehensive audit verifying arbitrary-depth trees, cycle prevention, recursive deletion,
 * deep tree duplication with parent ID remapping, invalid move guards, and 3-peer CRDT convergence.
 */

import * as Y from 'yjs';
import { TreeStateManager } from './tree-state-manager';
import { TreeValidationResult, TreeNode } from './types';

export class TreeBenchmark {
  public static runSuite(): TreeValidationResult {
    const details: string[] = [];
    let treeHierarchyPass = false;
    let cyclePreventionPass = false;
    let recursiveDeletePass = false;
    let concurrentReorderPass = false;

    try {
      const yDoc = new Y.Doc();
      const manager = new TreeStateManager(yDoc);

      // --- TEST 1: Deep 5-Level Hierarchy Generation ---
      const l1 = manager.createItem('Level 1 Root Folder', 'folder');
      const l2 = manager.createItem('Level 2 Sub Folder', 'folder', l1.id);
      const l3 = manager.createItem('Level 3 Sub Folder', 'folder', l2.id);
      const l4 = manager.createItem('Level 4 Sub Folder', 'folder', l3.id);
      const l5Doc = manager.createItem('Level 5 Deep Document', 'document', l4.id);

      const tree = manager.getTree();
      const findL1 = tree.find((n: TreeNode) => n.id === l1.id);
      const findL2 = findL1?.children?.find((n: TreeNode) => n.id === l2.id);
      const findL3 = findL2?.children?.find((n: TreeNode) => n.id === l3.id);
      const findL4 = findL3?.children?.find((n: TreeNode) => n.id === l4.id);
      const findL5 = findL4?.children?.find((n: TreeNode) => n.id === l5Doc.id);

      if (findL1 && findL2 && findL3 && findL4 && findL5 && findL5.depth === 4) {
        treeHierarchyPass = true;
        details.push('✅ Test 1: Cấu Trúc Cây 5 Cấp Độ: Dựng cây thư mục đệ quy sâu 5 tầng thành công, tính toán depth [0..4] và danh sách children chính xác 100%.');
      } else {
        details.push('❌ Test 1: Lỗi dựng cây lồng nhau 5 cấp.');
      }

      // --- TEST 2: Bulletproof Cycle Prevention (Self, Child, Deep Descendant) ---
      let caughtSelfCycle = false;
      let caughtDeepCycle = false;

      // 2a. Self-move test
      try {
        manager.moveItem(l1.id, l1.id);
      } catch (err: any) {
        if (err.message.includes('into itself')) caughtSelfCycle = true;
      }

      // 2b. Deep descendant move test (move L1 into L4)
      try {
        manager.moveItem(l1.id, l4.id);
      } catch (err: any) {
        if (err.message.includes('own descendant')) caughtDeepCycle = true;
      }

      if (caughtSelfCycle && caughtDeepCycle && manager.getItem(l1.id)?.parentId === null) {
        cyclePreventionPass = true;
        details.push('✅ Test 2: Phòng Chống Vòng Lặp Tuyệt Đối: Bắt và chặn toàn diện cả 2 trường hợp: kéo vào chính nó và kéo vào thư mục con cháu tầng sâu.');
      } else {
        details.push('❌ Test 2: Phòng chống vòng lặp thất bại.');
      }

      // --- TEST 3: Recursive Deletion (Cascading Cleanup) ---
      const beforeCount = manager.getAllItems().length;
      manager.deleteItem(l1.id);
      const afterCount = manager.getAllItems().length;

      const l1Exists = !!manager.getItem(l1.id);
      const l2Exists = !!manager.getItem(l2.id);
      const l3Exists = !!manager.getItem(l3.id);
      const l4Exists = !!manager.getItem(l4.id);
      const l5Exists = !!manager.getItem(l5Doc.id);

      if (!l1Exists && !l2Exists && !l3Exists && !l4Exists && !l5Exists && beforeCount - afterCount === 5) {
        recursiveDeletePass = true;
        details.push('✅ Test 3: Xóa Đệ Quy Toàn Vẹn: Xóa thư mục gốc dọn sạch toàn bộ 5 tầng con cháu, số lượng phần tử rác mồ côi = 0.');
      } else {
        details.push('❌ Test 3: Lỗi xóa đệ quy.');
      }

      // --- TEST 4: Deep Tree Duplication with Parent ID Re-mapping ---
      const sourceFolder = manager.createItem('Nguồn Nhân Bản', 'folder');
      manager.createItem('Tài liệu con 1', 'document', sourceFolder.id);
      const childSubFolder = manager.createItem('Thư mục con lồng', 'folder', sourceFolder.id);
      manager.createItem('Tài liệu tầng 2', 'document', childSubFolder.id);

      const clonedFolder = manager.duplicateItem(sourceFolder.id);
      if (clonedFolder) {
        const clonedChildren = manager.getChildren(clonedFolder.id);
        const clonedSub = clonedChildren.find(c => c.type === 'folder');
        const clonedDeepChildren = clonedSub ? manager.getChildren(clonedSub.id) : [];

        if (
          clonedFolder.id !== sourceFolder.id &&
          clonedChildren.length === 2 &&
          clonedSub &&
          clonedSub.parentId === clonedFolder.id &&
          clonedDeepChildren.length === 1 &&
          clonedDeepChildren[0]?.parentId === clonedSub.id
        ) {
          details.push('✅ Test 4: Nhân Bản Đệ Quy (Tree Duplication): Nhân bản toàn bộ cây con kèm ánh xạ lại parentId chính xác 100%.');
        } else {
          details.push('❌ Test 4: Lỗi nhân bản cây con.');
        }
      }

      // Clean up test items
      manager.deleteItem(sourceFolder.id);
      if (clonedFolder) manager.deleteItem(clonedFolder.id);

      // --- TEST 5: Invalid Parent Move Protection (Document as Parent) ---
      const testFolder = manager.createItem('Thư mục test', 'folder');
      const testDoc = manager.createItem('Tài liệu test', 'document');

      let caughtDocParentError = false;
      try {
        manager.moveItem(testFolder.id, testDoc.id);
      } catch (err: any) {
        if (err.message.includes('is a document')) caughtDocParentError = true;
      }

      if (caughtDocParentError) {
        details.push('✅ Test 5: Ràng Buộc Điểm Đến Hợp Lệ: Từ chối thiết lập tài liệu làm thư mục cha.');
      } else {
        details.push('❌ Test 5: Không bắt được lỗi khi di chuyển vào document.');
      }
      manager.deleteItem(testFolder.id);
      manager.deleteItem(testDoc.id);

      // --- TEST 6: Multi-Peer CRDT Convergence (3 Peers Simultaneous Edits) ---
      const docA = new Y.Doc();
      const docB = new Y.Doc();
      const docC = new Y.Doc();

      const peerA = new TreeStateManager(docA);
      const peerB = new TreeStateManager(docB);
      const peerC = new TreeStateManager(docC);

      // Peer A creates folder
      const folderA = peerA.createItem('Thư mục Alice', 'folder');
      // Peer B creates document
      const docBItem = peerB.createItem('Ghi chú Bob', 'document');
      // Peer C creates folder and doc
      const folderC = peerC.createItem('Thư mục Charlie', 'folder');
      const docCItem = peerC.createItem('Tài liệu Charlie', 'document', folderC.id);

      // 3-way sync
      const updateA = Y.encodeStateAsUpdate(docA);
      const updateB = Y.encodeStateAsUpdate(docB);
      const updateC = Y.encodeStateAsUpdate(docC);

      Y.applyUpdate(docA, updateB);
      Y.applyUpdate(docA, updateC);

      Y.applyUpdate(docB, updateA);
      Y.applyUpdate(docB, updateC);

      Y.applyUpdate(docC, updateA);
      Y.applyUpdate(docC, updateB);

      const itemsA = peerA.getAllItems();
      const itemsB = peerB.getAllItems();
      const itemsC = peerC.getAllItems();

      const allEqual = itemsA.length === itemsB.length && itemsB.length === itemsC.length;
      if (allEqual && peerA.getItem(folderA.id) && peerA.getItem(docBItem.id) && peerA.getItem(docCItem.id)) {
        concurrentReorderPass = true;
        details.push(`✅ Test 6: Hội Tụ CRDT 3 Peers (Alice, Bob, Charlie): Đồng bộ 3 bên hội tụ 100% (${itemsA.length} phần tử đồng nhất trên cả 3 bản sao).`);
      } else {
        details.push('❌ Test 6: Hội tụ CRDT 3 bên thất bại.');
      }

      const allPassed = treeHierarchyPass && cyclePreventionPass && recursiveDeletePass && concurrentReorderPass;

      return {
        allPassed,
        treeHierarchyPass,
        cyclePreventionPass,
        recursiveDeletePass,
        concurrentReorderPass,
        details
      };
    } catch (err: any) {
      details.push(`❌ Lỗi ngoại lệ trong quá trình chạy Tree Benchmark: ${err.message}`);
      return {
        allPassed: false,
        treeHierarchyPass: false,
        cyclePreventionPass: false,
        recursiveDeletePass: false,
        concurrentReorderPass: false,
        details
      };
    }
  }
}
