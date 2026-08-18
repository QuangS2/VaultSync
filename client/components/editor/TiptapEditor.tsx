import React, { useEffect, useState, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { getVaultSyncExtensions } from './extensions';
import { 
  Bold, 
  Italic, 
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

export interface TiptapEditorProps {
  content: string;
  documentTitle: string;
  onTitleChange?: ((newTitle: string) => void) | undefined;
  onChange?: ((html: string) => void) | undefined;
  onSelectionChange?: ((selectedText: string) => void) | undefined;
  onAddInlineComment?: (() => void) | undefined;
  readOnly?: boolean | undefined;
}

export const TiptapEditor: React.FC<TiptapEditorProps> = ({
  content,
  documentTitle,
  onTitleChange,
  onChange,
  onSelectionChange,
  onAddInlineComment,
  readOnly = false
}) => {
  const [selectedText, setSelectedText] = useState('');

  const extensions = useMemo(() => getVaultSyncExtensions(), []);

  const editor = useEditor({
    extensions,
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (onChange) onChange(html);
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      const text = editor.state.doc.textBetween(from, to, ' ').trim();
      setSelectedText(text);
      if (onSelectionChange) {
        onSelectionChange(text);
      }
    }
  });

  // Synchronize external content changes (e.g. switching documents)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

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
      <div className="px-6 py-2 border-b border-theme-border bg-theme-bg-subtle/40 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-0.5 overflow-x-auto">
          {/* Headings */}
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Tiêu đề 1 (H1)"
            className={`p-1.5 rounded transition-colors cursor-pointer ${
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
            className={`p-1.5 rounded transition-colors cursor-pointer ${
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
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              editor.isActive('heading', { level: 3 })
                ? 'bg-theme-accent-subtle text-theme-accent font-bold'
                : 'text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover'
            }`}
          >
            <Heading3 className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-theme-border mx-1" />

          {/* Inline Marks */}
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="In đậm (Ctrl+B)"
            className={`p-1.5 rounded transition-colors cursor-pointer ${
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
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              editor.isActive('italic')
                ? 'bg-theme-accent-subtle text-theme-accent font-bold'
                : 'text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover'
            }`}
          >
            <Italic className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Gạch ngang chữ"
            className={`p-1.5 rounded transition-colors cursor-pointer ${
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
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              editor.isActive('code')
                ? 'bg-theme-accent-subtle text-theme-accent font-bold'
                : 'text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover'
            }`}
          >
            <Code className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-theme-border mx-1" />

          {/* Blocks */}
          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="Khối mã nguồn (Code Block)"
            className={`p-1.5 rounded transition-colors cursor-pointer ${
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
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              editor.isActive('blockquote')
                ? 'bg-theme-accent-subtle text-theme-accent font-bold'
                : 'text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover'
            }`}
          >
            <Quote className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-theme-border mx-1" />

          {/* Lists */}
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Danh sách gạch đầu dòng"
            className={`p-1.5 rounded transition-colors cursor-pointer ${
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
            className={`p-1.5 rounded transition-colors cursor-pointer ${
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
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              editor.isActive('taskList')
                ? 'bg-theme-accent-subtle text-theme-accent font-bold'
                : 'text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-theme-border mx-1" />

          {/* Undo / Redo */}
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Hoàn tác (Ctrl+Z)"
            className="p-1.5 rounded text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Làm lại (Ctrl+Y)"
            className="p-1.5 rounded text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Floating Add Comment Trigger or Word Count */}
        <div className="flex items-center gap-2 shrink-0">
          {selectedText ? (
            <Button 
              variant="primary" 
              size="sm" 
              onClick={onAddInlineComment}
              className="animate-in fade-in zoom-in-95 duration-150 shadow-xs"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              <span>Thêm Bình Luận ({selectedText.length} ký tự)</span>
            </Button>
          ) : (
            <div className="flex items-center gap-3 text-[11px] text-theme-text-muted font-mono">
              <span>{stats.words} từ</span>
              <span>•</span>
              <span>{stats.characters} ký tự</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Editor Canvas Content Area */}
      <div className="flex-1 overflow-y-auto px-6 md:px-16 py-8 flex flex-col max-w-4xl w-full mx-auto">
        {/* Document Title Input */}
        <input
          value={documentTitle}
          onChange={(e) => onTitleChange?.(e.target.value)}
          placeholder="Tiêu đề tài liệu không tên..."
          className="text-3xl md:text-4xl font-extrabold text-theme-text bg-transparent border-none focus:outline-none placeholder:text-theme-text-muted mb-6 tracking-tight"
        />

        {/* Tiptap ProseMirror Content Container */}
        <div className="vaultsync-tiptap-container flex-1">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
};
