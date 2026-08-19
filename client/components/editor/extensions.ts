/**
 * Enterprise Tiptap Extensions Configuration for VaultSync (11/10 Precision)
 * Configures StarterKit, interactive TaskList/TaskItem, and multi-language CodeBlockLowlight.
 */

import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
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
}
