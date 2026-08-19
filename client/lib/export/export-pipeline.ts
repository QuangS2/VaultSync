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
   * Exports a document to standard Markdown format with structured YAML Frontmatter.
   */
  public static exportToMarkdown(rawContent: string, meta: DocumentExportMetadata): string {
    const author = meta.author || 'VaultSync User';
    const cleanContent = rawContent.trim();

    const frontmatter = [
      '---',
      `title: "${meta.title.replace(/"/g, '\\"')}"`,
      `documentId: "${meta.documentId}"`,
      `folder: "${meta.folderName || 'Engineering Vault'}"`,
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
   * Exports a document as a self-contained, standalone HTML page with embedded styling (Zero external dependencies).
   */
  public static exportToStandaloneHTML(
    htmlBody: string, 
    meta: DocumentExportMetadata, 
    theme: 'sun' | 'cloud' | 'night' = 'night'
  ): string {
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
  <title>${meta.title} — VaultSync Export</title>
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
    main h1, main h2, main h3, main h4 {
      color: ${themeStyles.text};
      margin-top: 24px;
      margin-bottom: 12px;
      font-weight: 600;
    }
    main p {
      margin-bottom: 16px;
    }
    main ul, main ol {
      margin-bottom: 16px;
      padding-left: 24px;
    }
    main li {
      margin-bottom: 6px;
    }
    main blockquote {
      border-left: 3px solid ${themeStyles.accent};
      padding: 10px 16px;
      margin: 16px 0;
      background: rgba(0, 0, 0, 0.03);
      border-radius: 0 8px 8px 0;
      color: ${themeStyles.textMuted};
      font-style: italic;
    }
    main code {
      background: rgba(125, 125, 125, 0.15);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
    }
    main pre {
      background: #0d1117;
      color: #c9d1d9;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 16px 0;
    }
    main pre code {
      background: transparent;
      padding: 0;
      color: inherit;
    }
    footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid ${themeStyles.border};
      font-size: 11px;
      color: ${themeStyles.textMuted};
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    @media print {
      body {
        background: white !important;
        color: black !important;
        padding: 0;
      }
      .container {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="badge-bar">
        <span class="badge">🔒 VaultSync E2EE Standalone</span>
        <span class="badge">Zero-Knowledge Verified</span>
      </div>
      <h1>${meta.title}</h1>
      <div class="metadata">
        <span>Tác giả: <strong>${meta.author || 'Thành viên VaultSync'}</strong></span>
        <span>Thư mục: <strong>${meta.folderName || 'Engineering Vault'}</strong></span>
        <span>Cập nhật: <strong>${new Date(meta.updatedAt).toLocaleString('vi-VN')}</strong></span>
        <span>Mã tài liệu: <code>${meta.documentId}</code></span>
      </div>
    </header>
    <main>
      ${htmlBody}
    </main>
    <footer>
      <span>Trang HTML độc lập không phụ thuộc máy chủ (Self-contained offline document)</span>
      <span>Được tạo bởi VaultSync Cryptographic Core</span>
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
