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

export interface InlineCommentThread {
  id: string;
  documentId: string;
  authorId: string;
  authorName: string;
  quotedText: string;
  relativeRange: SerializedRelativeRange;
  createdAt: number;
  isResolved: boolean;
  isOrphaned: boolean;
  lastResolvedRange?: { from: number; to: number } | undefined;
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
