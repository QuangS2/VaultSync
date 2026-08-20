import React, { useState, useCallback, useEffect, useRef } from 'react';
import { BubbleMenu, Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Link2,
  Unlink,
  Palette,
  MessageSquarePlus,
  Eraser,
  Check,
  X,
  ExternalLink,
  Highlighter
} from 'lucide-react';

export interface EditorBubbleMenuProps {
  editor: Editor | null;
  onAddComment?: ((draft: { from: number; to: number; quotedText: string }) => void) | undefined;
}

// Curated Anti-AI Text & Highlight Palettes
const TEXT_COLORS = [
  { label: 'Mặc định', value: 'inherit', color: 'var(--theme-text)' },
  { label: 'Đỏ gạch', value: '#e11d48', color: '#e11d48' },
  { label: 'Cam đất', value: '#d97706', color: '#d97706' },
  { label: 'Xanh lục', value: '#059669', color: '#059669' },
  { label: 'Xanh lam', value: '#2563eb', color: '#2563eb' },
  { label: 'Tím trầm', value: '#7c3aed', color: '#7c3aed' },
];

const HIGHLIGHT_COLORS = [
  { label: 'Không màu', value: 'none', bg: 'transparent' },
  { label: 'Vàng kem', value: '#fef08a', bg: '#fef08a' },
  { label: 'Lục tươi', value: '#bbf7d0', bg: '#bbf7d0' },
  { label: 'Lam dịu', value: '#bfdbfe', bg: '#bfdbfe' },
  { label: 'Tím nhạt', value: '#ddd6fe', bg: '#ddd6fe' },
  { label: 'Hồng phấn', value: '#fbcfe8', bg: '#fbcfe8' },
];

