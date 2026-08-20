/**
 * VaultSync Multi-Format Export Pipeline (11/10 Precision)
 * Exports documents to Standard Markdown with YAML Frontmatter, Standalone Offline HTML, and File Downloads.
 */

export interface DocumentExportMetadata {
  title: string;
  documentId: string;
  author?: string | undefined;
  createdAt: number;
  updatedAt: number;
  folderName?: string | undefined;
}

export class ExportPipeline {
  /**
   * Sanitizes untrusted text strings to prevent HTML and Script Injection (Anti-XSS).
   */
  public static escapeHTML(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Strips dangerous script tags and inline event handlers from user HTML.
   */
  public static sanitizeHTML(html: string): string {
    if (!html) return '';
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/\s+on\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
      .replace(/javascript:/gi, 'blocked:');
  }

  /**
   * Exports a document to standard Markdown format with structured YAML Frontmatter.
   */
  public static exportToMarkdown(rawContent: string, meta: DocumentExportMetadata): string {
    const author = meta.author || 'VaultSync User';
    const cleanContent = rawContent.trim();

    const frontmatter = [
      '---',
      `title: "${meta.title.replace(/"/g, '\\"')}"`,
      `documentId: "${meta.documentId}"`,
      `folder: "${meta.folderName || 'Kho Tài Liệu Cá Nhân'}"`,
      `author: "${author}"`,
      `createdAt: "${new Date(meta.createdAt).toISOString()}"`,
      `updatedAt: "${new Date(meta.updatedAt).toISOString()}"`,
      `security: "VaultSync End-to-End Encrypted (Zero-Knowledge)"`,
      '---',
      '',
      ''
    ].join('\n');

    return frontmatter + cleanContent + '\n';
  }

  /**
   * Exports a document as a self-contained, standalone HTML page with embedded styling and strict CSP (Zero external dependencies).
   */
  public static exportToStandaloneHTML(
    htmlBody: string, 
    meta: DocumentExportMetadata, 
    theme: 'sun' | 'cloud' | 'night' = 'night'
  ): string {
    const safeTitle = ExportPipeline.escapeHTML(meta.title);
    const safeAuthor = ExportPipeline.escapeHTML(meta.author || 'VaultSync User');
    const safeFolderName = ExportPipeline.escapeHTML(meta.folderName || 'Kho Tài Liệu Cá Nhân');
    const safeDocId = ExportPipeline.escapeHTML(meta.documentId);
    const sanitizedBody = ExportPipeline.sanitizeHTML(htmlBody);

    const themeStyles = {
      sun: {
        bg: '#fbf9f5',
        card: '#ffffff',
        text: '#1a1d20',
        textMuted: '#6b7280',
        border: '#e5e1d8',
        accent: '#2563eb',
        badgeBg: '#eff6ff',
        badgeText: '#1d4ed8'
      },
      cloud: {
        bg: '#e8edf3',
        card: '#f3f6f9',
        text: '#1e293b',
        textMuted: '#64748b',
        border: '#cbd5e1',
        accent: '#0284c7',
        badgeBg: '#e0f2fe',
        badgeText: '#0369a1'
      },
      night: {
        bg: '#0b0e14',
        card: '#151a26',
        text: '#f8fafc',
        textMuted: '#94a3b8',
        border: '#2a3346',
        accent: '#38bdf8',
        badgeBg: '#1e293b',
        badgeText: '#38bdf8'
      }
    }[theme];

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data: https:;">
  <title>${safeTitle} — VaultSync Export</title>
  <style>
    :root {
      color-scheme: ${theme === 'night' ? 'dark' : 'light'};
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: ${themeStyles.bg};
      color: ${themeStyles.text};
      line-height: 1.7;
      padding: 40px 20px;
    }
    .container {
      max-width: 860px;
      margin: 0 auto;
      background: ${themeStyles.card};
      border: 1px solid ${themeStyles.border};
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }
    header {
      border-bottom: 1px solid ${themeStyles.border};
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .badge-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: ${themeStyles.badgeBg};
      color: ${themeStyles.badgeText};
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid ${themeStyles.border};
      font-family: ui-monospace, monospace;
    }
    h1 {
      font-size: 28px;
      font-weight: 700;
      color: ${themeStyles.text};
      margin-bottom: 12px;
      letter-spacing: -0.02em;
    }
    .metadata {
      font-size: 12px;
      color: ${themeStyles.textMuted};
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
    main {
      font-size: 15px;
    }
    h2, h3, h4 {
      margin-top: 24px;
      margin-bottom: 12px;
      color: ${themeStyles.text};
    }
    p {
      margin-bottom: 16px;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      background: ${themeStyles.badgeBg};
      color: ${themeStyles.accent};
      padding: 2px 6px;
      border-radius: 4px;
    }
    pre {
      background: ${theme === 'night' ? '#000000' : '#f1f5f9'};
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin-bottom: 16px;
      border: 1px solid ${themeStyles.border};
    }
    pre code {
      background: transparent;
      padding: 0;
      color: ${themeStyles.text};
    }
    blockquote {
      border-left: 4px solid ${themeStyles.accent};
      padding-left: 16px;
      margin-bottom: 16px;
      color: ${themeStyles.textMuted};
      font-style: italic;
    }
    ul, ol {
      margin-bottom: 16px;
      padding-left: 24px;
    }
    li {
      margin-bottom: 6px;
    }
    footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid ${themeStyles.border};
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: ${themeStyles.textMuted};
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="badge-bar">
        <span class="badge">🔒 VaultSync E2EE Export</span>
        <span class="badge">📁 ${safeFolderName}</span>
      </div>
      <h1>${safeTitle}</h1>
      <div class="metadata">
        <span>Tác giả: <strong>${safeAuthor}</strong></span>
        <span>ID: <code>${safeDocId}</code></span>
        <span>Tạo ngày: ${new Date(meta.createdAt).toLocaleDateString('vi-VN')}</span>
        <span>Cập nhật: ${new Date(meta.updatedAt).toLocaleDateString('vi-VN')}</span>
      </div>
    </header>
    <main>
      ${sanitizedBody}
    </main>
    <footer>
      <span>Được xuất tự động bởi VaultSync Zero-Knowledge Architecture</span>
      <span>Bản sao lưu ngoại tuyến an toàn</span>
    </footer>
  </div>
</body>
</html>`;
  }

  /**
   * Initiates browser file download for generated text contents.
   */
  public static downloadFile(content: string, filename: string, mimeType: string): void {
    if (typeof window === 'undefined') return;

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
