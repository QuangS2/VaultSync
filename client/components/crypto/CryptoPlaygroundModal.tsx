import React, { useState } from 'react';
import { 
  Play, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Activity, 
  KeyRound, 
  FileSignature, 
  Share2, 
  Sparkles 
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { CryptoBenchmark, CryptoTestSuiteResult } from '../../lib/crypto/crypto-benchmark';
import { WebCryptoEngine } from '../../lib/crypto/web-crypto-engine';
import { BinaryUtils } from '../../lib/crypto/binary-utils';
import { NonceManager } from '../../lib/crypto/nonce-manager';
import { WorkerCryptoClient } from '../../lib/crypto/worker-client';
import { KeyDerivation } from '../../lib/crypto/key-derivation';
import { IdentityKeys, ECDHKeyPair, ECDSAKeyPair } from '../../lib/crypto/identity-keys';
import { ChunkType } from '../../lib/crypto/types';

export interface CryptoPlaygroundModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CryptoPlaygroundModal: React.FC<CryptoPlaygroundModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'aes' | 'pbkdf2' | 'ecdh' | 'ecdsa'>('aes');
  const [isRunning, setIsRunning] = useState(false);
  const [suiteResult, setSuiteResult] = useState<CryptoTestSuiteResult | null>(null);

  // Tab 1: AES-GCM Lab
  const [inputText, setInputText] = useState('Dữ liệu thử nghiệm bảo mật tuyệt đối VaultSync 🔒');
  const [docIdInput, setDocIdInput] = useState('550e8400-e29b-41d4-a716-446655440000');
  const [encryptedOutput, setEncryptedOutput] = useState<{ iv: string; ciphertext: string; tag: string } | null>(null);
  const [decryptedOutput, setDecryptedOutput] = useState<string | null>(null);
  const [tamperError, setTamperError] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<CryptoKey | null>(null);
  const [nonceManager] = useState(() => new NonceManager(0x42424242, 1));

  // Tab 2: PBKDF2 Web Worker Lab
  const [passphraseInput, setPassphraseInput] = useState('MySuperSecretMasterPassphrase2026!');
  const [iterationsInput, setIterationsInput] = useState(600_000);
  const [isDerivingPBKDF2, setIsDerivingPBKDF2] = useState(false);
  const [derivedKeyOutput, setDerivedKeyOutput] = useState<{ rawHex: string; durationMs: number; usedWorker: boolean } | null>(null);

  // Tab 3: ECDH Key Agreement Lab
  const [aliceECDH, setAliceECDH] = useState<{ keys: ECDHKeyPair; pubSPKI: string } | null>(null);
  const [bobECDH, setBobECDH] = useState<{ keys: ECDHKeyPair; pubSPKI: string } | null>(null);
  const [sharedSecrets, setSharedSecrets] = useState<{ aliceSharedHex: string; bobSharedHex: string; isMatch: boolean } | null>(null);

  // Tab 4: ECDSA Signatures Lab
  const [ecdsaKeys, setEcdsaKeys] = useState<{ keys: ECDSAKeyPair; pubSPKI: string } | null>(null);
  const [docSignText, setDocSignText] = useState('Bản cập nhật CRDT Dòng 14: Sửa module mật mã Web Crypto');
  const [signatureHex, setSignatureHex] = useState<string | null>(null);
  const [sigVerifyResult, setSigVerifyResult] = useState<{ isValid: boolean; message: string } | null>(null);

  const runFullSuite = async () => {
    setIsRunning(true);
    try {
      const result = await CryptoBenchmark.runSuite();
      setSuiteResult(result);
    } finally {
      setIsRunning(false);
    }
  };

  // --- AES Handlers ---
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

  // --- PBKDF2 Worker Handler ---
  const handleDerivePBKDF2 = async () => {
    setIsDerivingPBKDF2(true);
    setDerivedKeyOutput(null);
    try {
      const salt = KeyDerivation.generateSalt(16);
      const res = await WorkerCryptoClient.derivePBKDF2InBackground(passphraseInput, salt, iterationsInput);
      setDerivedKeyOutput({
        rawHex: BinaryUtils.bufferToHex(res.rawKey),
        durationMs: res.durationMs,
        usedWorker: res.usedWorker
      });
    } finally {
      setIsDerivingPBKDF2(false);
    }
  };

  // --- ECDH Handlers ---
  const handleGenerateECDH = async () => {
    const a = await IdentityKeys.generateECDHKeyPair();
    const b = await IdentityKeys.generateECDHKeyPair();
    const aSPKI = await IdentityKeys.exportPublicKeySPKI(a.publicKey);
    const bSPKI = await IdentityKeys.exportPublicKeySPKI(b.publicKey);

    setAliceECDH({ keys: a, pubSPKI: aSPKI });
    setBobECDH({ keys: b, pubSPKI: bSPKI });
    setSharedSecrets(null);
  };

  const handleComputeSharedSecret = async () => {
    if (!aliceECDH || !bobECDH) return;

    const aliceShared = await IdentityKeys.computeECDHSharedSecret(aliceECDH.keys.privateKey, bobECDH.keys.publicKey);
    const bobShared = await IdentityKeys.computeECDHSharedSecret(bobECDH.keys.privateKey, aliceECDH.keys.publicKey);

    const aRaw = await WebCryptoEngine.exportRawKey(aliceShared);
    const bRaw = await WebCryptoEngine.exportRawKey(bobShared);

    const aHex = BinaryUtils.bufferToHex(aRaw);
    const bHex = BinaryUtils.bufferToHex(bRaw);

    setSharedSecrets({
      aliceSharedHex: aHex,
      bobSharedHex: bHex,
      isMatch: aHex === bHex
    });
  };

  // --- ECDSA Handlers ---
  const handleGenerateECDSA = async () => {
    const keys = await IdentityKeys.generateECDSAKeyPair();
    const spki = await IdentityKeys.exportPublicKeySPKI(keys.publicKey);
    setEcdsaKeys({ keys, pubSPKI: spki });
    setSignatureHex(null);
    setSigVerifyResult(null);
  };

  const handleSignMessage = async () => {
    if (!ecdsaKeys) {
      const keys = await IdentityKeys.generateECDSAKeyPair();
      const spki = await IdentityKeys.exportPublicKeySPKI(keys.publicKey);
      setEcdsaKeys({ keys, pubSPKI: spki });
      const bytes = BinaryUtils.stringToBytes(docSignText);
      const sig = await IdentityKeys.signData(keys.privateKey, bytes);
      setSignatureHex(BinaryUtils.bufferToHex(sig));
      setSigVerifyResult(null);
    } else {
      const bytes = BinaryUtils.stringToBytes(docSignText);
      const sig = await IdentityKeys.signData(ecdsaKeys.keys.privateKey, bytes);
      setSignatureHex(BinaryUtils.bufferToHex(sig));
      setSigVerifyResult(null);
    }
  };

  const handleVerifySig = async (tamper: boolean) => {
    if (!ecdsaKeys || !signatureHex) return;

    const sigBytes = BinaryUtils.hexToBytes(signatureHex);
    const textToVerify = tamper ? docSignText + ' [TAMPERED_INTRUSION]' : docSignText;
    const msgBytes = BinaryUtils.stringToBytes(textToVerify);

    const isValid = await IdentityKeys.verifySignature(ecdsaKeys.keys.publicKey, sigBytes, msgBytes);
    setSigVerifyResult({
      isValid,
      message: isValid 
        ? 'Chữ ký hợp lệ 100%: Bản tin xuất phát từ chính chủ sở hữu khóa định danh ECDSA.'
        : 'CẢNH BÁO: Chữ ký không khớp hoặc nội dung đã bị thay đổi trái phép!'
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Trung Tâm Mật Mã Học (Zero-Knowledge Cryptographic Core)"
      description="Kiểm thử toàn diện AES-256-GCM, PBKDF2 600k rounds trong Web Worker, ECDH P-256 và ECDSA Digital Signatures."
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-[11px] text-theme-text-muted flex items-center gap-1.5 font-mono">
            <Cpu className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Tăng tốc phần cứng AES-NI / Web Worker: Sẵn sàng</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>Đóng</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Top Automated Test Runner Button */}
        <div className="bg-theme-card p-4 rounded-xl border border-theme-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-xs text-theme-text flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-theme-accent" />
              <span>Bộ Kiểm Thử Tự Động Toàn Diện (7 Test Suites)</span>
            </div>
            <p className="text-[11px] text-theme-text-muted mt-0.5">
              Chạy đồng thời kiểm thử AES-GCM, AAD Tamper, Monotonic Nonce, PBKDF2 Web Worker, ECDH và ECDSA.
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
                  <Badge variant="success" size="sm">TẤT CẢ VƯỢT QUA (7/7)</Badge>
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

        {/* 4 Interactive Lab Tabs */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-theme-card p-1 rounded-lg border border-theme-border text-xs">
            <button
              onClick={() => setActiveTab('aes')}
              className={`py-1.5 px-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'aes' ? 'bg-theme-bg-subtle text-theme-text shadow-xs' : 'text-theme-text-muted hover:text-theme-text'}`}
            >
              <Lock className="w-3.5 h-3.5 text-theme-accent" />
              <span>AES-256-GCM</span>
            </button>

            <button
              onClick={() => setActiveTab('pbkdf2')}
              className={`py-1.5 px-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'pbkdf2' ? 'bg-theme-bg-subtle text-theme-text shadow-xs' : 'text-theme-text-muted hover:text-theme-text'}`}
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-500" />
              <span>PBKDF2 Worker</span>
            </button>

            <button
              onClick={() => setActiveTab('ecdh')}
              className={`py-1.5 px-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'ecdh' ? 'bg-theme-bg-subtle text-theme-text shadow-xs' : 'text-theme-text-muted hover:text-theme-text'}`}
            >
              <Share2 className="w-3.5 h-3.5 text-sky-500" />
              <span>ECDH P-256</span>
            </button>

            <button
              onClick={() => setActiveTab('ecdsa')}
              className={`py-1.5 px-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'ecdsa' ? 'bg-theme-bg-subtle text-theme-text shadow-xs' : 'text-theme-text-muted hover:text-theme-text'}`}
            >
              <FileSignature className="w-3.5 h-3.5 text-emerald-500" />
              <span>ECDSA Ký Số</span>
            </button>
          </div>

          {/* TAB 1: AES-GCM + AAD */}
          {activeTab === 'aes' && (
            <div className="flex flex-col gap-3 p-3 bg-theme-card/60 rounded-xl border border-theme-border">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-theme-text">Văn bản bản rõ (Plaintext):</label>
                  <Input value={inputText} onChange={(e) => setInputText(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-theme-text">ID Tài liệu (Ràng buộc AAD):</label>
                  <Input value={docIdInput} onChange={(e) => setDocIdInput(e.target.value)} />
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

              {encryptedOutput && (
                <div className="bg-theme-card p-3 rounded-lg border border-theme-border flex flex-col gap-1.5 font-mono text-[11px]">
                  <div><strong className="text-theme-text">IV (96-bit):</strong> <span className="text-sky-500">{encryptedOutput.iv}</span></div>
                  <div><strong className="text-theme-text">Ciphertext:</strong> <span className="break-all">{encryptedOutput.ciphertext}</span></div>
                  <div><strong className="text-theme-text">Auth Tag (128-bit):</strong> <span className="text-emerald-500">{encryptedOutput.tag}</span></div>
                </div>
              )}

              {decryptedOutput && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-lg flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> <strong>Giải mã thành công:</strong> "{decryptedOutput}"</span>
                  <span className="font-mono text-[10px]">100% Khớp Dữ Liệu</span>
                </div>
              )}

              {tamperError && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-lg text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{tamperError}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PBKDF2 Web Worker */}
          {activeTab === 'pbkdf2' && (
            <div className="flex flex-col gap-3 p-3 bg-theme-card/60 rounded-xl border border-theme-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-theme-text">Dẫn Xuất Khóa Chủ Bằng PBKDF2 Trong Background Worker</span>
                <Badge variant="accent" size="sm">OWASP 2023: 600k Rounds</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-theme-text">Mật Khẩu Khởi Tạo (Passphrase):</label>
                  <Input value={passphraseInput} onChange={(e) => setPassphraseInput(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-theme-text">Số Vòng Lặp (Iterations):</label>
                  <Input 
                    type="number" 
                    value={iterationsInput} 
                    onChange={(e) => setIterationsInput(Number(e.target.value))} 
                  />
                </div>
              </div>

              <Button 
                variant="primary" 
                size="sm" 
                onClick={handleDerivePBKDF2} 
                isLoading={isDerivingPBKDF2}
                className="w-fit"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Dẫn Xuất Master Key (Web Worker)</span>
              </Button>

              {derivedKeyOutput && (
                <div className="bg-theme-card p-3 rounded-lg border border-theme-border flex flex-col gap-2 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-theme-text-muted">
                    <span>Trạng thái Web Worker: <strong className="text-emerald-600 dark:text-emerald-400">{derivedKeyOutput.usedWorker ? 'Background Thread (Non-blocking 60 FPS)' : 'Main Thread'}</strong></span>
                    <span className="text-theme-accent font-bold">{derivedKeyOutput.durationMs} ms</span>
                  </div>
                  <div>
                    <strong className="text-theme-text">Khóa 256-bit Xuất Ra (Hex):</strong>
                    <div className="text-theme-text-secondary break-all bg-theme-bg p-2 rounded mt-1 border border-theme-border">{derivedKeyOutput.rawHex}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ECDH P-256 Key Exchange */}
          {activeTab === 'ecdh' && (
            <div className="flex flex-col gap-3 p-3 bg-theme-card/60 rounded-xl border border-theme-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-theme-text">Mô Phỏng Trao Đổi Khóa ECDH (Diffie-Hellman P-256) Giữa Alice & Bob</span>
                <Badge variant="outline" size="sm">NIST P-256 (secp256r1)</Badge>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={handleGenerateECDH}>
                  <Sparkles className="w-3.5 h-3.5 text-theme-accent" />
                  <span>Sinh Cặp Khóa Alice & Bob</span>
                </Button>
                {aliceECDH && bobECDH && (
                  <Button variant="primary" size="sm" onClick={handleComputeSharedSecret}>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Tính Toán Khóa Chung (Compute Shared Secret)</span>
                  </Button>
                )}
              </div>

              {aliceECDH && bobECDH && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[11px]">
                  <div className="bg-theme-card p-2.5 rounded-lg border border-theme-border">
                    <strong className="text-blue-500">Alice Public Key (SPKI):</strong>
                    <div className="truncate text-theme-text-muted mt-1">{aliceECDH.pubSPKI}</div>
                  </div>
                  <div className="bg-theme-card p-2.5 rounded-lg border border-theme-border">
                    <strong className="text-emerald-500">Bob Public Key (SPKI):</strong>
                    <div className="truncate text-theme-text-muted mt-1">{bobECDH.pubSPKI}</div>
                  </div>
                </div>
              )}

              {sharedSecrets && (
                <div className="bg-theme-card p-3 rounded-lg border border-theme-border flex flex-col gap-2 font-mono text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-theme-text-muted">Kết Quả Đối Soát Khóa Bí Mật Chung:</span>
                    {sharedSecrets.isMatch ? (
                      <Badge variant="success" size="sm">TRÙNG KHỚP 100%</Badge>
                    ) : (
                      <Badge variant="warning" size="sm">KHÔNG KHỚP</Badge>
                    )}
                  </div>
                  <div>
                    <strong className="text-theme-text">Alice Derived Key (Hex):</strong>
                    <div className="text-emerald-600 dark:text-emerald-400 break-all">{sharedSecrets.aliceSharedHex}</div>
                  </div>
                  <div>
                    <strong className="text-theme-text">Bob Derived Key (Hex):</strong>
                    <div className="text-emerald-600 dark:text-emerald-400 break-all">{sharedSecrets.bobSharedHex}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ECDSA Signatures */}
          {activeTab === 'ecdsa' && (
            <div className="flex flex-col gap-3 p-3 bg-theme-card/60 rounded-xl border border-theme-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-theme-text">Ký Số Điện Tử & Chứng Thực Tính Toàn Vẹn Bản Tin (ECDSA P-256)</span>
                <Badge variant="outline" size="sm">ECDSA-SHA256</Badge>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-theme-text">Nội Dung Bản Cập Nhật Cần Ký Số:</label>
                <Input value={docSignText} onChange={(e) => setDocSignText(e.target.value)} />
              </div>

              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={handleGenerateECDSA}>
                  <Sparkles className="w-3.5 h-3.5 text-theme-accent" />
                  <span>Sinh Cặp Khóa Mới</span>
                </Button>
                <Button variant="primary" size="sm" onClick={handleSignMessage}>
                  <FileSignature className="w-3.5 h-3.5" />
                  <span>Ký Số Bằng Private Key</span>
                </Button>
                {signatureHex && (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => handleVerifySig(false)}>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Xác Minh Chữ Ký Gốc</span>
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleVerifySig(true)} className="text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span>Thử Giả Mạo Nội Dung</span>
                    </Button>
                  </>
                )}
              </div>

              {signatureHex && (
                <div className="bg-theme-card p-3 rounded-lg border border-theme-border flex flex-col gap-1.5 font-mono text-[11px]">
                  <strong className="text-theme-text">Chữ Ký Số ECDSA (64 Bytes Raw Hex):</strong>
                  <div className="break-all text-sky-500">{signatureHex}</div>
                </div>
              )}

              {sigVerifyResult && (
                <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${sigVerifyResult.isValid ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400'}`}>
                  {sigVerifyResult.isValid ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                  <span>{sigVerifyResult.message}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
