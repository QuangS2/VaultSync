import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Check, 
  X, 
  CornerDownRight, 
  Lock, 
  Hash, 
  AlertTriangle,
  RotateCcw,
  Trash2,
  Filter
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { InlineCommentAnchorEngine } from '../../lib/yjs/inline-comment-engine';
import { RoomChatEngine, RoomChatMessage } from '../../lib/yjs/room-chat-engine';
import { ThreadWithLivePosition } from '../../lib/yjs/types';

export interface RightDiscussionSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeDocumentTitle: string;
  commentEngine?: InlineCommentAnchorEngine | undefined;
  chatEngine?: RoomChatEngine | undefined;
  activeThreadId?: string | null | undefined;
  onSelectThread?: ((threadId: string | null) => void) | undefined;
  currentAuthor?: {
    id: string;
    name: string;
    avatar?: string | undefined;
    color?: string | undefined;
  } | undefined;
}

export const RightDiscussionSidebar: React.FC<RightDiscussionSidebarProps> = ({
  isOpen,
  onClose,
  activeDocumentTitle,
  commentEngine,
  chatEngine,
  activeThreadId,
  onSelectThread,
  currentAuthor = {
    id: 'user_current',
    name: 'Tôi (Quang Lê)',
    color: '#2563eb'
  }
}) => {
  const [activeTab, setActiveTab] = useState<'threads' | 'chat'>('threads');
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');
  const [threads, setThreads] = useState<ThreadWithLivePosition[]>([]);
  const [chatMessages, setChatMessages] = useState<RoomChatMessage[]>([]);
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [chatInput, setChatInput] = useState('');

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const threadCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // 1. Subscribe to Live Comment Threads
  useEffect(() => {
    if (!commentEngine) {
      // Fallback sample threads if engine is not attached
      return;
    }

    const unsubscribe = commentEngine.onThreadsChange((liveThreads) => {
      setThreads(liveThreads);
    });

    return () => unsubscribe();
  }, [commentEngine]);

  // 2. Subscribe to Live Room Chat Messages
  useEffect(() => {
    if (!chatEngine) return;

    const unsubscribe = chatEngine.onMessagesChange((messages) => {
      setChatMessages(messages);
      // Auto-scroll chat to bottom
      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 50);
    });

    return () => unsubscribe();
  }, [chatEngine]);

  // 3. Auto-scroll to active thread card when activeThreadId changes
  useEffect(() => {
    if (activeThreadId && activeTab === 'threads') {
      const cardEl = threadCardRefs.current[activeThreadId];
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeThreadId, activeTab]);

  // Filter threads
  const filteredThreads = threads.filter(({ thread }) => {
    if (filter === 'unresolved') return !thread.isResolved;
    if (filter === 'resolved') return thread.isResolved;
    return true;
  });

  const handleSendReply = (threadId: string) => {
    const text = replyInputs[threadId]?.trim();
    if (!text) return;

    if (commentEngine) {
      commentEngine.addReply(threadId, {
        authorId: currentAuthor.id,
        authorName: currentAuthor.name,
        authorAvatar: currentAuthor.avatar,
        content: text
      });
    }

    setReplyInputs(prev => ({ ...prev, [threadId]: '' }));
  };

  const handleToggleResolve = (threadId: string, currentState: boolean) => {
    if (commentEngine) {
      commentEngine.toggleResolved(threadId, !currentState);
    }
  };

  const handleDeleteThread = (threadId: string) => {
    if (commentEngine) {
      commentEngine.deleteThread(threadId);
      if (activeThreadId === threadId && onSelectThread) {
        onSelectThread(null);
      }
    }
  };

  const handleSendChatMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;

    if (chatEngine) {
      chatEngine.sendMessage({
        authorId: currentAuthor.id,
        authorName: currentAuthor.name,
        authorAvatar: currentAuthor.avatar,
        authorColor: currentAuthor.color,
        content: text
      });
    }

    setChatInput('');
  };

  if (!isOpen) return null;

  return (
    <aside className="w-80 border-l border-theme-border bg-theme-bg-subtle/40 flex flex-col h-full shrink-0 z-10 transition-all select-none">
      {/* 1. Sidebar Header */}
      <div className="h-11 px-3.5 border-b border-theme-border flex items-center justify-between shrink-0 bg-theme-bg-subtle/80">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-theme-text min-w-0" title={`Tài liệu: ${activeDocumentTitle}`}>
          <MessageSquare className="w-4 h-4 text-theme-accent shrink-0" />
          <span className="truncate">Thảo Luận & Chat</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-theme-text-muted hover:text-theme-text hover:bg-theme-bg-subtle rounded transition-colors shrink-0"
          title="Đóng sidebar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex border-b border-theme-border bg-theme-bg/60 p-1 gap-1 shrink-0">
        <button
          onClick={() => setActiveTab('threads')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'threads'
              ? 'bg-theme-bg text-theme-accent shadow-xs'
              : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-bg-subtle'
          }`}
        >
          <span>Bình Luận</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-theme-border/60 text-theme-text-muted font-bold">
            {threads.filter(t => !t.thread.isResolved).length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'chat'
              ? 'bg-theme-bg text-theme-accent shadow-xs'
              : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-bg-subtle'
          }`}
        >
          <Hash className="w-3 h-3" />
          <span>Phòng Chat</span>
        </button>
      </div>

      {/* 3. Tab Contents */}
      <div className="flex-1 overflow-y-auto min-h-0 select-text">
        {/* =========================================================================
            TAB 1: THREADS LIST (CONTEXTUAL COMMENTS)
            ========================================================================= */}
        {activeTab === 'threads' && (
          <div className="p-3 space-y-3">
            {/* Status Filter Selector */}
            <div className="flex items-center justify-between pb-1 text-[11px] text-theme-text-muted">
              <div className="flex items-center gap-1 font-medium">
                <Filter className="w-3 h-3" />
                <span>Bộ lọc:</span>
              </div>
              <div className="flex items-center gap-1 bg-theme-bg-subtle/80 p-0.5 rounded-md border border-theme-border/50">
                <button
                  onClick={() => setFilter('unresolved')}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    filter === 'unresolved' ? 'bg-theme-bg text-theme-accent shadow-xs font-semibold' : 'text-theme-text-muted hover:text-theme-text'
                  }`}
                >
                  Chưa xong
                </button>
                <button
                  onClick={() => setFilter('resolved')}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    filter === 'resolved' ? 'bg-theme-bg text-theme-accent shadow-xs font-semibold' : 'text-theme-text-muted hover:text-theme-text'
                  }`}
                >
                  Đã xong
                </button>
                <button
                  onClick={() => setFilter('all')}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    filter === 'all' ? 'bg-theme-bg text-theme-accent shadow-xs font-semibold' : 'text-theme-text-muted hover:text-theme-text'
                  }`}
                >
                  Tất cả
                </button>
              </div>
            </div>

            {/* Empty State */}
            {filteredThreads.length === 0 && (
              <div className="text-center py-10 px-4">
                <div className="w-10 h-10 rounded-full bg-theme-bg-subtle mx-auto flex items-center justify-center text-theme-text-muted mb-2.5">
                  <MessageSquare className="w-5 h-5 opacity-60" />
                </div>
                <p className="text-xs font-medium text-theme-text">Không có bình luận nào</p>
                <p className="text-[11px] text-theme-text-muted mt-1 leading-relaxed">
                  Bôi đen đoạn văn bản trong trình soạn thảo và chọn <strong>Thêm bình luận</strong> để mở luồng thảo luận.
                </p>
              </div>
            )}

            {/* Thread Cards List */}
            {filteredThreads.map(({ thread, isOrphaned }) => {
              const isSelected = activeThreadId === thread.id;

              return (
                <div
                  key={thread.id}
                  ref={el => { threadCardRefs.current[thread.id] = el; }}
                  onClick={() => onSelectThread && onSelectThread(thread.id)}
                  className={`group rounded-lg border p-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-500/80 bg-theme-bg shadow-sm ring-1 ring-amber-500/30'
                      : 'border-theme-border bg-theme-bg hover:border-theme-border-strong hover:shadow-xs'
                  }`}
                >
                  {/* Quoted Text Preview Banner */}
                  <div className="mb-2.5 pl-2.5 border-l-2 border-amber-500/80 py-0.5 bg-amber-500/5 rounded-r">
                    <p className="text-[11px] font-serif italic text-theme-text line-clamp-2 leading-relaxed">
                      "{thread.quotedText}"
                    </p>
                    {isOrphaned && (
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-600 dark:text-amber-400 font-sans font-medium">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>Đoạn văn bản gốc đã bị xóa khỏi tài liệu</span>
                      </div>
                    )}
                  </div>

                  {/* Message Replies Flow */}
                  <div className="space-y-2.5 divide-y divide-theme-border/30">
                    {thread.replies.map((reply, idx) => (
                      <div key={reply.id} className={idx > 0 ? 'pt-2' : ''}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold">
                              {reply.authorName.charAt(0)}
                            </div>
                            <span className="text-[11px] font-semibold text-theme-text">
                              {reply.authorName}
                            </span>
                          </div>
                          <span className="text-[9px] text-theme-text-muted font-mono">
                            {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-theme-text-muted leading-relaxed pl-5.5 whitespace-pre-wrap break-words">
                          {reply.content}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Actions & Reply Form */}
                  <div className="mt-3 pt-2.5 border-t border-theme-border/50 flex flex-col gap-2">
                    <div className="flex items-center gap-1.5">
                      <Input
                        placeholder="Trả lời bình luận..."
                        value={replyInputs[thread.id] || ''}
                        onChange={e => setReplyInputs(prev => ({ ...prev, [thread.id]: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendReply(thread.id);
                          }
                        }}
                        className="text-xs flex-1 h-7"
                      />
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleSendReply(thread.id)}
                        disabled={!replyInputs[thread.id]?.trim()}
                        className="h-7 w-7 p-0 flex items-center justify-center shrink-0"
                        title="Gửi phản hồi"
                      >
                        <CornerDownRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Footer Controls: Resolve & Delete */}
                    <div className="flex items-center justify-between pt-1 text-[10px] text-theme-text-muted">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleResolve(thread.id, thread.isResolved);
                        }}
                        className="flex items-center gap-1 hover:text-theme-text transition-colors"
                      >
                        {thread.isResolved ? (
                          <>
                            <RotateCcw className="w-3 h-3 text-amber-500" />
                            <span>Mở lại</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span>Giải quyết</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteThread(thread.id);
                        }}
                        className="flex items-center gap-1 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="Xóa bình luận"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* =========================================================================
            TAB 2: GLOBAL ROOM CHAT (REALTIME E2EE CHATBOX)
            ========================================================================= */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full">
            {/* E2EE Info Pill */}
            <div className="p-2.5 mx-3 mt-3 rounded-md bg-theme-bg border border-theme-border/80 flex items-center gap-2 text-[10px] text-theme-text-muted">
              <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Phòng chat mã hóa đầu-cuối bằng DocumentKey (AES-256-GCM).</span>
            </div>

            {/* Chat Messages List */}
            <div ref={chatScrollRef} className="flex-1 p-3 space-y-3 overflow-y-auto">
              {chatMessages.length === 0 && (
                <div className="text-center py-10 text-theme-text-muted">
                  <Hash className="w-8 h-8 mx-auto opacity-40 mb-2" />
                  <p className="text-xs">Chưa có tin nhắn nào trong phòng</p>
                  <p className="text-[11px] opacity-70 mt-0.5">Hãy gửi lời chào đầu tiên đến đồng đội!</p>
                </div>
              )}

              {chatMessages.map(msg => {
                const isMe = msg.authorId === currentAuthor.id || msg.authorName === currentAuthor.name;

                return (
                  <div 
                    key={msg.id} 
                    className={`flex gap-2 ${isMe ? 'flex-row-reverse items-end' : 'flex-row items-start'}`}
                  >
                    {/* Author Avatar */}
                    <div 
                      className="w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-xs ring-1 ring-theme-border"
                      style={{ backgroundColor: msg.authorColor || (isMe ? currentAuthor.color : '#2563eb') }}
                    >
                      {msg.authorAvatar || msg.authorName.charAt(0).toUpperCase()}
                    </div>

                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%]`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-semibold text-theme-text flex items-center gap-1">
                          {isMe ? (
                            <>
                              <span className="px-1 py-0.2 rounded bg-theme-accent-subtle text-theme-accent text-[9px] font-bold">Tôi</span>
                              <span>{msg.authorName}</span>
                            </>
                          ) : (
                            <span>{msg.authorName}</span>
                          )}
                        </span>
                        <span className="text-[9px] text-theme-text-muted/60 font-mono">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div
                        className={`rounded-xl px-3 py-1.5 text-xs leading-relaxed break-words ${
                          isMe
                            ? 'bg-theme-accent text-white rounded-tr-none shadow-xs'
                            : 'bg-theme-card border border-theme-border text-theme-text rounded-tl-none shadow-xs'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chat Input Bar */}
            <form 
              onSubmit={handleSendChatMessage}
              className="p-3 border-t border-theme-border bg-theme-bg/80 shrink-0 flex items-center gap-1.5"
            >
              <Input
                placeholder="Nhập tin nhắn..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                className="text-xs flex-1 h-8"
              />
              <Button
                type="submit"
                size="sm"
                variant="primary"
                disabled={!chatInput.trim()}
                className="h-8 w-8 p-0 flex items-center justify-center shrink-0"
                title="Gửi tin nhắn"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>
          </div>
        )}
      </div>
    </aside>
  );
};
