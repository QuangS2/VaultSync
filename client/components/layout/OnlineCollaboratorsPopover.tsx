import React, { useRef, useEffect, useState } from 'react';
import { ShieldCheck, UserCheck, Users, Wifi, ChevronLeft, ChevronRight, X, Shield, Settings2, Edit3, Eye } from 'lucide-react';
import { AwarenessUser } from '../../lib/yjs/types';
import { DocumentPermissions, DEFAULT_EDITOR_PERMISSIONS, DEFAULT_VIEWER_PERMISSIONS } from '../../lib/auth/permissions';

export interface OnlineCollaboratorsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  users: AwarenessUser[];
  currentUser?: AwarenessUser | undefined;
  isOwner?: boolean | undefined;
  permissions?: DocumentPermissions | undefined;
  onUpdatePermissions?: ((perms: DocumentPermissions) => void) | undefined;
  onOpenPermissionsModal?: (() => void) | undefined;
}

const PAGE_SIZE = 10;

export const OnlineCollaboratorsPopover: React.FC<OnlineCollaboratorsPopoverProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  isOwner = false,
  permissions,
  onUpdatePermissions,
  onOpenPermissionsModal
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Close on click outside or escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Reset page when list or open state changes
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
    }
  }, [isOpen, users.length]);

  if (!isOpen) return null;

  // Deduplicate users or ensure current user is listed
  const displayList = users.length > 0 ? users : currentUser ? [currentUser] : [];
  const totalPages = Math.max(1, Math.ceil(displayList.length / PAGE_SIZE));
  const validPage = Math.min(currentPage, totalPages);
  const paginatedList = displayList.slice((validPage - 1) * PAGE_SIZE, validPage * PAGE_SIZE);

  const isViewer = permissions?.role === 'viewer' || permissions?.canEdit === false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0 sm:absolute sm:inset-auto sm:top-10 sm:right-0">
      {/* Mobile backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-xs sm:hidden transition-opacity"
        onClick={onClose}
      />

      {/* Popover Card */}
      <div
        ref={popoverRef}
        className="relative w-full max-w-sm sm:w-84 bg-theme-card border border-theme-border rounded-xl shadow-2xl z-10 p-4 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150 select-none backdrop-blur-md"
      >
        {/* Popover Header */}
        <div className="flex items-center justify-between pb-2 border-b border-theme-border text-xs">
          <div className="flex items-center gap-2 font-semibold text-theme-text">
            <Users className="w-4 h-4 text-theme-accent" />
            <span>Thành viên trong phòng ({displayList.length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Đang đồng bộ
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-theme-text-muted hover:text-theme-text sm:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Owner Live Permissions Management Bar */}
        {isOwner && onUpdatePermissions && (
          <div className="p-2.5 rounded-lg bg-theme-bg-subtle/80 border border-theme-border flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-theme-text flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-theme-accent" />
                <span>Quyền của khách trong phòng:</span>
              </span>
              {onOpenPermissionsModal && (
                <button
                  onClick={onOpenPermissionsModal}
                  className="text-[10px] text-theme-accent hover:underline flex items-center gap-0.5 cursor-pointer"
                  title="Cài đặt quyền chi tiết"
                >
                  <Settings2 className="w-3 h-3" />
                  <span>Chi tiết</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5 bg-theme-card p-1 rounded-lg border border-theme-border text-xs">
              <button
                type="button"
                onClick={() => onUpdatePermissions({ ...DEFAULT_EDITOR_PERMISSIONS })}
                className={`py-1 px-2 rounded-md font-medium text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  !isViewer
                    ? 'bg-theme-accent text-white shadow-xs font-semibold'
                    : 'text-theme-text-muted hover:text-theme-text'
                }`}
              >
                <Edit3 className="w-3 h-3" />
                <span>Chỉnh sửa</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdatePermissions({ ...DEFAULT_VIEWER_PERMISSIONS })}
                className={`py-1 px-2 rounded-md font-medium text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  isViewer
                    ? 'bg-amber-600 text-white shadow-xs font-semibold'
                    : 'text-theme-text-muted hover:text-theme-text'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Chỉ xem</span>
              </button>
            </div>
          </div>
        )}

        {/* Collaborators List (Paginated max 10 per page) */}
        <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
          {paginatedList.map((user, idx) => {
            const globalIndex = (validPage - 1) * PAGE_SIZE + idx;
            const isLocalSession = user.isLocal ?? (currentUser && user.name === currentUser.name && globalIndex === 0);
            const isSameAccountOtherDevice = !isLocalSession && currentUser && user.name === currentUser.name;

            return (
              <div
                key={user.clientId ?? globalIndex}
                className="flex items-center justify-between p-2 rounded-lg bg-theme-bg-subtle/70 hover:bg-theme-bg-subtle transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs ring-1 ring-theme-border"
                    style={{ backgroundColor: user.color || '#2563eb' }}
                  >
                    {user.avatar || user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium text-theme-text truncate flex items-center gap-1">
                      {user.name}
                      {isLocalSession && (
                        <span className="text-[10px] text-theme-text-muted font-normal">(Bạn)</span>
                      )}
                      {isSameAccountOtherDevice && (
                        <span className="text-[10px] text-theme-text-muted font-normal">(Thiết bị khác)</span>
                      )}
                    </span>
                    <span className="text-[10px] text-theme-text-muted flex items-center gap-1">
                      <Wifi className="w-2.5 h-2.5 text-emerald-500" />
                      <span>Đang xem tài liệu</span>
                    </span>
                  </div>
                </div>

                {isLocalSession ? (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-theme-accent/10 text-theme-accent shrink-0">
                    Chủ phòng
                  </span>
                ) : (
                  <div className="flex items-center gap-1 shrink-0">
                    {isOwner && onUpdatePermissions ? (
                      <button
                        onClick={() => onUpdatePermissions(isViewer ? { ...DEFAULT_EDITOR_PERMISSIONS } : { ...DEFAULT_VIEWER_PERMISSIONS })}
                        className={`text-[10px] font-medium px-2 py-0.5 rounded border transition-colors cursor-pointer flex items-center gap-1 ${
                          isViewer
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                            : 'bg-theme-card border-theme-border text-theme-text-muted hover:text-theme-text'
                        }`}
                        title="Bấm để chuyển đổi quyền nhanh"
                      >
                        <UserCheck className="w-3 h-3 text-emerald-500" />
                        <span>{isViewer ? 'Chỉ xem' : 'Chỉnh sửa'}</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-theme-card border border-theme-border text-theme-text-muted shrink-0 flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-emerald-500" />
                        <span>{isViewer ? 'Chỉ xem' : 'Cộng tác'}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pagination Bar when users > 10 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t border-theme-border text-xs text-theme-text-muted">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={validPage <= 1}
              className="flex items-center gap-1 px-2 py-1 rounded bg-theme-bg-subtle hover:bg-theme-card border border-theme-border disabled:opacity-40 disabled:cursor-not-allowed text-[11px] cursor-pointer"
            >
              <ChevronLeft className="w-3 h-3" />
              <span>Trước</span>
            </button>
            <span className="text-[11px] font-mono">
              Trang {validPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={validPage >= totalPages}
              className="flex items-center gap-1 px-2 py-1 rounded bg-theme-bg-subtle hover:bg-theme-card border border-theme-border disabled:opacity-40 disabled:cursor-not-allowed text-[11px] cursor-pointer"
            >
              <span>Sau</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Security Footer Notice */}
        <div className="pt-2 border-t border-theme-border flex items-start gap-2 text-[10px] text-theme-text-muted leading-relaxed">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <span>
            Đang kết nối cộng tác trực tiếp theo thời gian thực.
          </span>
        </div>
      </div>
    </div>
  );
};
