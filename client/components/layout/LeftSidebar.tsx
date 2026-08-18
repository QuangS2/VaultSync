import React, { useState } from 'react';
import {
  Folder,
  FileText,
  ChevronRight,
  ChevronDown,
  Search,
  Star,
  Trash2,
  HardDrive,
  FolderPlus,
  FilePlus
} from 'lucide-react';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';

export interface DocumentItem {
  id: string;
  title: string;
  type: 'document' | 'folder';
  children?: DocumentItem[];
  isExpanded?: boolean;
  isFavorite?: boolean;
}

export interface LeftSidebarProps {
  isOpen: boolean;
  activeDocId: string;
  onSelectDoc: (id: string) => void;
  onCreateDoc: (folderId?: string) => void;
  onCreateFolder: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  isOpen,
  activeDocId,
  onSelectDoc,
  onCreateDoc,
  onCreateFolder
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'folder-core': true,
    'folder-crypto': true,
    'folder-guides': false
  });

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const sampleTree: DocumentItem[] = [
    {
      id: 'folder-core',
      title: 'Kiến Trúc Cốt Lõi',
      type: 'folder',
      children: [
        { id: 'doc-welcome', title: 'Chào mừng đến VaultSync', type: 'document' },
        { id: 'doc-crdt-yjs', title: 'Nguyên lý Yjs & CRDTs', type: 'document' },
        { id: 'doc-blind-relay', title: 'Giao thức WebSocket Blind Relay', type: 'document' }
      ]
    },
    {
      id: 'folder-crypto',
      title: 'Mật Mã Học (E2EE)',
      type: 'folder',
      children: [
        { id: 'doc-envelope', title: 'Phân Tầng Khóa Envelope', type: 'document' },
        { id: 'doc-webcrypto', title: 'Tăng Tốc Phần Cứng AES-NI', type: 'document' },
        { id: 'doc-relative-pos', title: 'Neo Vị Trí Relative Positions', type: 'document' }
      ]
    },
    {
      id: 'folder-guides',
      title: 'Tài Liệu Hướng Dẫn',
      type: 'folder',
      children: [
        { id: 'doc-recruiter-demo', title: 'Hướng Dẫn Recruiter Sandbox', type: 'document' },
        { id: 'doc-deployment', title: 'Triển Khai Docker & CI/CD', type: 'document' }
      ]
    }
  ];

  if (!isOpen) return null;

  return (
    <aside className="w-64 bg-theme-bg-subtle border-r border-theme-border flex flex-col shrink-0 select-none h-full transition-all duration-200">
      {/* Workspace Header & Switcher */}
      <div className="p-3 border-b border-theme-border flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-6 h-6 rounded bg-theme-accent-subtle text-theme-accent flex items-center justify-center text-xs font-bold font-mono">
            V
          </div>
          <span className="font-semibold text-xs text-theme-text truncate">Engineering Vault</span>
        </div>
        <Badge variant="outline" size="sm">Local-First</Badge>
      </div>

      {/* Quick Search */}
      <div className="p-3 border-b border-theme-border">
        <Input
          placeholder="Tìm kiếm tài liệu... (Cmd+K)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          prefixIcon={<Search className="w-3.5 h-3.5" />}
        />
      </div>

      {/* Quick Filter Navigation */}
      <div className="px-2 py-2 border-b border-theme-border flex flex-col gap-0.5 text-xs text-theme-text-secondary">
        <button className="flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-theme-card-hover text-theme-text font-medium transition-colors cursor-pointer">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-theme-accent" />
            <span>Tất cả ghi chú</span>
          </div>
          <span className="text-[10px] font-mono text-theme-text-muted">8</span>
        </button>
        <button className="flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-theme-card-hover text-theme-text-secondary hover:text-theme-text transition-colors cursor-pointer">
          <div className="flex items-center gap-2">
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span>Yêu thích</span>
          </div>
          <span className="text-[10px] font-mono text-theme-text-muted">3</span>
        </button>
        <button className="flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-theme-card-hover text-theme-text-secondary hover:text-theme-text transition-colors cursor-pointer">
          <div className="flex items-center gap-2">
            <Trash2 className="w-3.5 h-3.5 text-theme-text-muted" />
            <span>Thùng rác</span>
          </div>
        </button>
      </div>

      {/* File Tree Section */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        <div className="flex items-center justify-between px-2 pt-2 pb-1 text-[11px] font-semibold text-theme-text-muted uppercase tracking-wider">
          <span>Không Gian Làm Việc</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onCreateDoc()}
              title="Tạo ghi chú mới"
              className="p-1 rounded hover:bg-theme-card-hover text-theme-text-secondary hover:text-theme-text cursor-pointer"
            >
              <FilePlus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onCreateFolder}
              title="Tạo thư mục mới"
              className="p-1 rounded hover:bg-theme-card-hover text-theme-text-secondary hover:text-theme-text cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Hierarchical Folder & Document Tree Nodes */}
        {sampleTree.map((folder) => {
          const isExpanded = expandedFolders[folder.id] ?? false;
          return (
            <div key={folder.id} className="flex flex-col">
              {/* Folder Node */}
              <button
                onClick={() => toggleFolder(folder.id)}
                className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-theme-card-hover text-xs font-medium text-theme-text transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-theme-text-muted shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-theme-text-muted shrink-0" />
                  )}
                  <Folder className="w-3.5 h-3.5 text-theme-accent shrink-0" />
                  <span className="truncate">{folder.title}</span>
                </div>
                <span className="text-[10px] font-mono text-theme-text-muted">{folder.children?.length}</span>
              </button>

              {/* Children Documents */}
              {isExpanded && folder.children && (
                <div className="ml-4 pl-2 border-l border-theme-border flex flex-col gap-0.5 mt-0.5">
                  {folder.children.map((doc) => {
                    const isActive = doc.id === activeDocId;
                    return (
                      <button
                        key={doc.id}
                        onClick={() => onSelectDoc(doc.id)}
                        className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs transition-colors cursor-pointer ${isActive ? 'bg-theme-accent-subtle text-theme-accent font-medium' : 'text-theme-text-secondary hover:text-theme-text hover:bg-theme-card-hover'}`}
                      >
                        <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-theme-accent' : 'text-theme-text-muted'}`} />
                        <span className="truncate">{doc.title}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Storage Stats */}
      <div className="p-3 border-t border-theme-border bg-theme-card/60 flex items-center justify-between text-[11px] text-theme-text-muted">
        <div className="flex items-center gap-1.5">
          <HardDrive className="w-3.5 h-3.5 text-theme-accent" />
          <span>Mã hóa IndexedDB</span>
        </div>
        <span className="font-mono text-emerald-600 dark:text-emerald-400">128 KB</span>
      </div>
    </aside>
  );
};
