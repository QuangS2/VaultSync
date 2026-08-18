/**
 * Yjs Relative Positions & CRDT Anchor Verification Suite
 * Validates immutable relative positions under concurrent insertions, deletions, and network merges.
 */

import * as Y from 'yjs';
import { RelativePositionManager } from './relative-position-manager';
import { CRDTPositionTestResult } from './types';

export class YjsBenchmark {
  /**
   * Executes the full automated validation suite for CRDT Relative Positioning.
   */
  public static runSuite(): CRDTPositionTestResult {
    const details: string[] = [];
    const startTime = performance.now();

    let anchorInvariantPass = false;
    let concurrentPrependPass = false;
    let orphanedDetectionPass = false;
    let serializationPass = false;

    try {
      // --- TEST 1: Basic Relative Position Invariant under Prepend ---
      const yDoc1 = new Y.Doc();
      const yText1 = yDoc1.getText('content');
      yText1.insert(0, 'Hello World, VaultSync Collaborative Workspace');

      const targetText = 'VaultSync';
      const from1 = yText1.toString().indexOf(targetText);
      const to1 = from1 + targetText.length;

      const relRange = RelativePositionManager.createRelativeRange(yText1, from1, to1);

      // Prepend a large string at index 0
      const prependText = '🚀 [Zero-Knowledge CRDT System] — ';
      yText1.insert(0, prependText);

      // Resolve relative position on modified document
      const resolvedRange1 = RelativePositionManager.resolveAbsoluteRange(relRange, yDoc1);

      if (resolvedRange1 && !resolvedRange1.isOrphaned) {
        const textAtRange = yText1.toString().substring(resolvedRange1.from, resolvedRange1.to);
        if (textAtRange === targetText && resolvedRange1.from === from1 + prependText.length) {
          anchorInvariantPass = true;
          details.push(`✅ Test 1: Neo Vị Trí Bất Biến: Chèn chuỗi phía trước, điểm neo tự động dịch từ [${from1}, ${to1}] sang [${resolvedRange1.from}, ${resolvedRange1.to}] khớp đúng từ "${textAtRange}".`);
        } else {
          details.push(`❌ Test 1: Vị trí neo bị lệch (nhận: "${textAtRange}").`);
        }
      } else {
        details.push('❌ Test 1: Không giải mã được vị trí tuyệt đối.');
      }

      // --- TEST 2: Multi-Peer Concurrent Merge & Invariant Tracking ---
      const aliceDoc = new Y.Doc();
      const aliceText = aliceDoc.getText('content');
      aliceText.insert(0, 'Initial Document Paragraph Alpha');

      const bobDoc = new Y.Doc();
      const bobText = bobDoc.getText('content');

      // Sync initial state to Bob
      const initUpdate = Y.encodeStateAsUpdate(aliceDoc);
      Y.applyUpdate(bobDoc, initUpdate);

      // Alice creates a comment anchor on "Paragraph"
      const aliceFrom = aliceText.toString().indexOf('Paragraph');
      const aliceTo = aliceFrom + 'Paragraph'.length;
      const aliceRelRange = RelativePositionManager.createRelativeRange(aliceText, aliceFrom, aliceTo);
      const serializedRange = RelativePositionManager.serializeRange(aliceRelRange);

      // Bob concurrently prepends 2 sentences and inserts text after
      bobText.insert(0, 'Bob Header 1: Confidential Note. ');
      bobText.insert(bobText.length, ' [Bob Footnote]');

      // Apply Bob's concurrent updates to Alice
      const bobUpdate = Y.encodeStateAsUpdate(bobDoc);
      Y.applyUpdate(aliceDoc, bobUpdate);

      // Resolve Alice's serialized anchor on both Alice and Bob's synced documents
      const resolvedOnAlice = RelativePositionManager.resolveSerializedRange(serializedRange, aliceDoc);
      const resolvedOnBob = RelativePositionManager.resolveSerializedRange(serializedRange, bobDoc);

      if (
        resolvedOnAlice &&
        resolvedOnBob &&
        resolvedOnAlice.from === resolvedOnBob.from &&
        resolvedOnAlice.to === resolvedOnBob.to
      ) {
        const aliceWord = aliceText.toString().substring(resolvedOnAlice.from, resolvedOnAlice.to);
        const bobWord = bobText.toString().substring(resolvedOnBob.from, resolvedOnBob.to);

        if (aliceWord === 'Paragraph' && bobWord === 'Paragraph') {
          concurrentPrependPass = true;
          details.push(`✅ Test 2: Đồng Bộ Đa Peer (Alice & Bob): Tọa độ neo sau khi merge CRDT hoàn toàn đồng nhất giữa 2 bên tại [${resolvedOnAlice.from}, ${resolvedOnAlice.to}].`);
        } else {
          details.push(`❌ Test 2: Chữ trích dẫn sau khi merge không khớp ("${aliceWord}" vs "${bobWord}").`);
        }
      } else {
        details.push('❌ Test 2: Tọa độ neo bị lệch giữa Alice và Bob.');
      }

      // --- TEST 3: Orphaned Comment Detection on Total Deletion ---
      const yDoc3 = new Y.Doc();
      const yText3 = yDoc3.getText('content');
      yText3.insert(0, 'The quick brown fox jumps over the lazy dog');

      const foxWord = 'brown fox';
      const foxFrom = yText3.toString().indexOf(foxWord);
      const foxTo = foxFrom + foxWord.length;
      const foxRange = RelativePositionManager.createRelativeRange(yText3, foxFrom, foxTo);

      // Delete the anchored phrase "brown fox" completely
      yText3.delete(foxFrom, foxWord.length);

      // Attempt to resolve anchor
      const resolvedOrphan = RelativePositionManager.resolveAbsoluteRange(foxRange, yDoc3);

      if (resolvedOrphan && resolvedOrphan.isOrphaned && resolvedOrphan.length === 0) {
        orphanedDetectionPass = true;
        details.push('✅ Test 3: Phát Hiện Bình Luận Mồ Côi (Orphaned): Xóa toàn bộ đoạn chữ được neo -> Hệ thống phát hiện isOrphaned: true và chuyển sang trạng thái neo ngữ cảnh an toàn.');
      } else {
        details.push('❌ Test 3: Không phát hiện được trạng thái mồ côi khi văn bản bị xóa.');
      }

      // --- TEST 4: Binary Base64URL Serialization Round-Trip ---
      const yDoc4 = new Y.Doc();
      const yText4 = yDoc4.getText('content');
      yText4.insert(0, 'Testing Serialization Fidelity in Base64URL');

      const originalRange = RelativePositionManager.createRelativeRange(yText4, 8, 21);
      const serialized = RelativePositionManager.serializeRange(originalRange);
      const deserialized = RelativePositionManager.deserializeRange(serialized);
      const resolved4 = RelativePositionManager.resolveAbsoluteRange(deserialized, yDoc4);

      if (resolved4 && resolved4.from === 8 && resolved4.to === 21 && !resolved4.isOrphaned) {
        serializationPass = true;
        details.push('✅ Test 4: Mã Hóa & Giải Mã Nhị Phân: Chuyển đổi RelativePosition qua Base64URL bảo toàn 100% tọa độ CRDT.');
      } else {
        details.push('❌ Test 4: Lỗi serialization Base64URL.');
      }

      const latencyMs = Math.round(performance.now() - startTime);
      const allPassed = anchorInvariantPass && concurrentPrependPass && orphanedDetectionPass && serializationPass;

      return {
        allPassed,
        anchorInvariantPass,
        concurrentPrependPass,
        orphanedDetectionPass,
        serializationPass,
        latencyMs,
        details
      };
    } catch (err: any) {
      details.push(`❌ Lỗi ngoại lệ trong quá trình chạy Yjs Benchmark: ${err.message}`);
      return {
        allPassed: false,
        anchorInvariantPass: false,
        concurrentPrependPass: false,
        orphanedDetectionPass: false,
        serializationPass: false,
        latencyMs: Math.round(performance.now() - startTime),
        details
      };
    }
  }
}
