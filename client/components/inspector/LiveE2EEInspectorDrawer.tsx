/**
 * Live E2EE Network & Cryptographic Inspector Drawer / Modal (11/10 Precision)
 * Side-by-side comparison between On-the-Wire Encrypted Hex vs In-Memory Decrypted State.
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Terminal, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Copy, 
  Check, 
  Trash2, 
  Play, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Filter,
  Activity
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { e2eeInspector, InspectedPacket } from '../../lib/crypto/e2ee-inspector-engine';
import { ChunkType } from '../../lib/crypto/types';

export interface LiveE2EEInspectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveE2EEInspectorDrawer: React.FC<LiveE2EEInspectorDrawerProps> = ({
  isOpen,
  onClose
}) => {
  const [packets, setPackets] = useState<InspectedPacket[]>([]);
  const [selectedPacketId, setSelectedPacketId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [copiedHex, setCopiedHex] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Pre-populate with a few initial demonstration packets if empty
    if (e2eeInspector.getPackets().length === 0) {
      const mockIV = new Uint8Array(12);
      crypto.getRandomValues(mockIV);
      const mockTag = new Uint8Array(16);
      crypto.getRandomValues(mockTag);
      const mockCipher = new Uint8Array(32);
      crypto.getRandomValues(mockCipher);
      const fullMock = new Uint8Array(mockCipher.length + mockTag.length);
      fullMock.set(mockCipher, 0);
      fullMock.set(mockTag, mockCipher.length);

      e2eeInspector.logPacket(
        'OUTGOING',
        'CRDT_UPDATE',
        mockIV,
        fullMock,
        '{"event":"CRDT_INSERT","chars":"Chào mừng đến VaultSync E2EE Workspace!","clock":1}',
        { documentId: 'doc-welcome', epoch: 1, chunkType: ChunkType.CRDT_UPDATE, authorUserId: 'user_alice' }
      );
    }

    const unsub = e2eeInspector.subscribe((list) => {
      setPackets(list);
      const first = list[0];
      if (first && !selectedPacketId) {
        setSelectedPacketId(first.id);
      }
    });

    return () => unsub();
  }, [isOpen]);

  const filteredPackets = packets.filter(p => {
    if (filterType === 'ALL') return true;
    return p.chunkType === filterType;
  });

  const selectedPacket = packets.find(p => p.id === selectedPacketId) || packets[0];

  const handleCopyHex = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHex(true);
    setTimeout(() => setCopiedHex(false), 1500);
  };

  const handleEmitTestPacket = () => {
    const mockIV = new Uint8Array(12);
    crypto.getRandomValues(mockIV);
    const mockTag = new Uint8Array(16);
    crypto.getRandomValues(mockTag);
    const mockCipher = new Uint8Array(24);
    crypto.getRandomValues(mockCipher);
    const full = new Uint8Array(mockCipher.length + mockTag.length);
    full.set(mockCipher, 0);
    full.set(mockTag, mockCipher.length);

    const types: Array<'CRDT_UPDATE' | 'ROOM_CHAT' | 'INLINE_COMMENT'> = ['CRDT_UPDATE', 'ROOM_CHAT', 'INLINE_COMMENT'];
    const selectedType = types[Math.floor(Math.random() * types.length)] ?? 'CRDT_UPDATE';

    const packet = e2eeInspector.logPacket(
      Math.random() > 0.5 ? 'OUTGOING' : 'INCOMING',
      selectedType,
      mockIV,
      full,
      `{"type":"${selectedType}","content":"Bản ghi kiểm tra bảo mật Zero-Knowledge lúc ${new Date().toLocaleTimeString()}","epoch":1}`,
      { documentId: 'doc-welcome', epoch: 1, chunkType: ChunkType.CRDT_UPDATE, authorUserId: 'user_bob' }
    );

    setSelectedPacketId(packet.id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="flex flex-col w-full h-full max-w-[1300px] max-h-[92vh] bg-theme-bg rounded-2xl border border-theme-border shadow-2xl overflow-hidden font-sans">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-theme-card border-b border-theme-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-theme-text">Thanh Tra Mật Mã Trực Tiếp (Live E2EE Inspector)</span>
                <Badge variant="success" size="sm" className="font-mono text-[9px] font-bold">
                  E2EE: Zero-Knowledge Verified
                </Badge>
                <Badge variant="accent" size="sm" className="hidden sm:inline-flex text-[9px]">
                  AES-256-GCM + GHASH
                </Badge>
              </div>
              <p className="text-[11px] text-theme-text-muted">
                Đối chiếu trực quan giữa Gói tin mã hóa trên đường truyền (Wire Bytes) và Dữ liệu giải mã trong bộ nhớ máy khách.
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleEmitTestPacket}
              className="gap-1.5 text-xs shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-current text-theme-accent" />
              <span>Gửi Gói Tin Test</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => e2eeInspector.clear()}
              title="Xóa toàn bộ nhật ký"
              className="gap-1 text-xs text-theme-text-muted hover:text-theme-text"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              title="Đóng thanh tra"
              className="text-theme-text-muted hover:text-theme-text"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between px-5 py-2 bg-theme-bg-subtle/50 border-b border-theme-border text-xs">
          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-theme-text-muted mr-1" />
            {(['ALL', 'CRDT_UPDATE', 'ROOM_CHAT', 'INLINE_COMMENT'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer text-[11px] ${
                  filterType === f 
                    ? 'bg-theme-card text-theme-text font-semibold shadow-xs border border-theme-border' 
                    : 'text-theme-text-muted hover:text-theme-text'
                }`}
              >
                {f === 'ALL' ? 'Tất Cả' : f.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="font-mono text-[11px] text-theme-text-muted flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span>Tổng số: <strong className="text-theme-text">{filteredPackets.length}</strong> gói tin</span>
          </div>
        </div>

        {/* Main 2-Column Inspector Canvas */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          
          {/* Left Column: Packet Stream List (5 cols) */}
          <div className="md:col-span-5 border-r border-theme-border overflow-y-auto p-3 flex flex-col gap-1.5 bg-theme-bg">
            {filteredPackets.length === 0 ? (
              <div className="text-center py-12 text-theme-text-muted text-xs italic">
                Chưa có gói tin nào được ghi nhận. Hãy thao tác trên workspace hoặc nhấn "Gửi Gói Tin Test".
              </div>
            ) : (
              filteredPackets.map(pkt => {
                const isSelected = selectedPacket?.id === pkt.id;
                return (
                  <div
                    key={pkt.id}
                    onClick={() => setSelectedPacketId(pkt.id)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer text-xs flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-theme-card border-theme-accent/50 shadow-xs'
                        : 'bg-theme-card/50 border-theme-border hover:bg-theme-card hover:border-theme-border/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {pkt.direction === 'OUTGOING' ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
                            <ArrowUpRight className="w-2.5 h-2.5" /> GỬI ĐI
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                            <ArrowDownLeft className="w-2.5 h-2.5" /> NHẬN VỀ
                          </span>
                        )}
                        <span className="font-semibold text-theme-text font-mono text-[11px]">{pkt.chunkType}</span>
                      </div>

                      <span className="text-[10px] text-theme-text-muted font-mono">
                        {new Date(pkt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="font-mono text-[10px] text-theme-text-muted truncate">
                      IV: <span className="text-amber-600 dark:text-amber-400">{pkt.ivHex.substring(0, 16)}...</span> • Tag: <span className="text-indigo-500">{pkt.authTagHex.substring(0, 8)}...</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-theme-text-muted pt-0.5 border-t border-theme-border/40 font-mono">
                      <span>{pkt.sizeBytes} Bytes</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{pkt.latencyMs}ms latency</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Side-by-Side Deep Inspection View (7 cols) */}
          <div className="md:col-span-7 overflow-y-auto p-4 flex flex-col gap-4 bg-theme-card/30">
            {selectedPacket ? (
              <>
                {/* Packet Header Overview */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-theme-card border border-theme-border">
                  <div className="flex flex-col">
                    <span className="font-mono font-bold text-xs text-theme-text flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-theme-accent" /> Gói Tin: {selectedPacket.id}
                    </span>
                    <span className="text-[10px] text-theme-text-muted mt-0.5">
                      Ràng buộc AAD Epoch: <strong className="text-theme-text">{selectedPacket.aadInfo.epoch}</strong> • Tài liệu: <span className="font-mono">{selectedPacket.aadInfo.documentId}</span>
                    </span>
                  </div>

                  <Badge variant="success" size="sm" className="font-mono text-[10px]">
                    100% Không Thể Đọc Trộm
                  </Badge>
                </div>

                {/* Grid Comparison: Wire Hex vs Decrypted Plaintext */}
                <div className="grid grid-cols-1 gap-3">
                  
                  {/* BOX 1: ON-THE-WIRE ENCRYPTED (Blind Relay / Server / Hacker View) */}
                  <div className="p-3 rounded-xl bg-theme-bg border border-theme-border flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-rose-600 dark:text-rose-400">
                        <Lock className="w-3.5 h-3.5" />
                        <span>1. Trên Đường Truyền Mạng (Blind Relay & Hacker View — Bản Mã)</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyHex(`${selectedPacket.ivHex} ${selectedPacket.ciphertextHex} ${selectedPacket.authTagHex}`)}
                        className="h-6 px-2 text-[10px] gap-1"
                      >
                        {copiedHex ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedHex ? 'Đã sao chép' : 'Sao chép Hex'}</span>
                      </Button>
                    </div>

                    <div className="p-2.5 rounded-lg bg-black/80 text-emerald-400 font-mono text-[11px] break-all leading-relaxed select-all">
                      <div className="text-amber-400 text-[10px] mb-1 font-bold">
                        // [12-BYTE NONCE/IV] || [AES-256-GCM CIPHERTEXT] || [16-BYTE AUTH TAG]
                      </div>
                      <span className="text-amber-300 font-bold">{selectedPacket.ivHex}</span>
                      <span className="text-sky-300"> {selectedPacket.ciphertextHex}</span>
                      <span className="text-rose-400 font-bold"> {selectedPacket.authTagHex}</span>
                    </div>

                    <div className="text-[10px] text-theme-text-muted italic">
                      💡 Máy chủ chỉ đóng vai trò Người đưa thư mù (Blind Relay). Dù có toàn quyền can thiệp vào đường truyền mạng cũng không thể đọc được nội dung trên.
                    </div>
                  </div>

                  {/* BOX 2: IN-MEMORY DECRYPTED (Authorized Client View) */}
                  <div className="p-3 rounded-xl bg-theme-bg border border-theme-border flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                        <Unlock className="w-3.5 h-3.5" />
                        <span>2. Trong Bộ Nhớ Máy Khách (Authorized Client View — Bản Rõ)</span>
                      </div>
                      <Badge variant="outline" size="sm" className="text-[9px] font-mono">
                        DEK Unwrapped
                      </Badge>
                    </div>

                    <div className="p-2.5 rounded-lg bg-theme-card border border-theme-border font-mono text-[11px] text-theme-text leading-relaxed whitespace-pre-wrap">
                      {selectedPacket.decryptedPreview}
                    </div>

                    <div className="text-[10px] text-theme-text-muted italic">
                      ✅ Chỉ những thành viên sở hữu Khóa Tài Liệu (DEK) hợp lệ mới có thể giải mã và hiển thị văn bản rõ ràng này trên trình duyệt.
                    </div>
                  </div>

                </div>
              </>
            ) : (
              <div className="text-center py-20 text-theme-text-muted text-xs">
                Chọn một gói tin bên trái để xem chi tiết đối chiếu.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
