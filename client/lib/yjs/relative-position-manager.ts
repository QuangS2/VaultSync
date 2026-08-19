/**
 * Enterprise Yjs Relative Position Manager
 * Maps absolute ProseMirror editor indices to immutable CRDT coordinates and back.
 * Handles concurrent edits, text insertions, text deletions, and orphaned comments seamlessly.
 */

import * as Y from 'yjs';
import { BinaryUtils } from '../crypto/binary-utils';
import { RelativeRange, SerializedRelativeRange, ResolvedAbsoluteRange } from './types';

export class RelativePositionManager {
  /**
   * Creates a pair of Yjs RelativePositions from absolute slice indices [from, to].
   * 
   * Association Rules:
   * - `startRelPos`: assoc = 0 (right-associative: sticks to the first character at `from`, shifting forward when text is prepended)
   * - `endRelPos`: assoc = -1 (left-associative: sticks to the last character before `to`, not capturing text appended after)
   */
  public static createRelativeRange(
    yType: Y.AbstractType<any>,
    from: number,
    to: number
  ): RelativeRange {
    if (from < 0 || to < from) {
      throw new Error(`Invalid range indices: from (${from}) must be >= 0 and <= to (${to}).`);
    }

    const startRelPos = Y.createRelativePositionFromTypeIndex(yType, from, 0);
    const endRelPos = Y.createRelativePositionFromTypeIndex(yType, to, -1);

    return { startRelPos, endRelPos };
  }

  /**
   * Resolves a RelativeRange back to current absolute document indices within a live Y.Doc.
   * Detects if the underlying text segment has been deleted (Orphaned Comment state).
   */
  public static resolveAbsoluteRange(
    range: RelativeRange,
    yDoc: Y.Doc
  ): ResolvedAbsoluteRange | null {
    const startAbs = Y.createAbsolutePositionFromRelativePosition(range.startRelPos, yDoc);
    const endAbs = Y.createAbsolutePositionFromRelativePosition(range.endRelPos, yDoc);

    if (!startAbs || !endAbs) {
      return null;
    }

    if (startAbs.type !== endAbs.type) {
      return null;
    }

    const from = startAbs.index;
    const to = endAbs.index;
    const length = to - from;

    const isOrphaned = from >= to;

    return {
      from,
      to,
      length: Math.max(0, length),
      isOrphaned,
      type: startAbs.type
    };
  }

  /**
   * Serializes a RelativeRange into a compact, network-safe JSON object of Base64URL strings.
   */
  public static serializeRange(range: RelativeRange): SerializedRelativeRange {
    const startBytes = Y.encodeRelativePosition(range.startRelPos);
    const endBytes = Y.encodeRelativePosition(range.endRelPos);

    return {
      start: BinaryUtils.bufferToBase64Url(startBytes),
      end: BinaryUtils.bufferToBase64Url(endBytes)
    };
  }

  /**
   * Deserializes a SerializedRelativeRange back into a live RelativeRange.
   */
  public static deserializeRange(serialized: SerializedRelativeRange): RelativeRange {
    const startBytes = BinaryUtils.base64UrlToBytes(serialized.start);
    const endBytes = BinaryUtils.base64UrlToBytes(serialized.end);

    const startRelPos = Y.decodeRelativePosition(startBytes);
    const endRelPos = Y.decodeRelativePosition(endBytes);

    return { startRelPos, endRelPos };
  }

  /**
   * Helper to serialize and resolve in a single call.
   */
  public static resolveSerializedRange(
    serialized: SerializedRelativeRange,
    yDoc: Y.Doc
  ): ResolvedAbsoluteRange | null {
    const range = RelativePositionManager.deserializeRange(serialized);
    return RelativePositionManager.resolveAbsoluteRange(range, yDoc);
  }
}
