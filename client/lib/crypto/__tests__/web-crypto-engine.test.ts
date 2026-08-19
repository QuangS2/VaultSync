import { describe, it, expect } from 'vitest';
import { WebCryptoEngine } from '../web-crypto-engine';
import { EnvelopeEncryptionManager } from '../envelope-encryption';
import { ChunkType } from '../types';

describe('WebCryptoEngine — Native AES-256-GCM Cryptographic Unit Tests', () => {
  it('should generate a valid 256-bit AES-GCM CryptoKey', async () => {
    const key = await EnvelopeEncryptionManager.generateDocumentKey();
    expect(key).toBeDefined();
    expect(key.type).toBe('secret');
    expect(key.algorithm.name).toBe('AES-GCM');
    expect((key.algorithm as AesKeyAlgorithm).length).toBe(256);
  });

  it('should encrypt and decrypt plaintext data successfully', async () => {
    const key = await EnvelopeEncryptionManager.generateDocumentKey();
    const plaintext = new TextEncoder().encode('Xin chào VaultSync E2EE Cryptographic Engine!');

    const aad = {
      documentId: 'doc-unit-test-1',
      epoch: 1,
      chunkType: ChunkType.CRDT_UPDATE,
      authorUserId: 'user_alice'
    };

    const encResult = await WebCryptoEngine.encryptAESGCM(key, plaintext, { aadMetadata: aad });

    expect(encResult.iv).toBeDefined();
    expect(encResult.iv.byteLength).toBe(12); // 96-bit standard AES-GCM nonce
    expect(encResult.ciphertext).toBeDefined();
    expect(encResult.ciphertext.byteLength).toBe(plaintext.byteLength + 16); // Plaintext + 16B Auth Tag

    const decryptedBytes = await WebCryptoEngine.decryptAESGCM(key, encResult.ciphertext, encResult.iv, { aadMetadata: aad });
    const decryptedText = new TextDecoder().decode(decryptedBytes);

    expect(decryptedText).toBe('Xin chào VaultSync E2EE Cryptographic Engine!');
  });

  it('should fail decryption when ciphertext is tampered by 1 byte', async () => {
    const key = await EnvelopeEncryptionManager.generateDocumentKey();
    const plaintext = new TextEncoder().encode('Dữ liệu bí mật không được sửa đổi.');

    const encResult = await WebCryptoEngine.encryptAESGCM(key, plaintext);

    // Tamper 1 byte in the middle of ciphertext
    const tamperedCipher = new Uint8Array(encResult.ciphertext);
    tamperedCipher[5] = (tamperedCipher[5] ?? 0) ^ 0xff;

    await expect(
      WebCryptoEngine.decryptAESGCM(key, tamperedCipher, encResult.iv)
    ).rejects.toThrow();
  });

  it('should fail decryption when AAD metadata is mismatched', async () => {
    const key = await EnvelopeEncryptionManager.generateDocumentKey();
    const plaintext = new TextEncoder().encode('Nội dung bảo vệ bởi AAD binding.');

    const originalAAD = {
      documentId: 'doc-original',
      epoch: 1,
      chunkType: ChunkType.CRDT_UPDATE,
      authorUserId: 'user_alice'
    };

    const spoofedAAD = {
      documentId: 'doc-spoofed',
      epoch: 1,
      chunkType: ChunkType.CRDT_UPDATE,
      authorUserId: 'user_alice'
    };

    const encResult = await WebCryptoEngine.encryptAESGCM(key, plaintext, { aadMetadata: originalAAD });

    // Attempting to decrypt with spoofed AAD must fail GHASH verification
    await expect(
      WebCryptoEngine.decryptAESGCM(key, encResult.ciphertext, encResult.iv, { aadMetadata: spoofedAAD })
    ).rejects.toThrow();
  });

  it('should fail decryption when using wrong CryptoKey', async () => {
    const key1 = await EnvelopeEncryptionManager.generateDocumentKey();
    const key2 = await EnvelopeEncryptionManager.generateDocumentKey();
    const plaintext = new TextEncoder().encode('Test key separation');

    const encResult = await WebCryptoEngine.encryptAESGCM(key1, plaintext);

    await expect(
      WebCryptoEngine.decryptAESGCM(key2, encResult.ciphertext, encResult.iv)
    ).rejects.toThrow();
  });
});
