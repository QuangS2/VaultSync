/**
 * Enterprise ProseMirror Comment Highlight Plugin & Tiptap Extension (11/10 Precision)
 * Dynamically renders inline amber decorations on text ranges containing active discussion threads.
 * Tracks live coordinates across concurrent edits without polluting the core CRDT document structure.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import * as Y from 'yjs';
import { RelativePositionManager } from '../../lib/yjs/relative-position-manager';
import { InlineCommentThread } from '../../lib/yjs/types';

export const CommentPluginKey = new PluginKey('vaultsyncCommentDecorations');

export interface CommentHighlightExtensionOptions {
  yDoc?: Y.Doc | undefined;
  onCommentClick?: ((threadId: string) => void) | undefined;
  activeThreadId?: string | null | undefined;
}

export function computeCommentDecorations(
  yDoc: Y.Doc,
  docSize: number,
  activeThreadId?: string | null
): Decoration[] {
  const decorations: Decoration[] = [];
  const commentsMap = yDoc.getMap('vaultsync-inline-threads');

  commentsMap.forEach((rawThread: any) => {
    try {
      const thread: InlineCommentThread = typeof rawThread === 'string' ? JSON.parse(rawThread) : rawThread;
      if (thread.isResolved) return; // Do not highlight resolved threads

      const liveRange = RelativePositionManager.resolveSerializedRange(thread.relativeRange, yDoc);
      if (!liveRange || liveRange.isOrphaned || liveRange.from >= liveRange.to) {
        return; // Tombstone / deleted range: skip inline highlight
      }

      // Clamp coordinates within ProseMirror doc bounds
      const from = Math.max(0, Math.min(liveRange.from, docSize));
      const to = Math.max(0, Math.min(liveRange.to, docSize));

      if (from < to) {
        const isActive = activeThreadId === thread.id;
        const deco = Decoration.inline(
          from,
          to,
          {
            class: `vaultsync-comment-highlight ${isActive ? 'is-active' : ''}`.trim(),
            'data-thread-id': thread.id
          },
          {
            threadId: thread.id
          }
        );
        decorations.push(deco);
      }
    } catch (err) {
      console.error('[CommentHighlightPlugin] Failed to calculate decoration for thread:', err);
    }
  });

  return decorations;
}

export const CommentHighlightExtension = Extension.create<CommentHighlightExtensionOptions>({
  name: 'commentHighlight',

  addOptions() {
    return {
      yDoc: undefined,
      onCommentClick: undefined,
      activeThreadId: null
    };
  },

  addProseMirrorPlugins() {
    const { yDoc, onCommentClick, activeThreadId } = this.options;
    if (!yDoc) return [];

    return [
      new Plugin({
        key: CommentPluginKey,

        state: {
          init(_, state) {
            const decos = computeCommentDecorations(yDoc, state.doc.content.size, activeThreadId);
            return DecorationSet.create(state.doc, decos);
          },

          apply(tr, oldSet, _oldState, newState) {
            // Map old decorations through document transactions
            let set = oldSet.map(tr.mapping, tr.doc);

            // If document changed, comments changed, or meta refresh triggered, recompute
            const hasDocChanged = tr.docChanged;
            const meta = tr.getMeta(CommentPluginKey);

            if (hasDocChanged || (meta && meta.refresh)) {
              const currentActiveId = meta?.activeThreadId !== undefined ? meta.activeThreadId : activeThreadId;
              const decos = computeCommentDecorations(yDoc, newState.doc.content.size, currentActiveId);
              set = DecorationSet.create(newState.doc, decos);
            }

            return set;
          }
        },

        props: {
          decorations(state) {
            return this.getState(state);
          },

          handleClick(_view, _pos, event) {
            const target = event.target as HTMLElement;
            const highlightEl = target.closest('.vaultsync-comment-highlight');
            if (highlightEl) {
              const threadId = highlightEl.getAttribute('data-thread-id');
              if (threadId && onCommentClick) {
                onCommentClick(threadId);
                return true;
              }
            }
            return false;
          }
        }
      })
    ];
  }
});
