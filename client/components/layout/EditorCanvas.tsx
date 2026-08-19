import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Clock, 
  Folder, 
  ChevronRight
} from 'lucide-react';
import * as Y from 'yjs';
import { Badge } from '../ui/Badge';
import { TiptapEditor } from '../editor/TiptapEditor';
import { SAMPLE_DOCUMENTS } from '../editor/editor-sample-content';

export interface EditorCanvasProps {
  documentId?: string | undefined;
  documentTitle: string;
  folderName: string;
  yDoc?: Y.Doc | undefined;
  onAddInlineComment?: (() => void) | undefined;
  onTitleChange?: ((newTitle: string) => void) | undefined;
  onCommentClick?: ((threadId: string) => void) | undefined;
  activeCommentThreadId?: string | null | undefined;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  documentId = 'doc-welcome',
  documentTitle,
  folderName,
  yDoc,
  onAddInlineComment,
  onTitleChange,
  onCommentClick,
  activeCommentThreadId
}) => {
  const [currentTitle, setCurrentTitle] = useState(documentTitle);
  const [content, setContent] = useState<string>(() => {
    return SAMPLE_DOCUMENTS[documentId] || `<h1>${documentTitle}</h1><p>Bắt đầu nhập nội dung tài liệu...</p>`;
  });

  // When switching documents, reload document content
  useEffect(() => {
    setCurrentTitle(documentTitle);
    const sample = SAMPLE_DOCUMENTS[documentId];
    if (sample) {
      setContent(sample);
    } else {
      setContent(`<h1>${documentTitle}</h1><p>Bắt đầu nhập nội dung tài liệu...</p>`);
    }
  }, [documentId, documentTitle]);

  const handleTitleChange = (newTitle: string) => {
    setCurrentTitle(newTitle);
    if (onTitleChange) {
      onTitleChange(newTitle);
    }
  };

  return (
    <div className="flex-1 bg-theme-bg flex flex-col h-full overflow-hidden select-text">
      {/* Top Breadcrumb & Document Metadata Toolbar */}
      <div className="h-11 px-6 border-b border-theme-border flex items-center justify-between shrink-0 bg-theme-bg-subtle/50 select-none">
        {/* Breadcrumb Path */}
        <div className="flex items-center gap-1.5 text-xs text-theme-text-muted">
          <Folder className="w-3.5 h-3.5 text-theme-accent" />
          <span>{folderName}</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-theme-text font-medium truncate max-w-[240px]">{currentTitle}</span>
        </div>

        {/* Live Collaborators Presence & Security Indicators */}
        <div className="flex items-center gap-3">
          {/* Active Collaborators Presence Stack */}
          <div className="flex items-center -space-x-1.5 overflow-hidden">
            <div 
              title="Alice (Chủ phòng) - Đang gõ ở Dòng 14"
              className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-theme-bg select-none"
            >
              A
            </div>
            <div 
              title="Bob (Reviewer) - Đang xem Bình luận"
              className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-theme-bg select-none"
            >
              B
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-theme-text-muted font-mono">
            <Clock className="w-3 h-3 text-theme-text-muted" />
            <span>Lưu tự động: Vừa xong</span>
          </div>

          <Badge variant="success" size="sm" className="hidden sm:inline-flex">
            <Lock className="w-3 h-3" /> AES-256-GCM
          </Badge>
        </div>
      </div>

      {/* Main Tiptap ProseMirror Editor */}
      <TiptapEditor
        content={content}
        documentTitle={currentTitle}
        onTitleChange={handleTitleChange}
        onChange={(html) => setContent(html)}
        onAddInlineComment={onAddInlineComment}
        yDoc={yDoc}
        onCommentClick={onCommentClick}
        activeCommentThreadId={activeCommentThreadId}
      />
    </div>
  );
};
