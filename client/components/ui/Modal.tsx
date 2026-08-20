import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md'
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose} 
      />

      {/* Dialog / Mobile Bottom Sheet Body */}
      <div className={`relative w-full ${maxWidthClasses} max-h-[92vh] max-h-[92dvh] bg-theme-bg-subtle border-t sm:border border-theme-border rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden z-10 flex flex-col sm:my-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-theme-border shrink-0">
          <div className="min-w-0 pr-2">
            <h3 className="text-sm font-semibold text-theme-text truncate">{title}</h3>
            {description && (
              <p className="text-xs text-theme-text-muted mt-0.5 line-clamp-2">{description}</p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close dialog" className="shrink-0 h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 text-xs text-theme-text-secondary leading-relaxed overflow-y-auto flex-1 overscroll-contain">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-4 sm:px-5 py-3 bg-theme-card border-t border-theme-border flex items-center justify-end gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
