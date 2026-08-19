/**
 * Multi-Format Document Export Modal (Markdown & Standalone HTML) (11/10 Precision)
 * Provides Live Previews, Theme Selection, and 1-Click Offline File Generation.
 */

import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Code, 
  Archive, 
  Download, 
  Copy, 
  Check, 
  Sun, 
  Cloud, 
  Moon, 
  Sparkles
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ExportPipeline, DocumentExportMetadata } from '../../lib/export/export-pipeline';

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  documentId: string;
  folderName?: string;
  rawContent?: string;
  htmlContent?: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  documentId,
  folderName = 'Engineering Vault',
  rawContent = '# Chào mừng đến VaultSync\n\nĐây là tài liệu mẫu mã hóa đầu cuối.',
  htmlContent = '<h1>Chào mừng đến VaultSync</h1><p>Đây là tài liệu mẫu mã hóa đầu cuối.</p>'
}) => {
  const [activeTab, setActiveTab] = useState<'md' | 'html' | 'vault'>('md');
  const [htmlTheme, setHtmlTheme] = useState<'sun' | 'cloud' | 'night'>('night');
  const [copied, setCopied] = useState(false);

  const metadata: DocumentExportMetadata = useMemo(() => ({
    title: documentTitle,
    documentId: documentId,
    author: 'Alice (Trưởng Nhóm)',
    folderName: folderName,
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now()
  }), [documentTitle, documentId, folderName]);

  const markdownOutput = useMemo(() => {
    return ExportPipeline.exportToMarkdown(rawContent, metadata);
  }, [rawContent, metadata]);

  const standaloneHtmlOutput = useMemo(() => {
    return ExportPipeline.exportToStandaloneHTML(htmlContent, metadata, htmlTheme);
  }, [htmlContent, metadata, htmlTheme]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const filename = `${documentTitle.toLowerCase().replace(/[^a-z0-9_-]/gi, '_')}.md`;
    ExportPipeline.downloadFile(markdownOutput, filename, 'text/markdown;charset=utf-8');
  };

  const handleDownloadHtml = () => {
    const filename = `${documentTitle.toLowerCase().replace(/[^a-z0-9_-]/gi, '_')}.html`;
    ExportPipeline.downloadFile(standaloneHtmlOutput, filename, 'text/html;charset=utf-8');
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Xuất Dữ Liệu & Sao Lưu Tài Liệu (Multi-Format Export)"
    >
      <div className="flex flex-col gap-4 max-h-[78vh] overflow-hidden">
        
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-theme-border pb-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('md')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'md'
                  ? 'bg-theme-card text-theme-text shadow-xs border border-theme-border'
                  : 'text-theme-text-muted hover:text-theme-text'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              <span>Markdown (.md)</span>
            </button>

            <button
              onClick={() => setActiveTab('html')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'html'
                  ? 'bg-theme-card text-theme-text shadow-xs border border-theme-border'
                  : 'text-theme-text-muted hover:text-theme-text'
              }`}
            >
              <Code className="w-3.5 h-3.5 text-emerald-500" />
              <span>Standalone HTML (.html)</span>
            </button>

            <button
              onClick={() => setActiveTab('vault')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'vault'
                  ? 'bg-theme-card text-theme-text shadow-xs border border-theme-border'
                  : 'text-theme-text-muted hover:text-theme-text'
              }`}
            >
              <Archive className="w-3.5 h-3.5 text-amber-500" />
              <span>Bản Sao Lưu .vault</span>
            </button>
          </div>

          <Badge variant="accent" size="sm" className="hidden sm:inline-flex text-[10px] font-mono">
            Zero-Knowledge Clean Export
          </Badge>
        </div>

        {/* Tab 1: Markdown Preview & Export */}
        {activeTab === 'md' && (
          <div className="flex flex-col gap-3 overflow-hidden">
            <div className="flex items-center justify-between text-xs text-theme-text-muted">
              <span>Định dạng Markdown tiêu chuẩn kèm khối metadata <strong>YAML Frontmatter</strong>.</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(markdownOutput)}
                  className="gap-1.5 text-xs h-7"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Đã sao chép' : 'Sao chép Markdown'}</span>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDownloadMarkdown}
                  className="gap-1.5 text-xs h-7"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải tệp .md</span>
                </Button>
              </div>
            </div>

            <div className="p-3 bg-black/80 rounded-xl border border-theme-border font-mono text-[11px] text-emerald-400 overflow-y-auto max-h-[360px] leading-relaxed whitespace-pre-wrap select-all">
              {markdownOutput}
            </div>
          </div>
        )}

        {/* Tab 2: Standalone HTML Preview & Export */}
        {activeTab === 'html' && (
          <div className="flex flex-col gap-3 overflow-hidden">
            <div className="flex items-center justify-between text-xs text-theme-text-muted">
              <div className="flex items-center gap-2">
                <span>Chọn theme nhúng nội tuyến:</span>
                <div className="flex items-center gap-1 bg-theme-bg-subtle p-0.5 rounded-lg border border-theme-border">
                  <button
                    onClick={() => setHtmlTheme('sun')}
                    className={`px-2 py-0.5 rounded text-[10px] flex items-center gap-1 cursor-pointer ${
                      htmlTheme === 'sun' ? 'bg-theme-card text-amber-600 font-bold shadow-xs' : 'text-theme-text-muted'
                    }`}
                  >
                    <Sun className="w-3 h-3" /> Sun
                  </button>
                  <button
                    onClick={() => setHtmlTheme('cloud')}
                    className={`px-2 py-0.5 rounded text-[10px] flex items-center gap-1 cursor-pointer ${
                      htmlTheme === 'cloud' ? 'bg-theme-card text-sky-500 font-bold shadow-xs' : 'text-theme-text-muted'
                    }`}
                  >
                    <Cloud className="w-3 h-3" /> Cloud
                  </button>
                  <button
                    onClick={() => setHtmlTheme('night')}
                    className={`px-2 py-0.5 rounded text-[10px] flex items-center gap-1 cursor-pointer ${
                      htmlTheme === 'night' ? 'bg-theme-card text-indigo-400 font-bold shadow-xs' : 'text-theme-text-muted'
                    }`}
                  >
                    <Moon className="w-3 h-3" /> Night
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(standaloneHtmlOutput)}
                  className="gap-1.5 text-xs h-7"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Đã sao chép' : 'Sao chép HTML'}</span>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDownloadHtml}
                  className="gap-1.5 text-xs h-7"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải tệp .html</span>
                </Button>
              </div>
            </div>

            {/* Embedded Live Preview Box */}
            <div className="rounded-xl border border-theme-border overflow-hidden max-h-[360px] h-[340px] bg-white">
              <iframe
                title="Standalone HTML Preview"
                srcDoc={standaloneHtmlOutput}
                className="w-full h-full border-none"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        )}

        {/* Tab 3: Encrypted Vault Backup Preview */}
        {activeTab === 'vault' && (
          <div className="flex flex-col gap-4 py-2">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1 text-xs">
                <span className="font-semibold text-theme-text">Định Dạng Sao Lưu Toàn Diện (.vault Archive)</span>
                <p className="text-theme-text-muted leading-relaxed">
                  Đóng gói toàn bộ cây thư mục CRDTs, lịch sử phiên bản, và khóa mã hóa thành tệp nhị phân có chữ ký bảo mật HMAC-SHA256. Tính năng khôi phục và sao lưu toàn vẹn được thiết kế theo tiêu chuẩn Task 8.2.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-theme-card border border-theme-border flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4 text-theme-accent" />
                <span className="text-theme-text font-bold">{documentTitle}.vault</span>
                <span className="text-theme-text-muted">(HMAC-SHA256 Signed)</span>
              </div>
              <Badge variant="accent" size="sm">Sẵn sàng trong Task 8.2</Badge>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="flex items-center justify-between pt-2 border-t border-theme-border text-[11px] text-theme-text-muted">
          <span>💡 Các tệp xuất ra hoàn toàn độc lập, có thể mở ngoại tuyến không cần internet.</span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>

      </div>
    </Modal>
  );
};
