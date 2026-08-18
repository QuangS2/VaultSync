/**
 * Real-Time Web Crypto Performance Benchmark & Validation Suite
 * Measures AES-256-GCM throughput, key generation latency, and AAD verification speed.
 */

import { WebCryptoEngine } from './web-crypto-engine';
import { NonceManager } from './nonce-manager';
import { ChunkType, CryptoBenchmarkResult } from './types';
import { BinaryUtils } from './binary-utils';

export interface CryptoTestSuiteResult {
  allPassed: boolean;
  encryptDecryptPass: boolean;
  aadTamperPass: boolean;
  nonceMonotonicPass: boolean;
  binaryCodecPass: boolean;
  benchmark: CryptoBenchmarkResult;
  details: string[];
}

export class CryptoBenchmark {
  /**
   * Runs the full validation suite and measures hardware acceleration throughput.
   */
  public static async runSuite(): Promise<CryptoTestSuiteResult> {
    const details: string[] = [];
    let encryptDecryptPass = false;
    let aadTamperPass = false;
    let nonceMonotonicPass = false;
    let binaryCodecPass = false;

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
        // Cố tình giải mã với documentId khác để kiểm tra tính năng bắt lỗi giả mạo
        const tamperedMeta = {
          documentId: '99999999-9999-9999-9999-999999999999', // Giả mạo ID tài liệu
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

      // --- BENCHMARK: Throughput & Latency ---
      const payloadSize = 64 * 1024; // 64 KB per chunk (typical rich text document size)
      const benchmarkData = new Uint8Array(payloadSize);
      crypto.getRandomValues(benchmarkData);

      const iterations = 200; // Total 12.8 MB of AES-256-GCM operations
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

      const allPassed = encryptDecryptPass && aadTamperPass && nonceMonotonicPass && binaryCodecPass;

      return {
        allPassed,
        encryptDecryptPass,
        aadTamperPass,
        nonceMonotonicPass,
        binaryCodecPass,
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
        benchmark: { operation: 'Failed', iterations: 0, totalTimeMs: 0, opsPerSec: 0, throughputMBps: 0 },
        details
      };
    }
  }
}
