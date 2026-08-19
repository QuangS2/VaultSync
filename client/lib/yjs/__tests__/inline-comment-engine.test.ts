import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import { InlineCommentAnchorEngine } from '../inline-comment-engine';

describe('InlineCommentAnchorEngine — CRDT Thread Synchronization Unit Tests', () => {
  it('should create an anchored inline comment thread in Y.Map', () => {
    const yDoc = new Y.Doc();
    const yText = yDoc.getText('content');
    yText.insert(0, 'Kiến trúc bảo mật Zero-Knowledge của VaultSync');

    const engine = new InlineCommentAnchorEngine(yDoc);

    const thread = engine.createThread({
      yType: yText,
      from: 17,
      to: 31,
      quotedText: 'Zero-Knowledge',
      authorId: 'user_alice',
      authorName: 'Alice',
      content: 'Cần bổ sung chi tiết về cơ chế xác thực GHASH.'
    });

    expect(thread.id).toBeDefined();
    expect(thread.quotedText).toBe('Zero-Knowledge');
    expect(thread.isResolved).toBe(false);
    expect(thread.replies.length).toBe(1);
    expect(thread.replies[0]?.content).toBe('Cần bổ sung chi tiết về cơ chế xác thực GHASH.');

    const threads = engine.getAllThreads();
    expect(threads.length).toBe(1);
    expect(threads[0]?.thread.id).toBe(thread.id);
  });

  it('should add replies to an existing discussion thread', () => {
    const yDoc = new Y.Doc();
    const yText = yDoc.getText('content');
    yText.insert(0, 'Sample collaborative text content');

    const engine = new InlineCommentAnchorEngine(yDoc);
    const thread = engine.createThread({
      yType: yText,
      from: 0,
      to: 6,
      quotedText: 'Sample',
      authorId: 'user_alice',
      authorName: 'Alice',
      content: 'Initial question'
    });

    const reply = engine.addReply(thread.id, {
      authorId: 'user_bob',
      authorName: 'Bob',
      content: 'Đồng ý, tôi sẽ cập nhật thêm phần này.'
    });

    expect(reply.id).toBeDefined();
    expect(reply.authorName).toBe('Bob');

    const item = engine.getThread(thread.id);
    expect(item?.thread.replies.length).toBe(2);
    expect(item?.thread.replies[1]?.content).toBe('Đồng ý, tôi sẽ cập nhật thêm phần này.');
  });

  it('should toggle resolved status of thread', () => {
    const yDoc = new Y.Doc();
    const yText = yDoc.getText('content');
    yText.insert(0, 'Sample text');

    const engine = new InlineCommentAnchorEngine(yDoc);
    const thread = engine.createThread({
      yType: yText,
      from: 0,
      to: 6,
      quotedText: 'Sample',
      authorId: 'user_alice',
      authorName: 'Alice',
      content: 'Need review'
    });

    expect(engine.getThread(thread.id)?.thread.isResolved).toBe(false);

    // Resolve thread
    engine.toggleResolved(thread.id, true);
    expect(engine.getThread(thread.id)?.thread.isResolved).toBe(true);

    // Unresolve thread
    engine.toggleResolved(thread.id, false);
    expect(engine.getThread(thread.id)?.thread.isResolved).toBe(false);
  });

  it('should sync comment threads in real-time between Doc A and Doc B', () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();

    const textA = docA.getText('content');
    textA.insert(0, 'Văn bản thử nghiệm đồng bộ P2P');

    const engineA = new InlineCommentAnchorEngine(docA);
    const engineB = new InlineCommentAnchorEngine(docB);

    // Create thread on Doc A
    const threadA = engineA.createThread({
      yType: textA,
      from: 0,
      to: 7,
      quotedText: 'Văn bản',
      authorId: 'user_alice',
      authorName: 'Alice',
      content: 'Thread created on peer A'
    });

    // Sync Doc A update to Doc B
    const update = Y.encodeStateAsUpdate(docA);
    Y.applyUpdate(docB, update);

    const itemOnB = engineB.getThread(threadA.id);
    expect(itemOnB).toBeDefined();
    expect(itemOnB?.thread.quotedText).toBe('Văn bản');
    expect(itemOnB?.thread.replies[0]?.content).toBe('Thread created on peer A');
  });
});
