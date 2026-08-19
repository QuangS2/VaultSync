/**
 * Enterprise Room Chat Engine for VaultSync (11/10 Precision)
 * Manages real-time room chat messages stored in Y.Array and synchronized via E2EE Relay Server.
 */

import * as Y from 'yjs';

export interface RoomChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | undefined;
  authorColor?: string | undefined;
  content: string;
  createdAt: number;
}

export interface SendMessageOptions {
  authorId: string;
  authorName: string;
  content: string;
  authorAvatar?: string | undefined;
  authorColor?: string | undefined;
}

export class RoomChatEngine {
  public readonly yDoc: Y.Doc;
  public readonly yChatArray: Y.Array<string>;
  public readonly arrayName: string;

  constructor(yDoc: Y.Doc, arrayName: string = 'vaultsync-room-chat') {
    this.yDoc = yDoc;
    this.arrayName = arrayName;
    this.yChatArray = this.yDoc.getArray(arrayName);
  }

  /**
   * Sends a new chat message into the room's shared CRDT array.
   */
  public sendMessage(options: SendMessageOptions): RoomChatMessage {
    const message: RoomChatMessage = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      authorId: options.authorId,
      authorName: options.authorName,
      authorAvatar: options.authorAvatar,
      authorColor: options.authorColor ?? '#2563eb',
      content: options.content.trim(),
      createdAt: Date.now()
    };

    this.yDoc.transact(() => {
      this.yChatArray.push([JSON.stringify(message)]);
    });

    return message;
  }

  /**
   * Returns all chat messages sorted chronologically.
   */
  public getMessages(): RoomChatMessage[] {
    const messages: RoomChatMessage[] = [];

    this.yChatArray.forEach((rawJson) => {
      try {
        const msg: RoomChatMessage = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
        messages.push(msg);
      } catch (err) {
        console.error('[RoomChatEngine] Failed to parse chat message JSON:', err);
      }
    });

    return messages.sort((a, b) => a.createdAt - b.createdAt);
  }

  /**
   * Subscribes to real-time chat messages updates.
   */
  public onMessagesChange(callback: (messages: RoomChatMessage[]) => void): () => void {
    const observer = () => {
      callback(this.getMessages());
    };

    this.yChatArray.observe(observer);

    // Emit initial messages
    callback(this.getMessages());

    return () => {
      this.yChatArray.unobserve(observer);
    };
  }

  /**
   * Clears chat history.
   */
  public clearMessages(): void {
    this.yDoc.transact(() => {
      this.yChatArray.delete(0, this.yChatArray.length);
    });
  }
}