export const EditorBubbleMenu: React.FC<EditorBubbleMenuProps> = ({
  editor,
  onAddComment
}) => {
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [isColorOpen, setIsColorOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Sync current link attributes when selection changes
  useEffect(() => {
    if (editor) {
      const href = editor.getAttributes('link').href || '';
      setUrlInput(href);
      if (!editor.isActive('link')) {
        setIsLinkOpen(false);
      }
    }
  }, [editor?.state.selection]);

  // Focus link input when dialog opens
  useEffect(() => {
    if (isLinkOpen) {
      setTimeout(() => {
        urlInputRef.current?.focus();
        urlInputRef.current?.select();
      }, 50);
    }
  }, [isLinkOpen]);

  const handleOpenLink = useCallback(() => {
    if (!editor) return;
    const currentHref = editor.getAttributes('link').href || '';
    setUrlInput(currentHref);
    setIsColorOpen(false);
    setIsLinkOpen(prev => !prev);
  }, [editor]);

  const handleApplyLink = useCallback(() => {
    if (!editor) return;
    const trimmed = urlInput.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      const finalUrl = /^https?:\/\//i.test(trimmed) || trimmed.startsWith('mailto:') || trimmed.startsWith('#')
        ? trimmed
        : `https://${trimmed}`;
      editor.chain().focus().extendMarkRange('link').setLink({ href: finalUrl }).run();
    }
    setIsLinkOpen(false);
  }, [editor, urlInput]);

  const handleUnlink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    setUrlInput('');
    setIsLinkOpen(false);
  }, [editor]);

  const handleKeyDownLink = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApplyLink();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsLinkOpen(false);
    }
  };

  const handleSetTextColor = useCallback((color: string) => {
    if (!editor) return;
    if (color === 'inherit') {
      editor.chain().focus().unsetColor().run();
    } else {
      editor.chain().focus().setColor(color).run();
    }
  }, [editor]);

  const handleSetHighlight = useCallback((color: string) => {
    if (!editor) return;
    if (color === 'none') {
      editor.chain().focus().unsetHighlight().run();
    } else {
      editor.chain().focus().toggleHighlight({ color }).run();
    }
  }, [editor]);

  const handleClearFormatting = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().unsetAllMarks().clearNodes().run();
    setIsLinkOpen(false);
    setIsColorOpen(false);
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{
        duration: [150, 100],
        placement: 'top',
        offset: [0, 10],
        maxWidth: 'none',
        zIndex: 50
      }}
      shouldShow={({ editor: currentEditor, state, from, to }) => {
        // Only show if editor is editable, selection is not empty, and not inside a codeBlock
        if (!currentEditor.isEditable) return false;
        if (state.selection.empty || from === to) return false;
        if (currentEditor.isActive('codeBlock')) return false;
        // Don't show if whole document selected or pure whitespace
        const text = state.doc.textBetween(from, to, ' ').trim();
        return text.length > 0;
      }}
      className="vaultsync-bubble-menu"
    >
      <div 
        className="flex flex-col bg-theme-bg-subtle/95 backdrop-blur-md border border-theme-border rounded-lg shadow-xl text-theme-text text-xs p-1 select-none animate-in fade-in zoom-in-95 duration-150"
        data-testid="vaultsync-bubble-menu-container"
      >
        {/* Main Toolbar Row */}
        <div className="flex items-center gap-0.5">
          {/* Bold */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="In đậm (Ctrl+B)"
            data-active={editor.isActive('bold')}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              editor.isActive('bold')
                ? 'bg-theme-accent-subtle text-theme-accent font-bold'
                : 'text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover'
            }`}
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          {/* Italic */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="In nghiêng (Ctrl+I)"
            data-active={editor.isActive('italic')}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              editor.isActive('italic')
                ? 'bg-theme-accent-subtle text-theme-accent font-bold'
                : 'text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover'
            }`}
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          {/* Underline */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Gạch chân (Ctrl+U)"
            data-active={editor.isActive('underline')}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              editor.isActive('underline')
                ? 'bg-theme-accent-subtle text-theme-accent font-bold'
                : 'text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover'
            }`}
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </button>

          {/* Strike */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Gạch ngang chữ"
            data-active={editor.isActive('strike')}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              editor.isActive('strike')
                ? 'bg-theme-accent-subtle text-theme-accent font-bold'
                : 'text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover'
            }`}
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          {/* Inline Code */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="Mã nội dòng (Ctrl+E)"
            data-active={editor.isActive('code')}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              editor.isActive('code')
                ? 'bg-theme-accent-subtle text-theme-accent font-bold'
                : 'text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-theme-border mx-1" />

          {/* Link Trigger */}
          <button
            type="button"
            onClick={handleOpenLink}
            title={editor.isActive('link') ? 'Sửa liên kết' : 'Chèn liên kết'}
            data-active={editor.isActive('link')}
            className={`p-1.5 rounded transition-colors cursor-pointer flex items-center gap-1 ${
              editor.isActive('link') || isLinkOpen
                ? 'bg-theme-accent-subtle text-theme-accent font-medium'
                : 'text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>

          {/* Color & Highlight Picker Trigger */}
          <button
            type="button"
            onClick={() => {
              setIsColorOpen(prev => !prev);
              setIsLinkOpen(false);
            }}
            title="Màu chữ & Đánh dấu"
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              isColorOpen || editor.isActive('textStyle') || editor.isActive('highlight')
                ? 'bg-theme-accent-subtle text-theme-accent font-medium'
                : 'text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
          </button>

          {/* Clear Formatting */}
          <button
            type="button"
            onClick={handleClearFormatting}
            title="Tẩy định dạng"
            className="p-1.5 rounded text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover transition-colors cursor-pointer"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-theme-border mx-1" />

          {/* Add Inline Comment Button */}
          <button
            type="button"
            onClick={() => {
              if (onAddComment && editor) {
                const { from, to } = editor.state.selection;
                const quotedText = editor.state.doc.textBetween(from, to, ' ').trim();
                onAddComment({ from, to, quotedText });
              }
            }}
            title="Thêm bình luận cho đoạn văn bản này"
            className="px-2 py-1 rounded bg-theme-accent text-white hover:bg-theme-accent-hover active:scale-95 font-medium transition-all cursor-pointer flex items-center gap-1.5 text-[11px] shadow-xs"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span>Bình luận</span>
          </button>
        </div>

        {/* Expandable Inline Link Input Popover */}
        {isLinkOpen && (
          <div className="mt-1.5 pt-1.5 border-t border-theme-border flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-100">
            <input
              ref={urlInputRef}
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={handleKeyDownLink}
              placeholder="Nhập đường dẫn https://..."
              className="flex-1 px-2 py-1 text-xs bg-theme-bg border border-theme-border rounded focus:outline-none focus:border-theme-accent text-theme-text placeholder:text-theme-text-muted"
            />

            <button
              type="button"
              onClick={handleApplyLink}
              title="Áp dụng link (Enter)"
              className="p-1 rounded bg-theme-accent text-white hover:bg-theme-accent-hover transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
            </button>

            {editor.isActive('link') && (
              <>
                <a
                  href={editor.getAttributes('link').href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Mở liên kết trong tab mới"
                  className="p-1 rounded text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={handleUnlink}
                  title="Gỡ liên kết"
                  className="p-1 rounded text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <Unlink className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setIsLinkOpen(false)}
              title="Đóng (Esc)"
              className="p-1 rounded text-theme-text-muted hover:text-theme-text hover:bg-theme-card-hover transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Expandable Color & Highlight Palette Popover */}
        {isColorOpen && (
          <div className="mt-1.5 pt-1.5 border-t border-theme-border flex flex-col gap-2 p-1 animate-in fade-in slide-in-from-top-1 duration-100">
            {/* Text Color Swatches */}
            <div>
              <div className="text-[10px] font-medium text-theme-text-muted mb-1 flex items-center gap-1">
                <Palette className="w-3 h-3" />
                <span>Màu chữ</span>
              </div>
              <div className="flex items-center gap-1.5">
                {TEXT_COLORS.map(item => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => handleSetTextColor(item.value)}
                    title={item.label}
                    className="w-5 h-5 rounded-full border border-theme-border flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer relative"
                    style={{ backgroundColor: item.color }}
                  >
                    {item.value === 'inherit' && (
                      <span className="text-[9px] text-theme-text font-bold">A</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Highlight Background Swatches */}
            <div>
              <div className="text-[10px] font-medium text-theme-text-muted mb-1 flex items-center gap-1">
                <Highlighter className="w-3 h-3" />
                <span>Màu nền đánh dấu</span>
              </div>
              <div className="flex items-center gap-1.5">
                {HIGHLIGHT_COLORS.map(item => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => handleSetHighlight(item.value)}
                    title={item.label}
                    className="w-5 h-5 rounded border border-theme-border flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                    style={{ backgroundColor: item.bg }}
                  >
                    {item.value === 'none' && (
                      <span className="text-[9px] text-theme-text-muted">✕</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </BubbleMenu>
  );
};
