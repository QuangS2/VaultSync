import React, { useState } from 'react';
import { LogIn, Key, AlertTriangle, Hash, Sparkles, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { BinaryUtils } from '../../lib/crypto/binary-utils';

export interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinRoom: (roomCode: string, title?: string, key?: CryptoKey) => void;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  isOpen,
  onClose,
  onJoinRoom
}) => {
  const [inputCode, setInputCode] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const rawInput = inputCode.trim();
    if (!rawInput) {
      setError('Vui lòng nhập mã phòng rút gọn hoặc liên kết chia sẻ.');
      return;
    }

    setIsProcessing(true);
    try {
      let roomId = rawInput;
      let roomTitle = 'Tài Liệu Cộng Tác';
      let rawKeyStr = keyInput.trim();
      let isUrl = false;

      // Check if user pasted a full URL
      if (rawInput.includes('?room=') || rawInput.startsWith('http://') || rawInput.startsWith('https://')) {
        try {
          const url = new URL(rawInput, window.location.origin);
          const roomParam = url.searchParams.get('room');
          const titleParam = url.searchParams.get('title');
          const keyParam = url.searchParams.get('key');

          if (roomParam) {
            roomId = roomParam;
            isUrl = true;
          }
          if (titleParam) roomTitle = decodeURIComponent(titleParam);
          if (keyParam) rawKeyStr = keyParam;
        } catch {
          // continue with raw input
        }
      }

      // Format room ID if raw code was entered
      if (!isUrl) {
        roomId = roomId.trim();
        if (roomId.toUpperCase().startsWith('VS-')) {
          roomId = roomId.slice(3).toLowerCase();
        }
        if (!roomId.startsWith('doc-') && !roomId.startsWith('item-')) {
          roomId = `doc-${roomId.toLowerCase()}`;
        }
      }

      let importedKey: CryptoKey | undefined;
      if (rawKeyStr) {
        try {
          const rawKeyBytes = BinaryUtils.base64UrlToBytes(rawKeyStr);
          importedKey = await crypto.subtle.importKey(
            'raw',
            rawKeyBytes as BufferSource,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
          );
        } catch {
          console.warn('Không thể giải mã khóa từ chuỗi cung cấp, sẽ sử dụng khóa vault hiện tại.');
        }
      }

      onJoinRoom(roomId, roomTitle, importedKey);
      onClose();
    } catch (err) {
      setError('Không thể tham gia phòng. Vui lòng kiểm tra lại mã phòng hoặc liên kết.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-theme-bg rounded-2xl border border-theme-border shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-theme-border flex items-center justify-between bg-theme-card">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-theme-accent text-white flex items-center justify-center shadow-xs">
              <LogIn className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <h3 className="font-semibold text-sm sm:text-base text-theme-text flex items-center gap-2">
                <span>Tham Gia Phòng Cộng Tác</span>
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Thời Gian Thực
                </span>
              </h3>
              <span className="text-xs text-theme-text-muted">
                Nhập mã phòng rút gọn hoặc dán liên kết để bắt đầu
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-theme-text-muted hover:text-theme-text hover:bg-theme-bg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleJoin} className="p-4 sm:p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-theme-text flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-theme-accent" />
              <span>Mã Phòng Rút Gọn hoặc Liên Kết Chia Sẻ</span>
            </label>
            <Input
              placeholder="VD: DOC-QUICKNOTES hoặc dán URL..."
              value={inputCode}
              onChange={e => setInputCode(e.target.value)}
              autoFocus
              className="text-xs font-mono"
            />
            <span className="text-[11px] text-theme-text-muted">
              Nhập mã định danh phòng do chủ phòng cung cấp (VD: <strong className="font-mono text-theme-text">doc-quicknotes</strong>).
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-theme-text flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-theme-accent" />
              <span>Khóa Giải Mã Tùy Chọn (Nhiếp ảnh/Base64)</span>
            </label>
            <Input
              type="password"
              placeholder="Không bắt buộc nếu đã có trong URL..."
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              className="text-xs font-mono"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-theme-card border border-theme-border/80 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-theme-text-muted leading-relaxed">
              Dữ liệu soạn thảo và thao tác con trỏ chuột được bảo vệ tuyệt đối bằng mã hóa đầu-cuối qua Blind WebSocket Relay Server.
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-theme-border">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              Hủy Bỏ
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={!inputCode.trim() || isProcessing}>
              <LogIn className="w-3.5 h-3.5" />
              <span>{isProcessing ? 'Đang tham gia...' : 'Vào Soạn Thảo Ngay'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
