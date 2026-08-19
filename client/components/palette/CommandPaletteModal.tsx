/**
 * Spotlight Command Palette Modal (Cmd+K / Ctrl+K) (11/10 Precision)
 * Instant keyboard-driven navigation, document search, theme switching, and action dispatching.
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  FileText, 
  FolderPlus, 
  Sparkles, 
  ShieldCheck, 
  Cpu, 
  Sun, 
  Cloud, 
  Moon, 
  Download, 
  Share2, 
  X, 
  CornerDownLeft, 
  ArrowUpDown,
  Command,
  FilePlus
} from 'lucide-react';
import { CommandPaletteEngine, PaletteAction } from '../../lib/palette/command-palette-engine';

export interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  engine: CommandPaletteEngine;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  engine
}) => {
  const [query, setQuery] = useState('');
  const [filteredActions, setFilteredActions] = useState<PaletteAction[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setFilteredActions(engine.getFilteredActions());
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, engine]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    engine.setQuery(val);
    const filtered = engine.getFilteredActions();
    setFilteredActions(filtered);
    setSelectedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = selectedIndex < filteredActions.length - 1 ? selectedIndex + 1 : 0;
      setSelectedIndex(next);
      engine.setSelectedIndex(next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = selectedIndex > 0 ? selectedIndex - 1 : filteredActions.length - 1;
      setSelectedIndex(prev);
      engine.setSelectedIndex(prev);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredActions[selectedIndex]) {
        filteredActions[selectedIndex].handler();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll selected item into view smoothly
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const renderIcon = (action: PaletteAction) => {
    switch (action.id) {
      case 'new-doc':
        return <FilePlus className="w-4 h-4 text-blue-500" />;
      case 'new-folder':
        return <FolderPlus className="w-4 h-4 text-amber-500" />;
      case 'open-sandbox':
        return <Sparkles className="w-4 h-4 text-purple-500" />;
      case 'open-inspector':
        return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
      case 'open-crypto':
        return <Cpu className="w-4 h-4 text-sky-500" />;
      case 'share-key':
        return <Share2 className="w-4 h-4 text-indigo-500" />;
      case 'theme-sun':
        return <Sun className="w-4 h-4 text-amber-500" />;
      case 'theme-cloud':
        return <Cloud className="w-4 h-4 text-sky-400" />;
      case 'theme-night':
        return <Moon className="w-4 h-4 text-indigo-400" />;
      case 'export-md':
      case 'export-html':
      case 'export-vault':
        return <Download className="w-4 h-4 text-emerald-500" />;
      default:
        return <FileText className="w-4 h-4 text-theme-text-muted" />;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] sm:pt-[18vh] bg-black/55 backdrop-blur-xs p-3 overflow-hidden animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-theme-bg rounded-2xl border border-theme-border shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Bar Header */}
        <div className="flex items-center px-4 py-3 border-b border-theme-border bg-theme-card">
          <Search className="w-4 h-4 text-theme-text-muted mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tìm kiếm lệnh, tác vụ hoặc ghi chú... (Gõ để lọc)"
            className="flex-1 bg-transparent border-none outline-hidden text-sm text-theme-text placeholder:text-theme-text-muted font-sans"
          />
          {query ? (
            <button
              onClick={() => handleQueryChange('')}
              className="p-1 text-theme-text-muted hover:text-theme-text cursor-pointer rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-theme-text-muted bg-theme-bg rounded border border-theme-border shadow-xs">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          )}
        </div>

        {/* Action List */}
        <div ref={listRef} className="max-h-[380px] overflow-y-auto p-2 flex flex-col gap-0.5">
          {filteredActions.length === 0 ? (
            <div className="text-center py-10 text-theme-text-muted text-xs">
              Không tìm thấy lệnh hoặc tài liệu nào phù hợp với "{query}".
            </div>
          ) : (
            filteredActions.map((action, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={action.id}
                  data-index={index}
                  onClick={() => {
                    action.handler();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors text-xs ${
                    isSelected
                      ? 'bg-theme-accent text-white shadow-xs'
                      : 'hover:bg-theme-card text-theme-text'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1 rounded-lg ${isSelected ? 'text-white' : 'bg-theme-bg-subtle'}`}>
                      {renderIcon(action)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">{action.title}</span>
                      {action.subtitle && (
                        <span className={`text-[10px] truncate ${isSelected ? 'text-white/80' : 'text-theme-text-muted'}`}>
                          {action.subtitle}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-theme-bg-subtle text-theme-text-muted border border-theme-border/60'
                    }`}>
                      {action.category}
                    </span>
                    {action.shortcut && (
                      <kbd className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${
                        isSelected ? 'bg-white/25 text-white' : 'bg-theme-card text-theme-text-muted border border-theme-border shadow-xs'
                      }`}>
                        {action.shortcut}
                      </kbd>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Keyboard Hints */}
        <div className="flex items-center justify-between px-4 py-2 bg-theme-card border-t border-theme-border text-[11px] text-theme-text-muted font-mono select-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" /> Điều hướng
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3" /> Chọn
            </span>
          </div>
          <span>Esc để đóng</span>
        </div>

      </div>
    </div>
  );
};
