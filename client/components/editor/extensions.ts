import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { createLowlight, common } from 'lowlight';
import { SlashCommandExtension } from './slash-command';
import { CommentHighlightExtension } from './comment-highlight-plugin';
import { CollaborationUserOptions } from '../../lib/yjs/types';

// Initialize lowlight syntax engine with standard common languages:
// javascript, typescript, python, rust, go, sql, json, bash, html, css, markdown, c, cpp, java, yaml, xml
export const lowlight = createLowlight(common);

export interface VaultSyncExtensionsOptions {
  yDoc?: Y.Doc | undefined;
  provider?: any;
  user?: CollaborationUserOptions | undefined;
  onCommentClick?: ((threadId: string) => void) | undefined;
  activeCommentThreadId?: string | null | undefined;
}

export function getVaultSyncExtensions(options?: VaultSyncExtensionsOptions) {
  const isCollaborative = Boolean(options?.provider || options?.yDoc);

  const starterKitConfig = {
    heading: {
      levels: [1, 2, 3] as (1 | 2 | 3)[]
    },
    codeBlock: false as const,
    bulletList: {
      keepMarks: true,
      keepAttributes: false
    },
    orderedList: {
      keepMarks: true,
      keepAttributes: false
    },
    blockquote: {
      HTMLAttributes: {
        class: 'vaultsync-blockquote'
      }
    },
    ...(isCollaborative ? { history: false as const } : {})
  };

  const extensions = [
    StarterKit.configure(starterKitConfig),
    TaskList.configure({
      HTMLAttributes: {
        class: 'vaultsync-task-list'
      }
    }),
    TaskItem.configure({
      nested: true,
      HTMLAttributes: {
        class: 'vaultsync-task-item'
      }
    }),
    CodeBlockLowlight.configure({
      lowlight,
      defaultLanguage: 'typescript',
      HTMLAttributes: {
        class: 'vaultsync-code-block font-mono text-xs'
      }
    }),
    Underline,
    TextStyle,
    Color,
    Highlight.configure({
      multicolor: true,
      HTMLAttributes: {
        class: 'vaultsync-highlight rounded-xs px-0.5'
      }
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: {
        class: 'vaultsync-link text-theme-accent underline underline-offset-2 hover:opacity-80 transition-opacity cursor-pointer',
        rel: 'noopener noreferrer',
        target: '_blank'
      }
    }),
    SlashCommandExtension
  ];

  if (isCollaborative) {
    const doc = options?.yDoc || options?.provider?.yDoc;
    if (doc) {
      extensions.push(
        Collaboration.configure({
          document: doc
        }),
        CommentHighlightExtension.configure({
          yDoc: doc,
          onCommentClick: options?.onCommentClick,
          activeThreadId: options?.activeCommentThreadId
        })
      );
    }

    if (options?.provider) {
      extensions.push(
        CollaborationCursor.configure({
          provider: options.provider,
          user: options.user ?? {
            name: 'Người dùng ẩn danh',
            color: '#2563eb'
          }
        })
      );
    }
  }

  return extensions;
}
