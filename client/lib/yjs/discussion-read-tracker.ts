/**
 * DiscussionReadTracker — Enterprise Per-Document Unread State Manager (11/10 Precision)
 * Tracks last viewed timestamps for comments and room chat across all documents in the vault.
 * Computes exact unread counts and controls red dot notification badges dynamically.
 */

import { InlineCommentThread } from './types';
import { RoomChatMessage } from './room-chat-engine';

export interface DocumentReadReceipt {
  lastReadCommentTimestamp: number;
  lastReadChatTimestamp: number;
}

const STORAGE_KEY = 'vaultsync_discussion_read_receipts';

export class DiscussionReadTracker {
  private receipts: Record<string, DocumentReadReceipt> = {};

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.receipts = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[DiscussionReadTracker] Failed to parse receipts:', e);
      this.receipts = {};
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.receipts));
    } catch (e) {
      console.warn('[DiscussionReadTracker] Failed to save receipts:', e);
    }
  }

  public getReceipt(documentId: string): DocumentReadReceipt {
    return this.receipts[documentId] || {
      lastReadCommentTimestamp: 0,
      lastReadChatTimestamp: 0
    };
  }

  /**
   * Marks a document's comments, chat, or both as read right now.
   */
  public markAsRead(documentId: string, type: 'comments' | 'chat' | 'all' = 'all'): void {
    const current = this.getReceipt(documentId);
    const now = Date.now();

    this.receipts[documentId] = {
      lastReadCommentTimestamp: (type === 'comments' || type === 'all') ? now : current.lastReadCommentTimestamp,
      lastReadChatTimestamp: (type === 'chat' || type === 'all') ? now : current.lastReadChatTimestamp
    };

    this.saveToStorage();
  }

  /**
   * Calculates unread counts for a document based on current user ID and items created after receipt timestamp.
   */
  public getUnreadCounts(
    documentId: string,
    currentUserId: string,
    threads: InlineCommentThread[],
    chatMessages: RoomChatMessage[]
  ): { unreadComments: number; unreadChat: number; totalUnread: number; hasUnread: boolean } {
    const receipt = this.getReceipt(documentId);

    // Unread comments count (threads or replies created by others after last read)
    let unreadComments = 0;
    for (const thread of threads) {
      if (thread.isResolved) continue;
      
      // Check thread creation
      if (thread.authorId !== currentUserId && thread.createdAt > receipt.lastReadCommentTimestamp) {
        unreadComments++;
        continue;
      }

      // Check replies
      for (const reply of thread.replies) {
        if (reply.authorId !== currentUserId && reply.createdAt > receipt.lastReadCommentTimestamp) {
          unreadComments++;
          break;
        }
      }
    }

    // Unread chat messages count
    let unreadChat = 0;
    for (const msg of chatMessages) {
      if (msg.authorId !== currentUserId && msg.createdAt > receipt.lastReadChatTimestamp) {
        unreadChat++;
      }
    }

    const totalUnread = unreadComments + unreadChat;

    return {
      unreadComments,
      unreadChat,
      totalUnread,
      hasUnread: totalUnread > 0
    };
  }
}
