import React, { useState } from 'react';
import { 
  MessageSquare, 
  Send, 
  Check, 
  X, 
  CornerDownRight, 
  Lock, 
  Hash
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export interface CommentMessageItem {
  id: string;
  author: string;
  avatarColor: string;
  content: string;
  time: string;
}

export interface ThreadItem {
  id: string;
  quotedText: string;
  isResolved: boolean;
  isOrphaned?: boolean;
  messages: CommentMessageItem[];
  createdAt: string;
}

export interface RightDiscussionSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeDocumentTitle: string;
}

export const RightDiscussionSidebar: React.FC<RightDiscussionSidebarProps> = ({
  isOpen,
  onClose,
  activeDocumentTitle
}) => {
  const [activeTab, setActiveTab] = useState<'threads' | 'chat'>('threads');
  const [filter, setFilter] = useState<'all' | 'unresolved'>('unresolved');
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [chatInput, setChatInput] = useState('');

  // Sample Contextual Threads anchored via Yjs Relative Positions
  const [sampleThreads, setSampleThreads] = useState<ThreadItem[]>([
    {
      id: 'thread-1',
      quotedText: 'Sự kết hợp giữa Bảo mật Tuyệt đối (Zero-Knowledge) và CRDTs',
      isResolved: false,
      isOrphaned: false,
      createdAt: '10 phút trước',
      messages: [
        {
          id: 'm1',
          author: 'Alice (Trưởng Nhóm)',
          avatarColor: 'bg-blue-500',
          content: 'Đã hoàn thiện module AES-256-GCM với AAD binding để chống tấn công hoán đổi bản mã.',
          time: '10 phút trước'
        },
        {
          id: 'm2',
          author: 'Bob (Reviewer)',
          avatarColor: 'bg-emerald-500',
          content: 'Tuyệt vời! Cần lưu ý thêm kiểm tra tính kết hợp assoc: -1 cho start anchor nhé.',
          time: '5 phút trước'
        }
      ]
    },
    {
      id: 'thread-2',
      quotedText: 'Client-Indexed Monotonic Nonce Structure',
      isResolved: false,
      isOrphaned: false,
      createdAt: '25 phút trước',
      messages: [
        {
          id: 'm3',
          author: 'Charlie (Bảo Mật)',
          avatarColor: 'bg-indigo-500',
          content: 'Cấu trúc 12 bytes IV (4B Client ID + 2B Epoch + 6B Counter) triệt tiêu hoàn toàn nguy cơ đụng độ Nonce.',
          time: '25 phút trước'
        }
      ]
    }
  ]);

  // Sample Global Chat Messages
  const [chatMessages, setChatMessages] = useState<CommentMessageItem[]>([
    {
      id: 'c1',
      author: 'Alice',
      avatarColor: 'bg-blue-500',
      content: 'Chào cả phòng! Mọi người kiểm tra nhánh develop nhé.',
      time: '14:20'
    },
    {
      id: 'c2',
      author: 'Bob',
      avatarColor: 'bg-emerald-500',
      content: 'Đang review code phần WebSocket Blind Relay, thông lượng rất ấn tượng!',
      time: '14:22'
    }
  ]);

  const toggleResolve = (threadId: string) => {
    setSampleThreads(prev => prev.map(t => t.id === threadId ? { ...t, isResolved: !t.isResolved } : t));
  };

  const sendReply = (threadId: string) => {
    const text = replyInputs[threadId]?.trim();
    if (!text) return;

    setSampleThreads(prev => prev.map(t => {
      if (t.id === threadId) {
        return {
          ...t,
          messages: [
            ...t.messages,
            {
              id: `m_${Date.now()}`,
              author: 'Bạn (Người Dùng)',
              avatarColor: 'bg-theme-accent',
              content: text,
              time: 'Vừa xong'
            }
          ]
        };
      }
      return t;
    }));

    setReplyInputs(prev => ({ ...prev, [threadId]: '' }));
  };

  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setChatMessages(prev => [
      ...prev,
      {
        id: `c_${Date.now()}`,
        author: 'Bạn (Người Dùng)',
        avatarColor: 'bg-theme-accent',
        content: chatInput.trim(),
        time: 'Vừa xong'
      }
    ]);
    setChatInput('');
  };

  if (!isOpen) return null;

  const filteredThreads = sampleThreads.filter(t => filter === 'all' || !t.isResolved);

  return (
    <aside className="w-80 bg-theme-bg-subtle border-l border-theme-border flex flex-col shrink-0 select-none h-full transition-all duration-200">
      {/* Header & Tabs */}
      <div className="p-3 border-b border-theme-border flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold text-xs text-theme-text">
            <MessageSquare className="w-4 h-4 text-theme-accent" />
            <span>Thảo Luận & Chat</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Đóng bảng thảo luận">
            <X className="w-4 h-4 text-theme-text-muted" />
          </Button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 bg-theme-card p-1 rounded-lg border border-theme-border">
          <button
            onClick={() => setActiveTab('threads')}
            className={`py-1 text-xs font-medium rounded-md transition-colors ${activeTab === 'threads' ? 'bg-theme-bg-subtle text-theme-text shadow-xs' : 'text-theme-text-muted hover:text-theme-text'}`}
          >
            Bình Luận ({sampleThreads.filter(t => !t.isResolved).length})
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`py-1 text-xs font-medium rounded-md transition-colors ${activeTab === 'chat' ? 'bg-theme-bg-subtle text-theme-text shadow-xs' : 'text-theme-text-muted hover:text-theme-text'}`}
          >
            Phòng Chat
          </button>
        </div>
      </div>

      {/* Tab 1: Contextual Inline Threads */}
      {activeTab === 'threads' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sub-filter */}
          <div className="px-3 py-2 border-b border-theme-border flex items-center justify-between text-[11px]">
            <span className="text-theme-text-muted">Bộ lọc trạng thái:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilter('unresolved')}
                className={`px-2 py-0.5 rounded transition-colors ${filter === 'unresolved' ? 'bg-theme-accent-subtle text-theme-accent font-medium' : 'text-theme-text-muted hover:text-theme-text'}`}
              >
                Chưa xong
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-2 py-0.5 rounded transition-colors ${filter === 'all' ? 'bg-theme-accent-subtle text-theme-accent font-medium' : 'text-theme-text-muted hover:text-theme-text'}`}
              >
                Tất cả
              </button>
            </div>
          </div>

          {/* Threads List */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            {filteredThreads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center text-theme-text-muted text-xs">
                <MessageSquare className="w-8 h-8 opacity-30 mb-2" />
                <p>Không có bình luận nào.</p>
                <p className="text-[11px] mt-1 text-theme-text-muted">Bôi đen văn bản trong tài liệu để tạo bình luận mới.</p>
              </div>
            ) : (
              filteredThreads.map(thread => (
                <div 
                  key={thread.id} 
                  className={`bg-theme-card border rounded-xl p-3 flex flex-col gap-2.5 transition-all ${thread.isResolved ? 'opacity-60 border-theme-border' : 'border-theme-border hover:border-theme-accent/40 shadow-xs'}`}
                >
                  {/* Quoted Text Snapshot */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="border-l-2 border-amber-500 pl-2 text-[11px] text-theme-text-secondary italic line-clamp-2">
                      "{thread.quotedText}"
                    </div>
                    <button
                      onClick={() => toggleResolve(thread.id)}
                      title={thread.isResolved ? 'Đánh dấu chưa giải quyết' : 'Đánh dấu đã giải quyết'}
                      className={`p-1 rounded-md shrink-0 transition-colors ${thread.isResolved ? 'bg-emerald-500/10 text-emerald-600' : 'hover:bg-theme-bg-subtle text-theme-text-muted hover:text-emerald-500'}`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Messages Flow */}
                  <div className="flex flex-col gap-2 pt-1">
                    {thread.messages.map(msg => (
                      <div key={msg.id} className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-4 h-4 rounded-full ${msg.avatarColor} text-white flex items-center justify-center text-[9px] font-bold`}>
                              {msg.author.charAt(0)}
                            </div>
                            <span className="font-medium text-theme-text">{msg.author}</span>
                          </div>
                          <span className="text-[10px] text-theme-text-muted font-mono">{msg.time}</span>
                        </div>
                        <p className="text-theme-text-secondary pl-5 leading-relaxed">{msg.content}</p>
                      </div>
                    ))}
                  </div>

                  {/* Reply Input Box */}
                  {!thread.isResolved && (
                    <div className="flex items-center gap-1.5 pt-2 border-t border-theme-border">
                      <Input
                        placeholder="Trả lời bình luận..."
                        value={replyInputs[thread.id] || ''}
                        onChange={(e) => setReplyInputs(prev => ({ ...prev, [thread.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            sendReply(thread.id);
                          }
                        }}
                      />
                      <Button variant="secondary" size="icon" onClick={() => sendReply(thread.id)}>
                        <CornerDownRight className="w-3.5 h-3.5 text-theme-accent" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Global Workspace Chat */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chat Room Metadata */}
          <div className="px-3 py-2 border-b border-theme-border flex items-center justify-between text-[11px] text-theme-text-muted">
            <div className="flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-theme-accent" />
              <span className="truncate max-w-[180px] font-medium text-theme-text">{activeDocumentTitle}</span>
            </div>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono">
              <Lock className="w-3 h-3" /> E2EE
            </span>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            {chatMessages.map(msg => (
              <div key={msg.id} className="flex flex-col gap-1 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-4 h-4 rounded-full ${msg.avatarColor} text-white flex items-center justify-center text-[9px] font-bold`}>
                      {msg.author.charAt(0)}
                    </div>
                    <span className="font-medium text-theme-text">{msg.author}</span>
                  </div>
                  <span className="text-[10px] text-theme-text-muted font-mono">{msg.time}</span>
                </div>
                <p className="text-theme-text-secondary pl-5 leading-relaxed bg-theme-card p-2 rounded-lg border border-theme-border">
                  {msg.content}
                </p>
              </div>
            ))}
          </div>

          {/* Chat Input Form */}
          <form onSubmit={sendChatMessage} className="p-3 border-t border-theme-border bg-theme-card/40 flex items-center gap-1.5">
            <Input
              placeholder="Nhập tin nhắn mã hóa..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <Button variant="primary" size="icon" type="submit">
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      )}
    </aside>
  );
};
