import React, { useState } from 'react';
import { 
  Lock, 
  Clock, 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Code, 
  Heading1, 
  Heading2, 
  MessageSquarePlus, 
  CheckSquare, 
  Folder, 
  ChevronRight, 
  ShieldCheck 
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export interface EditorCanvasProps {
  documentId?: string;
  documentTitle: string;
  folderName: string;
  onAddInlineComment?: () => void;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  documentTitle,
  folderName,
  onAddInlineComment
}) => {
  const [title, setTitle] = useState(documentTitle);
  const [selectedText, setSelectedText] = useState('');

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      setSelectedText(selection.toString().trim());
    } else {
      setSelectedText('');
    }
  };

  return (
    <div 
      className="flex-1 bg-theme-bg flex flex-col h-full overflow-hidden select-text"
      onMouseUp={handleTextSelection}
    >
      {/* Top Breadcrumb & Document Metadata Toolbar */}
      <div className="h-11 px-6 border-b border-theme-border flex items-center justify-between shrink-0 bg-theme-bg-subtle/50 select-none">
        {/* Breadcrumb Path */}
        <div className="flex items-center gap-1.5 text-xs text-theme-text-muted">
          <Folder className="w-3.5 h-3.5 text-theme-accent" />
          <span>{folderName}</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-theme-text font-medium truncate max-w-[240px]">{title}</span>
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

      {/* Formatting Toolbar / Quick Action Ribbon */}
      <div className="px-6 py-2 border-b border-theme-border bg-theme-bg-subtle/30 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-1 overflow-x-auto">
          <Button variant="ghost" size="icon" title="Tiêu đề 1 (H1)">
            <Heading1 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Tiêu đề 2 (H2)">
            <Heading2 className="w-4 h-4" />
          </Button>
          <div className="w-[1px] h-4 bg-theme-border mx-1" />
          <Button variant="ghost" size="icon" title="In đậm (Ctrl+B)">
            <Bold className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" title="In nghiêng (Ctrl+I)">
            <Italic className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Khối Code">
            <Code className="w-4 h-4" />
          </Button>
          <div className="w-[1px] h-4 bg-theme-border mx-1" />
          <Button variant="ghost" size="icon" title="Danh sách gạch đầu dòng">
            <List className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Danh sách số">
            <ListOrdered className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Danh sách công việc">
            <CheckSquare className="w-4 h-4" />
          </Button>
        </div>

        {/* Floating Add Comment Trigger */}
        {selectedText ? (
          <Button 
            variant="primary" 
            size="sm" 
            onClick={onAddInlineComment}
            className="animate-in fade-in zoom-in-95 duration-150 shadow-sm"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span>Thêm Bình Luận ({selectedText.length} ký tự)</span>
          </Button>
        ) : (
          <span className="text-[11px] text-theme-text-muted hidden md:inline">Gõ <code className="bg-theme-card px-1 py-0.5 rounded border border-theme-border font-mono">/</code> để mở menu lệnh nhanh</span>
        )}
      </div>

      {/* Editor Content Scroll Container */}
      <div className="flex-1 overflow-y-auto px-6 md:px-16 py-8 flex flex-col max-w-4xl w-full mx-auto">
        {/* Document Title Input */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tiêu đề tài liệu không tên..."
          className="text-3xl md:text-4xl font-extrabold text-theme-text bg-transparent border-none focus:outline-none placeholder:text-theme-text-muted mb-6 tracking-tight"
        />

        {/* Rich Content Canvas Simulation */}
        <div className="prose dark:prose-invert max-w-none text-sm text-theme-text-secondary leading-relaxed flex flex-col gap-5">
          <p className="text-base text-theme-text leading-relaxed">
            Chào mừng bạn đến với <strong>VaultSync</strong> — không gian làm việc cộng tác thời gian thực được bảo vệ bởi kiến trúc <span className="bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1 py-0.5 rounded border-b border-amber-500 cursor-pointer" title="Đã neo bình luận (Relative Position)">Mã hóa Đầu-Cuối (End-to-End Encryption / Zero-Knowledge)</span> kết hợp cấu trúc dữ liệu <strong className="text-theme-text">CRDTs (Yjs)</strong>.
          </p>

          {/* Architecture Highlight Block */}
          <div className="bg-theme-card p-5 rounded-xl border border-theme-border flex flex-col gap-3 not-prose">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-theme-text flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Mô hình Bảo mật Zero-Knowledge
              </span>
              <span className="text-[10px] font-mono text-theme-text-muted">RFC 5869 / NIST SP 800-38D</span>
            </div>
            <p className="text-xs text-theme-text-secondary leading-relaxed">
              Máy chủ backend đóng vai trò là một <strong>Người đưa thư mù (Blind Relay)</strong>: chỉ chuyển tiếp các gói tin nhị phân mã hóa mà hoàn toàn không thể đọc hay khai thác dữ liệu người dùng.
            </p>
          </div>

          <h2 className="text-xl font-bold text-theme-text tracking-tight mt-3">1. Nguyên Lý Neo Vị Trí Bất Biến (Yjs Relative Positions)</h2>
          <p>
            Khi bạn tạo một bình luận trên đoạn văn bản <span className="bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1 py-0.5 rounded border-b border-amber-500 cursor-pointer" title="Thread #2">Client-Indexed Monotonic Nonce Structure</span>, điểm neo không lưu chỉ số index tuyệt đối cố định mà gắn trực tiếp vào tọa độ <code>Item ID(client, clock)</code> trong đồ thị CRDT.
          </p>

          {/* Code Snippet Demonstration */}
          <div className="bg-theme-card p-4 rounded-xl border border-theme-border font-mono text-xs text-theme-text overflow-x-auto not-prose">
            <div className="text-theme-text-muted pb-2 border-b border-theme-border mb-2 flex items-center justify-between">
              <span>relative-position-manager.ts</span>
              <span className="text-[10px] text-theme-accent">TypeScript Strict</span>
            </div>
            <pre className="text-theme-text-secondary leading-relaxed">
              <code>{`// Tạo cặp Relative Position cho vùng chọn văn bản
const startRel = Y.createRelativePositionFromTypeIndex(yType, from, -1); // assoc: -1
const endRel = Y.createRelativePositionFromTypeIndex(yType, to, 0);     // assoc: 0

// Giải mã lại vị trí tuyệt đối chính xác ngay cả khi có người chèn chữ phía trên
const liveRange = RelativePositionManager.resolveAbsoluteRange({ startRelPos, endRelPos }, yDoc);`}</code>
            </pre>
          </div>

          <h2 className="text-xl font-bold text-theme-text tracking-tight mt-3">2. Danh Sách Nhiệm Vụ Đang Thực Thi (WBS Checklist)</h2>
          <div className="flex flex-col gap-2 not-prose text-xs text-theme-text">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked readOnly className="rounded text-theme-accent focus:ring-0" />
              <span className="line-through text-theme-text-muted">Task 0.1: Cấu trúc Monorepo & Strict TypeScript 100% (Đã nghiệm thu)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked readOnly className="rounded text-theme-accent focus:ring-0" />
              <span className="font-medium text-theme-text">Task 0.2: Core Layout Shell 3 Vùng & Hệ Thống 3 Theme (Sun / Cloud / Night)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" disabled className="rounded text-theme-text-muted" />
              <span className="text-theme-text-muted">Task 1.1: Động Cơ Mật Mã Web Crypto & Bộ Sinh IV Đơn Điệu</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
