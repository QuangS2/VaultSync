/**
 * VaultSync Cryptographic Core Types
 * Strict typing for Web Crypto operations, AEAD packets, and deterministic nonces.
 */

export type Base64URLString = string;

export enum ChunkType {
  CRDT_UPDATE = 0x01,
  COMMENT_THREAD = 0x02,
  DOCUMENT_META = 0x03,
  AWARENESS_PRESENCE = 0x04
}

export interface EncryptedPayload {
  iv: Base64URLString;          // 12-byte (96-bit) IV in Base64URL
  ciphertext: Base64URLString;  // AES-GCM Ciphertext + 16B Auth Tag in Base64URL
  aad?: Base64URLString;        // Additional Authenticated Data in Base64URL
  epoch: number;                // Document Key Epoch Version
  timestamp: number;            // Timestamp of encryption (UNIX epoch ms)
}

export interface EncryptedBinaryResult {
  iv: Uint8Array;
  ciphertext: Uint8Array;
  combinedBinary: Uint8Array;   // IV (12B) || Ciphertext (NB)
  combinedBase64: Base64URLString;
}

export interface AADMetadata {
  documentId: string;
  epoch: number;
  chunkType: ChunkType;
  authorUserId?: string;
}

export interface CryptoBenchmarkResult {
  operation: string;
  iterations: number;
  totalTimeMs: number;
  opsPerSec: number;
  throughputMBps: number;
}
