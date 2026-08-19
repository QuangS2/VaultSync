import React, { useRef, useEffect } from 'react';
import { ShieldCheck, UserCheck, Users, Wifi } from 'lucide-react';
import { AwarenessUser } from '../../lib/yjs/types';

export interface OnlineCollaboratorsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  users: AwarenessUser[];
  currentUser?: AwarenessUser | undefined;
}

export const OnlineCollaboratorsPopover: React.FC<OnlineCollaboratorsPopoverProps> = ({
  isOpen,
  onClose,
  users,
  currentUser
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

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

  if (!isOpen) return null;

  // Deduplicate users or ensure current user is listed
  const displayList = users.length > 0 ? users : currentUser ? [currentUser] : [];

  return (
    <div
      ref={popoverRef}
      className="absolute top-12 right-16 sm:right-48 w-72 bg-theme-card border border-theme-border rounded-xl shadow-xl z-50 p-3.5 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150 select-none backdrop-blur-md"
    >
      {/* Popover Header */}
      <div className="flex items-center justify-between pb-2 border-b border-theme-border text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-theme-text">
          <Users className="w-3.5 h-3.5 text-theme-accent" />
          <span>Thành viên trực tuyến ({displayList.length})</span>
        </div>
        <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Đang đồng bộ
        </span>
      </div>

      {/* Collaborators List */}
      <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
        {displayList.map((user, idx) => {
          const isLocalSession = user.isLocal ?? (currentUser && user.name === currentUser.name && idx === 0);
          const isSameAccountOtherDevice = !isLocalSession && currentUser && user.name === currentUser.name;

          return (
            <div
              key={user.clientId ?? idx}
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
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-theme-card border border-theme-border text-theme-text-muted shrink-0 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-emerald-500" />
                  Cộng tác
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Security Footer Notice */}
      <div className="pt-2 border-t border-theme-border flex items-start gap-2 text-[10px] text-theme-text-muted leading-relaxed">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <span>
          Tất cả thao tác gõ và con trỏ chuột được bảo vệ bằng mã hóa đầu-cuối qua WebSocket Relay.
        </span>
      </div>
    </div>
  );
};
