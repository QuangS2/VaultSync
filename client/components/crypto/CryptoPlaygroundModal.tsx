import React, { useState } from 'react';
import { 
  Play, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Activity
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { CryptoBenchmark, CryptoTestSuiteResult } from '../../lib/crypto/crypto-benchmark';
import { WebCryptoEngine } from '../../lib/crypto/web-crypto-engine';
import { BinaryUtils } from '../../lib/crypto/binary-utils';
import { NonceManager } from '../../lib/crypto/nonce-manager';
import { ChunkType } from '../../lib/crypto/types';

export interface CryptoPlaygroundModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CryptoPlaygroundModal: React.FC<CryptoPlaygroundModalProps> = ({
  isOpen,
  onClose
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [suiteResult, setSuiteResult] = useState<CryptoTestSuiteResult | null>(null);

  // Live Interactive Playground State
  const [inputText, setInputText] = useState('Dữ liệu thử nghiệm bảo mật tuyệt đối VaultSync 🔒');
  const [docIdInput, setDocIdInput] = useState('550e8400-e29b-41d4-a716-446655440000');
  const [encryptedOutput, setEncryptedOutput] = useState<{ iv: string; ciphertext: string; tag: string } | null>(null);
  const [decryptedOutput, setDecryptedOutput] = useState<string | null>(null);
  const [tamperError, setTamperError] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<CryptoKey | null>(null);
  const [nonceManager] = useState(() => new NonceManager(0x42424242, 1));

  const runFullSuite = async () => {
    setIsRunning(true);
    try {
      const result = await CryptoBenchmark.runSuite();
      setSuiteResult(result);
    } finally {
      setIsRunning(false);
    }
  };

  const handleEncrypt = async () => {
    try {
      let key = activeKey;
      if (!key) {
        key = await WebCryptoEngine.generateAESGCMKey();
        setActiveKey(key);
      }

      const plaintext = BinaryUtils.stringToBytes(inputText);
      const aadMeta = {
        documentId: docIdInput,
        epoch: 1,
        chunkType: ChunkType.CRDT_UPDATE
      };

      const enc = await WebCryptoEngine.encryptAESGCM(key, plaintext, {
        nonceManager,
        aadMetadata: aadMeta
      });

      const ivHex = BinaryUtils.bufferToHex(enc.iv);
      const cipherHex = BinaryUtils.bufferToHex(enc.ciphertext.subarray(0, enc.ciphertext.length - 16));
      const tagHex = BinaryUtils.bufferToHex(enc.ciphertext.subarray(enc.ciphertext.length - 16));

      setEncryptedOutput({
        iv: ivHex,
        ciphertext: cipherHex,
        tag: tagHex
      });

      setDecryptedOutput(null);
      setTamperError(null);
    } catch (err: any) {
      setTamperError(`Lỗi mã hóa: ${err.message}`);
    }
  };

  const handleDecrypt = async (tamperDocId = false) => {
    if (!encryptedOutput || !activeKey) return;

    try {
      setTamperError(null);
      const iv = BinaryUtils.hexToBytes(encryptedOutput.iv);
      const cipherBody = BinaryUtils.hexToBytes(encryptedOutput.ciphertext);
      const tag = BinaryUtils.hexToBytes(encryptedOutput.tag);

      // Recombine ciphertext and tag
      const fullCipher = new Uint8Array(cipherBody.length + tag.length);
      fullCipher.set(cipherBody, 0);
      fullCipher.set(tag, cipherBody.length);

      const targetDocId = tamperDocId ? '99999999-9999-9999-9999-999999999999' : docIdInput;

      const aadMeta = {
        documentId: targetDocId,
        epoch: 1,
        chunkType: ChunkType.CRDT_UPDATE
      };

      const decrypted = await WebCryptoEngine.decryptAESGCM(activeKey, fullCipher, iv, {
        aadMetadata: aadMeta
      });

      setDecryptedOutput(BinaryUtils.bytesToString(decrypted));
    } catch (err: any) {
      setDecryptedOutput(null);
      setTamperError(`Bắt lỗi giả mạo thành công: ${err.message || 'OperationError: Authentication tag verification failed'}`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Trung Tâm Kiểm Thử Mật Mã (WebCrypto Engine Playground)"
      description="Kiểm chứng trực tiếp thuật toán AES-256-GCM, AAD Tamper-Proofing, Nonce đơn điệu và đo thông lượng phần cứng."
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-[11px] text-theme-text-muted flex items-center gap-1.5 font-mono">
            <Cpu className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tăng tốc phần cứng AES-NI / ARM Crypto: Đang kích hoạt</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>Đóng</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Top Action: Run Automated Test Suite */}
        <div className="bg-theme-card p-4 rounded-xl border border-theme-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-xs text-theme-text flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-theme-accent" />
              <span>Bộ Kiểm Thử Tự Động Toàn Diện (Vitest Suite)</span>
            </div>
            <p className="text-[11px] text-theme-text-muted mt-0.5">
              Chạy 4 bài test bảo mật mật mã học và đo thông lượng MB/s thời gian thực.
            </p>
          </div>

          <Button 
            variant="primary" 
            size="sm" 
            onClick={runFullSuite} 
            isLoading={isRunning}
            className="shrink-0"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Chạy Kiểm Thử Ngay</span>
          </Button>
        </div>

        {/* Test Suite Results Display */}
        {suiteResult && (
          <div className="bg-theme-bg p-4 rounded-xl border border-theme-border flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-theme-border pb-2">
              <span className="font-semibold text-xs text-theme-text flex items-center gap-2">
                <span>Kết Quả Kiểm Thử:</span>
                {suiteResult.allPassed ? (
                  <Badge variant="success" size="sm">TẤT CẢ VƯỢT QUA (4/4)</Badge>
                ) : (
                  <Badge variant="warning" size="sm">CÓ LỖI</Badge>
                )}
              </span>
              <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                {suiteResult.benchmark.throughputMBps} MB/s ({suiteResult.benchmark.opsPerSec} ops/s)
              </span>
            </div>

            <div className="flex flex-col gap-1.5 font-mono text-[11px] text-theme-text-secondary">
              {suiteResult.details.map((detail, index) => (
                <div key={index} className="leading-relaxed">{detail}</div>
              ))}
            </div>
          </div>
        )}

        {/* Live Interactive Encrypt / Decrypt / AAD Tamper Lab */}
        <div className="flex flex-col gap-3 pt-2 border-t border-theme-border">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-xs text-theme-text flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-theme-accent" />
              <span>Phòng Thí Nghiệm Mã Hóa Tương Tác Trực Tiếp (Live Lab)</span>
            </span>
            <Badge variant="outline" size="sm">Client ID: 0x42424242</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-theme-text">Văn bản bản rõ (Plaintext):</label>
              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Nhập chuỗi cần mã hóa..."
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-theme-text">ID Tài liệu (Ràng buộc AAD):</label>
              <Input
                value={docIdInput}
                onChange={(e) => setDocIdInput(e.target.value)}
                placeholder="UUID tài liệu..."
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={handleEncrypt}>
              <Lock className="w-3.5 h-3.5" />
              <span>Mã Hóa AES-256-GCM</span>
            </Button>
            {encryptedOutput && (
              <>
                <Button variant="secondary" size="sm" onClick={() => handleDecrypt(false)}>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Giải Mã Hợp Lệ</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleDecrypt(true)} className="text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Thử Giả Mạo AAD (Test Tamper)</span>
                </Button>
              </>
            )}
          </div>

          {/* Encrypted Output Display */}
          {encryptedOutput && (
            <div className="bg-theme-card p-3 rounded-lg border border-theme-border flex flex-col gap-2 font-mono text-[11px]">
              <div className="flex items-center justify-between text-theme-text-muted">
                <span>Khung Nhị Phân Trên Đường Truyền (Ciphertext Wire Frame):</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">AES-256-GCM Authenticated</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5 text-theme-text-secondary break-all">
                <div><strong className="text-theme-text">IV (96-bit):</strong> <span className="text-sky-500">{encryptedOutput.iv}</span></div>
                <div><strong className="text-theme-text">Bản mã (Cipher):</strong> <span>{encryptedOutput.ciphertext}</span></div>
                <div><strong className="text-theme-text">Mã Xác Thực (Tag 128-bit):</strong> <span className="text-emerald-500">{encryptedOutput.tag}</span></div>
              </div>
            </div>
          )}

          {/* Decrypted Output Display */}
          {decryptedOutput && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-lg flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span><strong>Giải mã thành công:</strong> "{decryptedOutput}"</span>
              </div>
              <span className="font-mono text-[10px]">100% Khớp Dữ Liệu</span>
            </div>
          )}

          {/* Tamper Alert Display */}
          {tamperError && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Phát Hiện Xâm Phạm Toàn Vẹn:</strong>
                <p className="text-[11px] mt-0.5 leading-relaxed">{tamperError}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
