import React, { useEffect, useState, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { getVaultSyncExtensions } from './extensions';
import { EditorBubbleMenu } from './EditorBubbleMenu';
import { QuickstartWorkflowGuide } from '../guide/QuickstartWorkflowGuide';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon,
  Strikethrough, 
  Code, 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  CheckSquare, 
  Quote, 
  FileCode, 
  Undo2, 
  Redo2, 
  MessageSquarePlus
} from 'lucide-react';
import { Button } from '../ui/Button';

import * as Y from 'yjs';
import { CollaborationUserOptions } from '../../lib/yjs/types';

export interface TiptapEditorProps {
  content: string;
  documentTitle: string;
  onTitleChange?: ((newTitle: string) => void) | undefined;
  onChange?: ((html: string) => void) | undefined;
  onSelectionChange?: ((selectedText: string) => void) | undefined;
  onAddInlineComment?: ((draft: { from: number; to: number; quotedText: string }) => void) | undefined;
  readOnly?: boolean | undefined;
  yDoc?: Y.Doc | undefined;
  provider?: any | undefined;
  user?: CollaborationUserOptions | undefined;
  onCommentClick?: ((threadId: string) => void) | undefined;
  activeCommentThreadId?: string | null | undefined;
  onOpenShareModal?: (() => void) | undefined;
  onOpenDiscussionSidebar?: (() => void) | undefined;
  onOpenCommandPalette?: (() => void) | undefined;
  onCreateNewNote?: (() => void) | undefined;
}

