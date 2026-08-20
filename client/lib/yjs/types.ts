/**
 * Yjs Relative Positions & Comment Anchor Types
 * Strict typing for CRDT invariant coordinates, serialized anchors, and orphaned thread states.
 */

import * as Y from 'yjs';

export interface RelativeRange {
  startRelPos: Y.RelativePosition;
  endRelPos: Y.RelativePosition;
}

export interface SerializedRelativeRange {
  start: string; // Base64URL encoded Uint8Array of Y.encodeRelativePosition
  end: string;   // Base64URL encoded Uint8Array of Y.encodeRelativePosition
}

export interface ResolvedAbsoluteRange {
  from: number;
  to: number;
  length: number;
  isOrphaned: boolean;
  type: Y.AbstractType<any>;
}

export interface CommentReply {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | undefined;
  content: string;
  createdAt: number;
}

export interface InlineCommentThread {
  id: string;
  documentId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | undefined;
  quotedText: string;
  relativeRange: SerializedRelativeRange;
  createdAt: number;
  updatedAt: number;
  isResolved: boolean;
  isOrphaned: boolean;
  isGeneralComment?: boolean | undefined;
  replies: CommentReply[];
  lastResolvedRange?: { from: number; to: number } | undefined;
}

export interface ThreadWithLivePosition {
  thread: InlineCommentThread;
  liveRange: ResolvedAbsoluteRange | null;
  isOrphaned: boolean;
}

export interface CRDTPositionTestResult {
  allPassed: boolean;
  anchorInvariantPass: boolean;
  concurrentPrependPass: boolean;
  orphanedDetectionPass: boolean;
  serializationPass: boolean;
  latencyMs: number;
  details: string[];
}

export type ProviderSyncStatus = 'synced' | 'syncing' | 'offline';

export interface ProviderConnectionStatus {
  connected: boolean;
  connecting: boolean;
  syncStatus: ProviderSyncStatus;
  reconnectAttempts: number;
  error: Error | null;
}

export interface EncryptedYjsProviderOptions {
  serverUrl: string;
  roomId: string;
  yDoc: Y.Doc;
  documentKey: CryptoKey;
  epoch?: number | undefined;
  user?: AwarenessUser | undefined;
  autoConnect?: boolean | undefined;
  maxReconnectAttempts?: number | undefined;
  onStatusChange?: ((status: ProviderConnectionStatus) => void) | undefined;
  onSyncChange?: ((synced: boolean) => void) | undefined;
}

export interface AwarenessUser {
  name: string;
  color: string;
  avatar?: string | undefined;
  clientId?: number | undefined;
  isLocal?: boolean | undefined;
}

export interface CollaborationUserOptions {
  name: string;
  color: string;
  avatar?: string | undefined;
}
