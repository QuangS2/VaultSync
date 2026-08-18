/**
 * Enterprise Web Crypto API Engine (AES-256-GCM with AEAD & AAD Tamper-Proofing)
 * High-performance cryptographic operations backed by native browser C++ / hardware acceleration.
 */

import { BinaryUtils } from './binary-utils';
import { NonceManager } from './nonce-manager';
import { AADMetadata, EncryptedBinaryResult } from './types';

export interface EncryptOptions {
  customIV?: Uint8Array;
  nonceManager?: NonceManager;
  aadMetadata?: AADMetadata;
}

export interface DecryptOptions {
  aadMetadata?: AADMetadata;
}

export class WebCryptoEngine {
  /**
   * Generates a cryptographically strong symmetric AES-256-GCM key.
   * @param extractable - Whether raw key bytes can be exported (true for envelope wrapping)
   */
  public static async generateAESGCMKey(extractable: boolean = true): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      extractable,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generates a random 12-byte (96-bit) IV fallback.
   */
  public static generateRandomIV(): Uint8Array {
    const iv = new Uint8Array(12);
    crypto.getRandomValues(iv);
    return iv;
  }

  /**
   * Constructs a structured binary AAD buffer for binding metadata to AES-GCM GHASH.
   * Format: [16B UUID || 2B Epoch || 1B ChunkType]
   */
  public static buildAAD(metadata: AADMetadata): Uint8Array {
    const uuidBytes = BinaryUtils.uuidToBytes(metadata.documentId);
    const aad = new Uint8Array(16 + 2 + 1);
    
    // 16-byte Document ID
    aad.set(uuidBytes, 0);

    // 2-byte Big Endian Epoch
    aad[16] = (metadata.epoch >> 8) & 0xff;
    aad[17] = metadata.epoch & 0xff;

    // 1-byte Chunk Type Opcode
    aad[18] = metadata.chunkType & 0xff;

    return aad;
  }

  /**
   * Encrypts plaintext bytes using AES-256-GCM with optional AAD tamper resistance.
   * 
   * @param key - CryptoKey (AES-GCM 256-bit)
   * @param plaintext - Uint8Array binary chunk to encrypt
   * @param options - IV strategy (deterministic NonceManager or random) and AAD metadata
   */
  public static async encryptAESGCM(
    key: CryptoKey,
    plaintext: Uint8Array,
    options?: EncryptOptions
  ): Promise<EncryptedBinaryResult> {
    // 1. Determine 12-byte IV
    let iv: Uint8Array;
    if (options?.customIV) {
      iv = options.customIV;
    } else if (options?.nonceManager) {
      iv = options.nonceManager.nextIV();
    } else {
      iv = WebCryptoEngine.generateRandomIV();
    }

    // 2. Prepare AES-GCM parameters
    const params: AesGcmParams = {
      name: 'AES-GCM',
      iv: iv as BufferSource,
      tagLength: 128 // 128-bit GHASH authentication tag
    };

    if (options?.aadMetadata) {
      params.additionalData = WebCryptoEngine.buildAAD(options.aadMetadata) as BufferSource;
    }

    // 3. Native hardware-accelerated encryption
    const encryptedBuffer = await crypto.subtle.encrypt(
      params,
      key,
      plaintext as BufferSource
    );

    const ciphertext = new Uint8Array(encryptedBuffer);

    // 4. Create combined binary buffer: IV (12B) || Ciphertext (NB with 16B Tag)
    const combined = new Uint8Array(iv.length + ciphertext.length);
    combined.set(iv, 0);
    combined.set(ciphertext, iv.length);

    return {
      iv,
      ciphertext,
      combinedBinary: combined,
      combinedBase64: BinaryUtils.bufferToBase64Url(combined)
    };
  }

  /**
   * Decrypts AES-256-GCM ciphertext using the given key, IV, and optional AAD.
   * Throws a cryptographic OperationError if ciphertext, tag, or AAD has been tampered with.
   */
  public static async decryptAESGCM(
    key: CryptoKey,
    ciphertext: Uint8Array,
    iv: Uint8Array,
    options?: DecryptOptions
  ): Promise<Uint8Array> {
    const params: AesGcmParams = {
      name: 'AES-GCM',
      iv: iv as BufferSource,
      tagLength: 128
    };

    if (options?.aadMetadata) {
      params.additionalData = WebCryptoEngine.buildAAD(options.aadMetadata) as BufferSource;
    }

    const decryptedBuffer = await crypto.subtle.decrypt(
      params,
      key,
      ciphertext as BufferSource
    );

    return new Uint8Array(decryptedBuffer);
  }

  /**
   * Decrypts a combined payload formatted as: IV (12 bytes) || Ciphertext (N bytes).
   */
  public static async decryptCombined(
    key: CryptoKey,
    combined: Uint8Array,
    options?: DecryptOptions
  ): Promise<Uint8Array> {
    if (combined.length < 12 + 16) {
      throw new Error('Payload too short to contain 12-byte IV and 16-byte AES-GCM authentication tag.');
    }

    const iv = combined.subarray(0, 12);
    const ciphertext = combined.subarray(12);

    return await WebCryptoEngine.decryptAESGCM(key, ciphertext, iv, options);
  }

  /**
   * Computes a SHA-256 hash digest.
   */
  public static async digestSHA256(data: Uint8Array): Promise<Uint8Array> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data as BufferSource);
    return new Uint8Array(hashBuffer);
  }

  /**
   * Exports an AES-256-GCM key to raw 32-byte format.
   */
  public static async exportRawKey(key: CryptoKey): Promise<Uint8Array> {
    const rawBuffer = await crypto.subtle.exportKey('raw', key);
    return new Uint8Array(rawBuffer);
  }

  /**
   * Imports an AES-256-GCM key from raw 32-byte buffer.
   */
  public static async importRawKey(
    rawBytes: Uint8Array,
    extractable: boolean = true
  ): Promise<CryptoKey> {
    if (rawBytes.length !== 32) {
      throw new Error('AES-256 key must be exactly 32 bytes (256 bits).');
    }

    return await crypto.subtle.importKey(
      'raw',
      rawBytes as BufferSource,
      { name: 'AES-GCM', length: 256 },
      extractable,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Exports an AES-256-GCM key to standard JSON Web Key (JWK).
   */
  public static async exportJWK(key: CryptoKey): Promise<JsonWebKey> {
    return await crypto.subtle.exportKey('jwk', key);
  }

  /**
   * Imports an AES-256-GCM key from JSON Web Key (JWK).
   */
  public static async importJWK(
    jwk: JsonWebKey,
    extractable: boolean = true
  ): Promise<CryptoKey> {
    return await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'AES-GCM', length: 256 },
      extractable,
      ['encrypt', 'decrypt']
    );
  }
}