export const TiptapEditor: React.FC<TiptapEditorProps> = ({
  content,
  documentTitle,
  onTitleChange,
  onChange,
  onSelectionChange,
  onAddInlineComment,
  readOnly = false,
  yDoc,
  provider,
  user,
  onCommentClick,
  activeCommentThreadId,
  onOpenShareModal,
  onOpenDiscussionSidebar,
  onOpenCommandPalette,
  onCreateNewNote
}) => {
  const [selectedText, setSelectedText] = useState('');

  const extensions = useMemo(() => getVaultSyncExtensions({
    yDoc,
    provider,
    user,
    onCommentClick,
    activeCommentThreadId
  }), [yDoc, provider, user, onCommentClick, activeCommentThreadId]);

  const editor = useEditor({
    extensions,
    ...(!yDoc && content ? { content } : {}),
    editable: !readOnly,
    onUpdate: ({ editor, transaction }) => {
      if (!yDoc && transaction.docChanged && onChange) {
        onChange(editor.getHTML());
      }
    },
    onSelectionUpdate: ({ editor }) => {
      if (editor.isDestroyed) return;
      const { from, to } = editor.state.selection;
      const text = editor.state.doc.textBetween(from, to, ' ').trim();
      queueMicrotask(() => {
        if (!editor.isDestroyed) {
          setSelectedText(text);
          if (onSelectionChange) {
            onSelectionChange(text);
          }
        }
      });
    }
  }, [yDoc, provider]);

  // Synchronize external content changes (e.g. switching non-collaborative documents)
  useEffect(() => {
    if (!yDoc && editor && !editor.isDestroyed && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor, yDoc]);

  // Update editable state dynamically when readOnly prop changes
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const shouldBeEditable = !readOnly;
      if (editor.isEditable !== shouldBeEditable) {
        editor.setEditable(shouldBeEditable);
      }
    }
  }, [editor, readOnly]);

  // Smooth scroll into view when active comment thread is selected
  useEffect(() => {
    if (!activeCommentThreadId || !editor) return;
    const timeout = setTimeout(() => {
      const highlightEl = document.querySelector(`.vaultsync-comment-highlight[data-thread-id="${activeCommentThreadId}"]`);
      if (highlightEl) {
        highlightEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
    return () => clearTimeout(timeout);
  }, [activeCommentThreadId, editor]);

  // Statistics
  const stats = useMemo(() => {
    if (!editor) return { words: 0, characters: 0 };
    const text = editor.getText();
    const characters = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return { words, characters };
  }, [editor?.state.doc]);

  if (!editor) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-xs text-theme-text-muted">
        Đang khởi tạo trình soạn thảo Tiptap...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-theme-bg select-text">
      {/* 1. Interactive Formatting Toolbar */}
      <div className="px-2 sm:px-4 py-1.5 sm:py-2 border-b border-theme-border bg-theme-bg-subtle/40 flex items-center justify-between shrink-0 select-none gap-1 sm:gap-2 flex-nowrap overflow-hidden">
        {readOnly ? (
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
            <span className="px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center gap-1.5">
              <span>Chế độ chỉ xem (Chủ sở hữu đã khóa quyền chỉnh sửa)</span>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-0.5 overflow-x-auto flex-nowrap shrink-1 pr-2">
          {/* Headings */}
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Tiêu đề 1 (H1)"
            className={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
              editor.isActive('heading', { level: 1 })
                ? 'bg-theme-accent-subtle text-theme-accent font-bold'
                : 'text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover'
            }`}
          >
            <Heading1 className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Tiêu đề 2 (H2)"
            className={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
              editor.isActive('heading', { level: 2 })
                ? 'bg-theme-accent-subtle text-theme-accent font-bold'
                : 'text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover'
            }`}
          >
            <Heading2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Tiêu đề 3 (H3)"
            className={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
              editor.isActive('heading', { level: 3 })
                ? 'bg-theme-accent-subtle text-theme-accent font-bold'
                : 'text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover'
            }`}
          >
            <Heading3 className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-theme-border mx-0.5 sm:mx-1 shrink-0" />

          {/* Inline Marks */}
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="In đậm (Ctrl+B)"
            className={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
              editor.isActive('bold')
                ? 'bg-theme-accent-subtle text-theme-accent font-bold'
                : 'text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover'
            }`}
          >
            <Bold className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="In nghiêng (Ctrl+I)"
            className={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
              editor.isActive('italic')
                ? 'bg-theme-accent-subtle text-theme-accent font-bold'
                : 'text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover'
            }`}
          >
            <Italic className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Gạch chân (Ctrl+U)"
            className={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
              editor.isActive('underline')
                ? 'bg-theme-accent-subtle text-theme-accent font-bold'
                : 'text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover'
            }`}
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Gạch ngang chữ"
            className={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
              editor.isActive('strike')
                ? 'bg-theme-accent-subtle text-theme-accent font-bold'
                : 'text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover'
            }`}
          >
            <Strikethrough className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="Code nội dòng"
            className={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
              editor.isActive('code')
                ? 'bg-theme-accent-subtle text-theme-accent font-bold'
                : 'text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover'
            }`}
          >
            <Code className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-theme-border mx-0.5 sm:mx-1 shrink-0" />

          {/* Blocks */}
          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="Khối mã nguồn (Code Block)"
            className={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
              editor.isActive('codeBlock')
                ? 'bg-theme-accent-subtle text-theme-accent font-bold'
                : 'text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover'
            }`}
          >
            <FileCode className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Trích dẫn (Blockquote)"
            className={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
              editor.isActive('blockquote')
                ? 'bg-theme-accent-subtle text-theme-accent font-bold'
                : 'text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover'
            }`}
          >
            <Quote className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-theme-border mx-0.5 sm:mx-1 shrink-0" />

          {/* Lists */}
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Danh sách gạch đầu dòng"
            className={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
              editor.isActive('bulletList')
                ? 'bg-theme-accent-subtle text-theme-accent font-bold'
                : 'text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover'
            }`}
          >
            <List className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Danh sách số thứ tự"
            className={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
              editor.isActive('orderedList')
                ? 'bg-theme-accent-subtle text-theme-accent font-bold'
                : 'text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            title="Danh sách công việc (Checklist)"
            className={`p-1.5 rounded transition-colors cursor-pointer shrink-0 ${
              editor.isActive('taskList')
                ? 'bg-theme-accent-subtle text-theme-accent font-bold'
                : 'text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-theme-border mx-0.5 sm:mx-1 shrink-0" />

          {/* Undo / Redo */}
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Hoàn tác (Ctrl+Z)"
            className="p-1.5 rounded text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Làm lại (Ctrl+Y)"
            className="p-1.5 rounded text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
        )}

        {/* Floating Add Comment Trigger or Word Count */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {selectedText ? (
            <Button 
              variant="primary" 
              size="sm" 
              onClick={() => {
                if (onAddInlineComment && editor) {
                  const { from, to } = editor.state.selection;
                  const quotedText = editor.state.doc.textBetween(from, to, ' ').trim();
                  onAddInlineComment({ from, to, quotedText });
                }
              }}
              className="animate-in fade-in zoom-in-95 duration-150 shadow-xs h-7 px-2 sm:px-3 text-xs cursor-pointer"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Thêm Bình Luận ({selectedText.length})</span>
              <span className="sm:hidden">Bình luận</span>
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-3 text-[10px] sm:text-[11px] text-theme-text-muted font-mono whitespace-nowrap">
              <span>{stats.words} từ</span>
              <span>•</span>
              <span>{stats.characters} ký tự</span>
            </div>
          )}
        </div>
      </div>

      {/* Floating Contextual Bubble Menu (Always mounted with internal shouldShow guard to prevent React unmount crash) */}
      <EditorBubbleMenu 
        editor={editor} 
        readOnly={readOnly}
        onAddComment={onAddInlineComment} 
      />

      {/* 2. Editor Canvas Content Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 md:px-16 py-4 sm:py-8 flex flex-col max-w-4xl w-full mx-auto">
        {/* Guided Quickstart & Core Use Cases */}
        <QuickstartWorkflowGuide
          onCreateNote={onCreateNewNote || (() => {})}
          onOpenShare={onOpenShareModal || (() => {})}
          onOpenDiscussions={onOpenDiscussionSidebar || (() => onAddInlineComment?.({ from: 0, to: 0, quotedText: '' }))}
          onOpenCommandPalette={onOpenCommandPalette || (() => {})}
        />

        {/* Document Title Input */}
        <input
          value={documentTitle}
          readOnly={readOnly}
          onChange={(e) => onTitleChange?.(e.target.value)}
          placeholder="Tiêu đề tài liệu không tên..."
          className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-theme-text bg-transparent border-none focus:outline-none placeholder:text-theme-text-muted mb-4 sm:mb-6 tracking-tight disabled:opacity-80"
        />

        {/* Tiptap ProseMirror Content Container */}
        <div className="vaultsync-tiptap-container flex-1">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
};
