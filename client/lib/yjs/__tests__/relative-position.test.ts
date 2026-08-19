import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import { RelativePositionManager } from '../relative-position-manager';

describe('RelativePositionManager — CRDT Association & Range Tracking Unit Tests', () => {
  it('should create and resolve a relative range on initial text', () => {
    const yDoc = new Y.Doc();
    const yText = yDoc.getText('content');
    yText.insert(0, 'Chào mừng đến với VaultSync'); // 27 characters

    // Select "VaultSync" (indices 18 to 27)
    const range = RelativePositionManager.createRelativeRange(yText, 18, 27);
    const resolved = RelativePositionManager.resolveAbsoluteRange(range, yDoc);

    expect(resolved).not.toBeNull();
    expect(resolved?.from).toBe(18);
    expect(resolved?.to).toBe(27);
    expect(resolved?.length).toBe(9);
    expect(resolved?.isOrphaned).toBe(false);
  });

  it('should shift forward when text is prepended before the range (assoc: 0)', () => {
    const yDoc = new Y.Doc();
    const yText = yDoc.getText('content');
    yText.insert(0, 'Hello World'); // indices: 6 to 11 is "World"

    const range = RelativePositionManager.createRelativeRange(yText, 6, 11);

    // Prepend 10 characters at index 0
    yText.insert(0, 'Prefix-10-'); // length 10

    const resolved = RelativePositionManager.resolveAbsoluteRange(range, yDoc);
    expect(resolved?.from).toBe(16);
    expect(resolved?.to).toBe(21);
    expect(resolved?.length).toBe(5);
    expect(resolved?.isOrphaned).toBe(false);
  });

  it('should remain unchanged when text is appended after the range (assoc: -1)', () => {
    const yDoc = new Y.Doc();
    const yText = yDoc.getText('content');
    yText.insert(0, 'Hello World');

    const range = RelativePositionManager.createRelativeRange(yText, 0, 5); // "Hello"

    // Append text at the very end
    yText.insert(11, ' Appendage text here');

    const resolved = RelativePositionManager.resolveAbsoluteRange(range, yDoc);
    expect(resolved?.from).toBe(0);
    expect(resolved?.to).toBe(5);
    expect(resolved?.length).toBe(5);
  });

  it('should expand range when text is inserted inside the selection', () => {
    const yDoc = new Y.Doc();
    const yText = yDoc.getText('content');
    yText.insert(0, 'ABC DEF GHI'); // "DEF" at 4 to 7

    const range = RelativePositionManager.createRelativeRange(yText, 4, 7);

    // Insert 5 characters inside "DEF" at index 5 (between D and EF)
    yText.insert(5, '12345'); // "D12345EF"

    const resolved = RelativePositionManager.resolveAbsoluteRange(range, yDoc);
    expect(resolved?.from).toBe(4);
    expect(resolved?.to).toBe(12); // expanded by 5
    expect(resolved?.length).toBe(8);
  });

  it('should detect orphaned range when selected text is completely deleted', () => {
    const yDoc = new Y.Doc();
    const yText = yDoc.getText('content');
    yText.insert(0, 'Alpha Beta Gamma'); // "Beta" at 6 to 10

    const range = RelativePositionManager.createRelativeRange(yText, 6, 10);

    // Delete "Beta" (length 4 at index 6)
    yText.delete(6, 4);

    const resolved = RelativePositionManager.resolveAbsoluteRange(range, yDoc);
    expect(resolved?.isOrphaned).toBe(true);
    expect(resolved?.length).toBe(0);
  });

  it('should serialize and deserialize range across network-synced documents', () => {
    const docA = new Y.Doc();
    const textA = docA.getText('content');
    textA.insert(0, 'Collaborative Real-time E2EE Note');

    // Create range on Doc A for "Real-time" (indices 14 to 23)
    const rangeA = RelativePositionManager.createRelativeRange(textA, 14, 23);
    const serialized = RelativePositionManager.serializeRange(rangeA);

    expect(typeof serialized.start).toBe('string');
    expect(typeof serialized.end).toBe('string');

    // Sync state to Doc B
    const docB = new Y.Doc();
    const update = Y.encodeStateAsUpdate(docA);
    Y.applyUpdate(docB, update);

    // Resolve on Doc B
    const resolvedB = RelativePositionManager.resolveSerializedRange(serialized, docB);
    expect(resolvedB).not.toBeNull();
    expect(resolvedB?.from).toBe(14);
    expect(resolvedB?.to).toBe(23);
    expect(resolvedB?.length).toBe(9);
  });
});
