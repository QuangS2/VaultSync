import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  ChevronRight, 
  RefreshCw, 
  CheckCircle2, 
  Users 
} from 'lucide-react';
import * as Y from 'yjs';
import { TiptapEditor } from '../editor/TiptapEditor';
import { SAMPLE_DOCUMENTS } from '../editor/editor-sample-content';
import { ProviderConnectionStatus, AwarenessUser, CollaborationUserOptions } from '../../lib/yjs/types';
import { OnlineCollaboratorsPopover } from './OnlineCollaboratorsPopover';
import { DocumentPermissions } from '../../lib/auth/permissions';

export interface EditorCanvasProps {
  documentId?: string | undefined;
  documentTitle: string;
  folderName: string;
  yDoc?: Y.Doc | undefined;
  provider?: any | undefined;
  user?: CollaborationUserOptions | undefined;
  providerStatus?: ProviderConnectionStatus | undefined;
  awarenessUsers?: AwarenessUser[] | undefined;
  permissions?: DocumentPermissions | undefined;
  guestPermissions?: DocumentPermissions | undefined;
  isOwner?: boolean | undefined;
  onUpdatePermissions?: ((perms: DocumentPermissions) => void) | undefined;
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
  awarenessUsers = [],
  permissions,
  guestPermissions,
  isOwner,
  onUpdatePermissions,
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
  const [isCollaboratorsOpen, setIsCollaboratorsOpen] = useState(false);
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

        {/* Live Collaborators Presence & Room Security Indicators */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Room Online Collaborators Presence Button & Popover */}
          <div className="relative">
            <button
              onClick={() => setIsCollaboratorsOpen(prev => !prev)}
              title="Xem danh sách thành viên trực tuyến trong phòng"
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-theme-card hover:bg-theme-card-hover border border-theme-border text-xs text-theme-text transition-colors cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <Users className="w-3.5 h-3.5 text-theme-accent shrink-0" />
              <span className="font-mono text-[11px]">{awarenessUsers.length > 0 ? awarenessUsers.length : 1} online</span>
            </button>

            <OnlineCollaboratorsPopover
              isOpen={isCollaboratorsOpen}
              onClose={() => setIsCollaboratorsOpen(false)}
              users={awarenessUsers}
              currentUser={user ? { name: user.name, color: user.color, avatar: user.avatar, isLocal: true } : undefined}
              isOwner={isOwner}
              permissions={guestPermissions || permissions}
              onUpdatePermissions={onUpdatePermissions}
              onOpenPermissionsModal={onOpenShareModal}
            />
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
                <span className="hidden md:inline">Đã lưu</span>
              </span>
            )}
          </div>
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
          readOnly={permissions ? !permissions.canEdit : false}
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
            <span>Đang tải tài liệu...</span>
          </div>
        </div>
      )}
    </div>
  );
};
