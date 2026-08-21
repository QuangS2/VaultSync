/**
 * Production Slash Command Extension for VaultSync (11/10 Precision)
 * Provides a Notion-style '/' Floating Command Palette with fuzzy search,
 * categories, keyboard navigation, and viewport boundary protection.
 */

import { Extension, Editor, Range } from '@tiptap/core';
import Suggestion, { SuggestionProps } from '@tiptap/suggestion';
import { PluginKey } from 'prosemirror-state';

export interface CommandItem {
  id: string;
  title: string;
  description: string;
  category: 'VĂN BẢN' | 'DANH SÁCH' | 'KHỐI NÂNG CAO';
  icon: string;
  keywords: string[];
  command: ({ editor, range }: { editor: Editor; range: Range }) => void;
}

export const SlashCommandsList: CommandItem[] = [
  // 1. VĂN BẢN
  {
    id: 'paragraph',
    title: 'Văn bản thường',
    description: 'Bắt đầu viết văn bản thông thường',
    category: 'VĂN BẢN',
    icon: '📝',
    keywords: ['text', 'paragraph', 'van ban', 'p'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    }
  },
  {
    id: 'heading-1',
    title: 'Tiêu đề 1 (H1)',
    description: 'Tiêu đề phần lớn cho trang',
    category: 'VĂN BẢN',
    icon: 'H1',
    keywords: ['h1', 'heading 1', 'tieu de 1', 'title', 'large'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
    }
  },
  {
    id: 'heading-2',
    title: 'Tiêu đề 2 (H2)',
    description: 'Tiêu đề mục vừa cho các phần chính',
    category: 'VĂN BẢN',
    icon: 'H2',
    keywords: ['h2', 'heading 2', 'tieu de 2', 'subtitle', 'medium'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
    }
  },
  {
    id: 'heading-3',
    title: 'Tiêu đề 3 (H3)',
    description: 'Tiêu đề mục nhỏ cho các tiểu mục',
    category: 'VĂN BẢN',
    icon: 'H3',
    keywords: ['h3', 'heading 3', 'tieu de 3', 'small'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
    }
  },

  // 2. DANH SÁCH & CÔNG VIỆC
  {
    id: 'task-list',
    title: 'Danh sách công việc',
    description: 'Theo dõi tiến độ với checkbox tương tác',
    category: 'DANH SÁCH',
    icon: '☑️',
    keywords: ['task', 'todo', 'checklist', 'cong viec', 'check'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    }
  },
  {
    id: 'bullet-list',
    title: 'Danh sách gạch đầu dòng',
    description: 'Tạo danh sách chấm tròn đơn giản',
    category: 'DANH SÁCH',
    icon: '•',
    keywords: ['bullet', 'list', 'danh sach', 'ul', 'cham'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    }
  },
  {
    id: 'ordered-list',
    title: 'Danh sách có số thứ tự',
    description: 'Tạo danh sách tuần tự (1, 2, 3...)',
    category: 'DANH SÁCH',
    icon: '1.',
    keywords: ['ordered', 'number', 'so', 'danh sach so', 'ol'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    }
  },

  // 3. KHỐI NÂNG CAO
  {
    id: 'code-block',
    title: 'Khối mã nguồn (Code Block)',
    description: 'Đoạn mã có highlight cú pháp đa ngôn ngữ',
    category: 'KHỐI NÂNG CAO',
    icon: '</>',
    keywords: ['code', 'codeblock', 'lap trinh', 'syntax', 'ts', 'js', 'py', 'sql'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    }
  },
  {
    id: 'blockquote',
    title: 'Trích dẫn (Blockquote)',
    description: 'Tạo khối trích dẫn nổi bật có viền màu',
    category: 'KHỐI NÂNG CAO',
    icon: '💬',
    keywords: ['quote', 'blockquote', 'trich dan', 'callout'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    }
  },
  {
    id: 'horizontal-rule',
    title: 'Đường phân cách (Divider)',
    description: 'Chèn đường kẻ ngang ngăn cách nội dung',
    category: 'KHỐI NÂNG CAO',
    icon: '➖',
    keywords: ['divider', 'hr', 'line', 'duong ke', 'phan cach'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    }
  }
];

export function filterSlashCommands(query: string): CommandItem[] {
  if (!query.trim()) return SlashCommandsList;
  const q = query.toLowerCase().trim();

  return SlashCommandsList.filter(item => {
    const titleMatch = item.title.toLowerCase().includes(q);
    const descMatch = item.description.toLowerCase().includes(q);
    const keywordMatch = item.keywords.some(k => k.toLowerCase().includes(q));
    return titleMatch || descMatch || keywordMatch;
  });
}

export const SlashCommandPluginKey = new PluginKey('vaultsync-slash-command');

