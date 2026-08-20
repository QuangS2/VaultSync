import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Folder, 
  ChevronRight,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import * as Y from 'yjs';
import { Badge } from '../ui/Badge';
import { TiptapEditor } from '../editor/TiptapEditor';
import { SAMPLE_DOCUMENTS } from '../editor/editor-sample-content';
import { ProviderConnectionStatus, AwarenessUser, CollaborationUserOptions } from '../../lib/yjs/types';

export interface EditorCanvasProps {
  documentId?: string | undefined;
  documentTitle: string;
  folderName: string;
  yDoc?: Y.Doc | undefined;
  provider?: any | undefined;
  user?: CollaborationUserOptions | undefined;
  providerStatus?: ProviderConnectionStatus | undefined;
  awarenessUsers?: AwarenessUser[] | undefined;
  saveStatus?: 'saved' | 'saving' | 'error' | undefined;
  lastSavedTime?: number | undefined;
  onAddInlineComment?: ((draft: { from: number; to: number; quotedText: string }) => void) | undefined;
  onTitleChange?: ((newTitle: string) => void) | undefined;
  onCommentClick?: ((threadId: string) => void) | undefined;
  activeCommentThreadId?: string | null | undefined;
  isDocHydrated?: boolean | undefined;
  onOpenShareModal?: (() => void) | undefined;
  onOpenDiscussionSidebar?: (() => void) | undefined;
  onOpenCommandPalette?: (() => void) | undefined;
  onCreateNewNote?: (() => void) | undefined;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  documentId = 'doc-welcome',
  documentTitle,
  folderName,
  yDoc,
  provider,
  user,
  providerStatus,
  awarenessUsers = [],
  saveStatus = 'saved',
  lastSavedTime,
  isDocHydrated = true,
  onAddInlineComment,
  onTitleChange,
  onCommentClick,
  activeCommentThreadId,
  onOpenShareModal,
  onOpenDiscussionSidebar,
  onOpenCommandPalette,
  onCreateNewNote
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

  const isConnected = providerStatus?.connected ?? false;
  const isConnecting = providerStatus?.connecting ?? false;

  return (
    <div className="flex-1 bg-theme-bg flex flex-col h-full overflow-hidden select-text pb-14 sm:pb-0">
      {/* Top Breadcrumb & Document Metadata Toolbar */}
      <div className="h-11 px-3 sm:px-6 border-b border-theme-border flex items-center justify-between shrink-0 bg-theme-bg-subtle/50 select-none gap-2">
        {/* Breadcrumb Path */}
        <div className="flex items-center gap-1.5 text-xs text-theme-text-muted min-w-0">
          <Folder className="w-3.5 h-3.5 text-theme-accent shrink-0" />
          <span className="truncate max-w-[80px] sm:max-w-[140px] hidden sm:inline">{folderName}</span>
          <ChevronRight className="w-3 h-3 shrink-0 hidden sm:inline" />
          <span className="text-theme-text font-medium truncate max-w-[140px] sm:max-w-[240px] md:max-w-[360px]">{currentTitle}</span>
        </div>

        {/* Live Collaborators Presence & Security Indicators */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Active Collaborators Presence Stack */}
          {awarenessUsers.length > 0 ? (
            <div className="flex items-center -space-x-1.5 overflow-hidden">
              {awarenessUsers.map((u, i) => (
                <div 
                  key={i}
                  title={`${u.name} (Đang trực tuyến)`}
                  className="w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-theme-bg select-none shadow-xs"
                  style={{ backgroundColor: u.color || '#2563eb' }}
                >
                  {u.avatar || u.name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center -space-x-1.5 overflow-hidden">
              <div 
                title="Bạn (Cục bộ)"
                className="w-6 h-6 rounded-full bg-theme-accent text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-theme-bg select-none"
              >
                {user?.name?.charAt(0).toUpperCase() || 'B'}
              </div>
            </div>
          )}

          {/* Connection Indicator */}
          <div className="flex items-center gap-1 text-[11px] text-theme-text-muted font-mono">
            {isConnected ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Wifi className="w-3 h-3 shrink-0" />
                <span className="hidden sm:inline">Đã kết nối</span>
              </span>
            ) : isConnecting ? (
              <span className="flex items-center gap-1 text-amber-500 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
                <span className="hidden sm:inline">Đang kết nối...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-theme-text-muted">
                <WifiOff className="w-3 h-3 shrink-0" />
                <span className="hidden sm:inline">Ngoại tuyến</span>
              </span>
            )}
          </div>

          {/* Real-Time Auto-Save Indicator */}
          <div 
            title={lastSavedTime ? `Đã lưu lúc ${new Date(lastSavedTime).toLocaleTimeString()}` : 'Đã lưu trên máy'}
            className="flex items-center gap-1 text-[11px] text-theme-text-muted font-mono"
          >
            {saveStatus === 'saving' ? (
              <span className="flex items-center gap-1 text-amber-500 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
                <span className="hidden md:inline">Đang lưu...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-theme-text-muted">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                <span className="hidden md:inline">Đã lưu an toàn</span>
              </span>
            )}
          </div>

          <Badge variant="success" size="sm" className="hidden lg:inline-flex">
            <Lock className="w-3 h-3" /> Mã Hóa Bảo Mật
          </Badge>
        </div>
      </div>

      {/* Main Tiptap ProseMirror Editor */}
      {isDocHydrated ? (
        <TiptapEditor
          key={`${documentId}-${provider ? 'collab' : 'local'}`}
          content={content}
          documentTitle={currentTitle}
          onTitleChange={handleTitleChange}
          onChange={(html) => setContent(html)}
          onAddInlineComment={onAddInlineComment}
          yDoc={yDoc}
          provider={provider}
          user={user}
          onCommentClick={onCommentClick}
          activeCommentThreadId={activeCommentThreadId}
          onOpenShareModal={onOpenShareModal}
          onOpenDiscussionSidebar={onOpenDiscussionSidebar}
          onOpenCommandPalette={onOpenCommandPalette}
          onCreateNewNote={onCreateNewNote}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-xs text-theme-text-muted">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-theme-accent" />
            <span>Đang nạp dữ liệu tài liệu bảo mật...</span>
          </div>
        </div>
      )}
    </div>
  );
};
