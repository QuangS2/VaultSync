/**
 * Enterprise Tiptap Extensions Configuration for VaultSync (11/10 Precision)
 * Configures StarterKit, interactive TaskList/TaskItem, and multi-language CodeBlockLowlight.
 */

import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight, common } from 'lowlight';
import { SlashCommandExtension } from './slash-command';

// Initialize lowlight syntax engine with standard common languages:
// javascript, typescript, python, rust, go, sql, json, bash, html, css, markdown, c, cpp, java, yaml, xml
export const lowlight = createLowlight(common);

export function getVaultSyncExtensions() {
  return [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3]
      },
      codeBlock: false, // Replaced by CodeBlockLowlight
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
      }
    }),
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
    SlashCommandExtension
  ];
}
