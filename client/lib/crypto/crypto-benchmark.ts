/**
 * Real-Time Web Crypto Performance Benchmark & Validation Suite
 * Measures AES-256-GCM throughput, PBKDF2 600k rounds in Web Worker, ECDH Key Agreement, and ECDSA Signatures.
 */

import { WebCryptoEngine } from './web-crypto-engine';
import { NonceManager } from './nonce-manager';
import { KeyDerivation } from './key-derivation';
import { IdentityKeys } from './identity-keys';
import { WorkerCryptoClient } from './worker-client';
import { ChunkType, CryptoBenchmarkResult } from './types';
import { BinaryUtils } from './binary-utils';

export interface CryptoTestSuiteResult {
  allPassed: boolean;
  encryptDecryptPass: boolean;
  aadTamperPass: boolean;
  nonceMonotonicPass: boolean;
  binaryCodecPass: boolean;
  pbkdf2WorkerPass: boolean;
  ecdhSharedSecretPass: boolean;
  ecdsaSignaturePass: boolean;
  benchmark: CryptoBenchmarkResult;
  details: string[];
}

export class CryptoBenchmark {
  /**
   * Runs the full validation suite including Task 1.1 and Task 1.2 components.
   */
  public static async runSuite(): Promise<CryptoTestSuiteResult> {
    const details: string[] = [];
    let encryptDecryptPass = false;
    let aadTamperPass = false;
    let nonceMonotonicPass = false;
    let binaryCodecPass = false;
    let pbkdf2WorkerPass = false;
    let ecdhSharedSecretPass = false;
    let ecdsaSignaturePass = false;

    // --- TEST 1: Key Generation & Encrypt/Decrypt Round-Trip ---
    try {
      const key = await WebCryptoEngine.generateAESGCMKey();
      const testString = 'VaultSync: Zero-Knowledge Collaboration with CRDTs & WebCrypto AES-256-GCM 🚀';
      const plaintext = BinaryUtils.stringToBytes(testString);

      const aadMeta = {
        documentId: '550e8400-e29b-41d4-a716-446655440000',
        epoch: 1,
        chunkType: ChunkType.CRDT_UPDATE
      };

      const encrypted = await WebCryptoEngine.encryptAESGCM(key, plaintext, { aadMetadata: aadMeta });
      const decrypted = await WebCryptoEngine.decryptCombined(key, encrypted.combinedBinary, { aadMetadata: aadMeta });
      const decryptedString = BinaryUtils.bytesToString(decrypted);

      if (decryptedString === testString) {
        encryptDecryptPass = true;
        details.push('✅ Test 1: Encrypt / Decrypt Round-Trip: 100% dữ liệu gốc bảo toàn hoàn hảo.');
      } else {
        details.push('❌ Test 1: Dữ liệu giải mã không khớp.');
      }

      // --- TEST 2: AAD Tamper-Proofing Detection ---
      try {
        const tamperedMeta = {
          documentId: '99999999-9999-9999-9999-999999999999',
          epoch: 1,
          chunkType: ChunkType.CRDT_UPDATE
        };

        await WebCryptoEngine.decryptCombined(key, encrypted.combinedBinary, { aadMetadata: tamperedMeta });
        details.push('❌ Test 2: AAD Tamper-proofing thất bại (không bắt được lỗi khi AAD sai).');
      } catch {
        aadTamperPass = true;
        details.push('✅ Test 2: AAD Tamper-proofing: Bắt lỗi mật mã thành công khi phát hiện hoán đổi tài liệu.');
      }

      // --- TEST 3: Deterministic Monotonic Nonce Uniqueness ---
      const nonceMgr = new NonceManager(0x12345678, 1);
      const seenIVs = new Set<string>();
      let collisionDetected = false;

      for (let i = 0; i < 5000; i++) {
        const iv = nonceMgr.nextIV();
        const hex = BinaryUtils.bufferToHex(iv);
        if (seenIVs.has(hex)) {
          collisionDetected = true;
          break;
        }
        seenIVs.add(hex);
      }

      if (!collisionDetected && seenIVs.size === 5000) {
        nonceMonotonicPass = true;
        details.push('✅ Test 3: Monotonic IV: 5,000 IV liên tiếp hoàn toàn độc nhất, tỷ lệ đụng độ 0.00%.');
      } else {
        details.push('❌ Test 3: Phát hiện đụng độ IV trong bộ sinh đơn điệu.');
      }

      // --- TEST 4: Binary Converters Round-Trip ---
      const sampleBytes = new Uint8Array([0x00, 0xff, 0x56, 0xa1, 0xb2, 0xc3, 0xd4, 0xe5]);
      const base64Url = BinaryUtils.bufferToBase64Url(sampleBytes);
      const restoredBytes = BinaryUtils.base64UrlToBytes(base64Url);
      const hex = BinaryUtils.bufferToHex(sampleBytes);
      const restoredHexBytes = BinaryUtils.hexToBytes(hex);

      if (
        BinaryUtils.constantTimeEqual(sampleBytes, restoredBytes) &&
        BinaryUtils.constantTimeEqual(sampleBytes, restoredHexBytes)
      ) {
        binaryCodecPass = true;
        details.push('✅ Test 4: Binary Utils: Chuyển đổi Base64URL, Hex, Uint8Array bảo toàn byte chính xác.');
      } else {
        details.push('❌ Test 4: Lỗi chuyển đổi nhị phân.');
      }

      // --- TEST 5 (TASK 1.2): PBKDF2 600,000 Rounds in Web Worker ---
      const salt = KeyDerivation.generateSalt(16);
      const pbkdf2Res = await WorkerCryptoClient.derivePBKDF2InBackground(
        'super-secret-user-passphrase-vaultsync',
        salt,
        600_000
      );

      if (pbkdf2Res.key && pbkdf2Res.rawKey.length === 32) {
        pbkdf2WorkerPass = true;
        details.push(`✅ Test 5: PBKDF2 (600,000 rounds): Hoàn thành trong ${pbkdf2Res.durationMs}ms (Chạy trên Web Worker: ${pbkdf2Res.usedWorker ? 'Có (Non-blocking UI 60 FPS)' : 'Main Thread Fallback'}).`);
      } else {
        details.push('❌ Test 5: PBKDF2 derivation thất bại.');
      }

      // --- TEST 6 (TASK 1.2): ECDH P-256 Shared Secret Agreement (Alice & Bob) ---
      const aliceKeys = await IdentityKeys.generateECDHKeyPair();
      const bobKeys = await IdentityKeys.generateECDHKeyPair();

      const aliceSharedKey = await IdentityKeys.computeECDHSharedSecret(aliceKeys.privateKey, bobKeys.publicKey);
      const bobSharedKey = await IdentityKeys.computeECDHSharedSecret(bobKeys.privateKey, aliceKeys.publicKey);

      const aliceRaw = await WebCryptoEngine.exportRawKey(aliceSharedKey);
      const bobRaw = await WebCryptoEngine.exportRawKey(bobSharedKey);

      if (BinaryUtils.constantTimeEqual(aliceRaw, bobRaw)) {
        ecdhSharedSecretPass = true;
        details.push('✅ Test 6: ECDH P-256 Key Agreement: Khóa bí mật chung (Shared Secret) giữa Alice & Bob khớp 100%.');
      } else {
        details.push('❌ Test 6: ECDH Shared Secret không khớp giữa hai bên.');
      }

      // --- TEST 7 (TASK 1.2): ECDSA P-256 Digital Signature & Tamper Detection ---
      const ecdsaKeys = await IdentityKeys.generateECDSAKeyPair();
      const messageToSign = BinaryUtils.stringToBytes('CRDT Document Update #42 signed by Alice');
      const signature = await IdentityKeys.signData(ecdsaKeys.privateKey, messageToSign);

      const validSig = await IdentityKeys.verifySignature(ecdsaKeys.publicKey, signature, messageToSign);

      // Thử giả mạo chữ ký
      const tamperedMessage = BinaryUtils.stringToBytes('CRDT Document Update #42 tampered by Attacker');
      const tamperedSigCheck = await IdentityKeys.verifySignature(ecdsaKeys.publicKey, signature, tamperedMessage);

      if (validSig === true && tamperedSigCheck === false) {
        ecdsaSignaturePass = true;
        details.push('✅ Test 7: ECDSA P-256 Chữ Ký Số: Xác thực chữ ký hợp lệ và từ chối chữ ký giả mạo 100%.');
      } else {
        details.push('❌ Test 7: Lỗi xác thực chữ ký ECDSA.');
      }

      // --- BENCHMARK: AES-256-GCM Throughput & Latency ---
      const payloadSize = 64 * 1024;
      const benchmarkData = new Uint8Array(payloadSize);
      crypto.getRandomValues(benchmarkData);

      const iterations = 100;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        await WebCryptoEngine.encryptAESGCM(key, benchmarkData);
      }

      const totalTimeMs = performance.now() - start;
      const totalMB = (payloadSize * iterations) / (1024 * 1024);
      const throughputMBps = Math.round((totalMB / (totalTimeMs / 1000)) * 10) / 10;
      const opsPerSec = Math.round((iterations / (totalTimeMs / 1000)));

      details.push(`🚀 Benchmark: Thông lượng AES-256-GCM đạt ${throughputMBps} MB/s (${opsPerSec} ops/sec, độ trễ ${Math.round((totalTimeMs / iterations) * 100) / 100}ms/op).`);

      const benchmarkResult: CryptoBenchmarkResult = {
        operation: 'AES-256-GCM (64KB Payload)',
        iterations,
        totalTimeMs: Math.round(totalTimeMs),
        opsPerSec,
        throughputMBps
      };

      const allPassed = encryptDecryptPass &&
        aadTamperPass &&
        nonceMonotonicPass &&
        binaryCodecPass &&
        pbkdf2WorkerPass &&
        ecdhSharedSecretPass &&
        ecdsaSignaturePass;

      return {
        allPassed,
        encryptDecryptPass,
        aadTamperPass,
        nonceMonotonicPass,
        binaryCodecPass,
        pbkdf2WorkerPass,
        ecdhSharedSecretPass,
        ecdsaSignaturePass,
        benchmark: benchmarkResult,
        details
      };
    } catch (err: any) {
      details.push(`❌ Lỗi ngoại lệ trong quá trình chạy test suite: ${err.message}`);
      return {
        allPassed: false,
        encryptDecryptPass,
        aadTamperPass,
        nonceMonotonicPass,
        binaryCodecPass,
        pbkdf2WorkerPass,
        ecdhSharedSecretPass,
        ecdsaSignaturePass,
        benchmark: { operation: 'Failed', iterations: 0, totalTimeMs: 0, opsPerSec: 0, throughputMBps: 0 },
        details
      };
    }
  }
}