export function createSlashCommandRenderer() {
  let popupEl: HTMLElement | null = null;
  let selectedIndex = 0;
  let items: CommandItem[] = [];
  let currentProps: SuggestionProps | null = null;

  function renderMenu() {
    if (!popupEl || !currentProps) return;

    if (items.length === 0) {
      popupEl.innerHTML = `
        <div class="p-3 text-center text-xs text-theme-text-muted">
          Không tìm thấy lệnh phù hợp
        </div>
      `;
      return;
    }

    let html = `
      <div class="flex flex-col py-1 max-h-[300px] overflow-y-auto select-none">
        <div class="px-3 py-1 text-[10px] font-semibold text-theme-text-muted uppercase tracking-wider">
          Lệnh Soạn Thảo Nhanh
        </div>
    `;

    items.forEach((item, index) => {
      const isSelected = index === selectedIndex;
      html += `
        <button
          type="button"
          data-index="${index}"
          class="slash-item flex items-center justify-between px-3 py-2 text-left cursor-pointer transition-colors ${
            isSelected 
              ? 'bg-theme-accent-subtle text-theme-accent font-medium border-l-2 border-theme-accent pl-2.5' 
              : 'text-theme-text hover:bg-theme-card-hover border-l-2 border-transparent'
          }"
        >
          <div class="flex items-center gap-2.5 overflow-hidden">
            <div class="w-6 h-6 rounded bg-theme-card border border-theme-border flex items-center justify-center text-xs font-mono shrink-0 shadow-2xs">
              ${item.icon}
            </div>
            <div class="flex flex-col overflow-hidden">
              <span class="text-xs truncate">${item.title}</span>
              <span class="text-[10px] text-theme-text-muted truncate">${item.description}</span>
            </div>
          </div>
          <span class="text-[9px] font-mono text-theme-text-muted px-1 py-0.5 rounded bg-theme-bg-subtle/80 border border-theme-border/50 shrink-0">
            ${item.category}
          </span>
        </button>
      `;
    });

    html += `</div>`;
    popupEl.innerHTML = html;

    // Attach click listeners to all buttons
    const buttons = popupEl.querySelectorAll<HTMLButtonElement>('.slash-item');
    buttons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const idx = Number(btn.getAttribute('data-index'));
        if (!isNaN(idx) && items[idx]) {
          selectItem(idx);
        }
      });
      btn.addEventListener('mouseenter', () => {
        const idx = Number(btn.getAttribute('data-index'));
        if (!isNaN(idx) && selectedIndex !== idx) {
          selectedIndex = idx;
          renderMenu();
        }
      });
    });

    // Ensure selected item is visible in scroll container
    const activeBtn = popupEl.querySelector<HTMLButtonElement>(`[data-index="${selectedIndex}"]`);
    if (activeBtn) {
      activeBtn.scrollIntoView({ block: 'nearest' });
    }
  }

  function positionPopup(clientRect?: (() => DOMRect | null) | null | undefined) {
    if (!popupEl || !clientRect) return;
    const rect = clientRect();
    if (!rect) return;

    const menuWidth = 280;
    const menuHeight = Math.min(320, items.length * 48 + 40);
    const padding = 12;

    let left = rect.left;
    let top = rect.bottom + 6;

    // Viewport Boundary Clamping & Flipping
    if (typeof window !== 'undefined') {
      if (left + menuWidth > window.innerWidth - padding) {
        left = Math.max(padding, window.innerWidth - menuWidth - padding);
      }
      if (top + menuHeight > window.innerHeight - padding) {
        // Flip above cursor if bottom boundary reached
        top = Math.max(padding, rect.top - menuHeight - 6);
      }
    }

    popupEl.style.left = `${left}px`;
    popupEl.style.top = `${top}px`;
  }

  function selectItem(index: number) {
    const item = items[index];
    if (item && currentProps) {
      currentProps.command(item);
    }
  }

  return {
    onStart: (props: SuggestionProps) => {
      currentProps = props;
      items = props.items as CommandItem[];
      selectedIndex = 0;

      if (!popupEl) {
        popupEl = document.createElement('div');
        popupEl.className = 'vaultsync-slash-menu fixed z-50 min-w-[280px] max-w-[320px] bg-theme-card/95 backdrop-blur-md border border-theme-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100';
        document.body.appendChild(popupEl);
      }

      renderMenu();
      positionPopup(props.clientRect);
    },

    onUpdate: (props: SuggestionProps) => {
      currentProps = props;
      items = props.items as CommandItem[];
      selectedIndex = Math.min(selectedIndex, Math.max(0, items.length - 1));

      renderMenu();
      positionPopup(props.clientRect);
    },

    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (!popupEl || items.length === 0) return false;

      if (event.key === 'ArrowDown') {
        selectedIndex = (selectedIndex + 1) % items.length;
        renderMenu();
        return true;
      }

      if (event.key === 'ArrowUp') {
        selectedIndex = (selectedIndex + items.length - 1) % items.length;
        renderMenu();
        return true;
      }

      if (event.key === 'Enter' || event.key === 'Tab') {
        selectItem(selectedIndex);
        return true;
      }

      if (event.key === 'Escape') {
        if (popupEl && popupEl.parentNode) {
          popupEl.parentNode.removeChild(popupEl);
          popupEl = null;
        }
        return true;
      }

      return false;
    },

    onExit: () => {
      if (popupEl && popupEl.parentNode) {
        popupEl.parentNode.removeChild(popupEl);
        popupEl = null;
      }
      currentProps = null;
    }
  };
}

export const SlashCommandExtension = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        pluginKey: SlashCommandPluginKey,
        allow: ({ editor }: any) => editor.isEditable,
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range });
        },
        items: ({ query }: { query: string }) => {
          return filterSlashCommands(query);
        },
        render: createSlashCommandRenderer
      }
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion
      })
    ];
  }
});
