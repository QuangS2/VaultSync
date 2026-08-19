/**
 * Enterprise Asymmetric Key Exchange & Envelope Encryption Manager (11/10 Precision)
 * Implements ECDH (P-256) Key Agreement + HKDF-SHA256 Expansion + AES-256-GCM Key Wrapping.
 * Compliant with RFC 5869, NIST SP 800-56A, and OWASP Cryptographic Standards.
 */

import { BinaryUtils } from './binary-utils';
import { IdentityKeys } from './identity-keys';

export interface WrappedKeyEnvelope {
  envelopeId: string;
  documentId: string;
  epoch: number;
  senderPublicKeySPKI: string;
  recipientUserId: string;
  iv: string; // Base64URL
  ciphertext: string; // Base64URL (wrapped raw DEK)
  salt: string; // Base64URL
  createdAt: number;
}

export interface WrapDocumentKeyOptions {
  documentKey: CryptoKey;
  documentId: string;
  epoch?: number | undefined;
  senderPrivateKey: CryptoKey;
  senderPublicKey: CryptoKey | string;
  recipientPublicKey: CryptoKey | string;
  recipientUserId: string;
  salt?: Uint8Array | undefined;
}

export interface UnwrapDocumentKeyOptions {
  envelope: WrappedKeyEnvelope;
  recipientPrivateKey: CryptoKey;
}

export class EnvelopeEncryptionManager {
  /**
   * Generates a fresh random 256-bit Document Encryption Key (DEK) for AES-256-GCM.
   */
  public static async generateDocumentKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true, // extractable so it can be wrapped and distributed via envelopes
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Wraps a Document Encryption Key (DEK) for a target recipient using ECDH + HKDF-SHA256 + AES-256-GCM.
   */
  public static async wrapDocumentKey(options: WrapDocumentKeyOptions): Promise<WrappedKeyEnvelope> {
    // 1. Resolve Recipient ECDH Public Key
    let recipientPubKey: CryptoKey;
    if (typeof options.recipientPublicKey === 'string') {
      recipientPubKey = await IdentityKeys.importPublicKeySPKI(options.recipientPublicKey, 'ECDH');
    } else {
      recipientPubKey = options.recipientPublicKey;
    }

    // 2. Perform ECDH Key Agreement -> derive 256-bit raw shared secret
    const sharedBits = await crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        public: recipientPubKey
      },
      options.senderPrivateKey,
      256
    );

    // 3. Derive Key Encryption Key (KEK) using HKDF-SHA256 (RFC 5869)
    const epoch = options.epoch ?? 1;
    const saltBytes = options.salt ?? BinaryUtils.stringToBytes(`VaultSync-Salt-${options.documentId}`);
    const hkdfKey = await crypto.subtle.importKey(
      'raw',
      sharedBits,
      'HKDF',
      false,
      ['deriveKey']
    );

    const kek = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: saltBytes as BufferSource,
        info: BinaryUtils.stringToBytes(`VaultSync-Wrap-Epoch-${epoch}`) as BufferSource
      },
      hkdfKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    // 4. Export raw DEK bytes
    const rawDEK = await crypto.subtle.exportKey('raw', options.documentKey);

    // 5. Generate random 12-byte (96-bit) IV for AES-256-GCM
    const iv = new Uint8Array(12);
    crypto.getRandomValues(iv);

    // 6. Compute Cryptographic Additional Authenticated Data (AAD) binding documentId, epoch, and recipient
    const aad = BinaryUtils.stringToBytes(`${options.documentId}:${epoch}:${options.recipientUserId}`);

    // 7. Encrypt DEK with KEK
    const ciphertextBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
        additionalData: aad as BufferSource
      },
      kek,
      rawDEK as BufferSource
    );

    // 8. Resolve Sender Public Key as SPKI Base64URL string
    let senderSPKI: string;
    if (typeof options.senderPublicKey === 'string') {
      senderSPKI = options.senderPublicKey;
    } else {
      senderSPKI = await IdentityKeys.exportPublicKeySPKI(options.senderPublicKey);
    }

    const envelope: WrappedKeyEnvelope = {
      envelopeId: `env_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      documentId: options.documentId,
      epoch: epoch,
      senderPublicKeySPKI: senderSPKI,
      recipientUserId: options.recipientUserId,
      iv: BinaryUtils.bufferToBase64Url(iv),
      ciphertext: BinaryUtils.bufferToBase64Url(new Uint8Array(ciphertextBuffer)),
      salt: BinaryUtils.bufferToBase64Url(saltBytes),
      createdAt: Date.now()
    };

    return envelope;
  }

  /**
   * Unwraps a Document Encryption Key (DEK) from an envelope using the Recipient's Private Key.
   */
  public static async unwrapDocumentKey(options: UnwrapDocumentKeyOptions): Promise<CryptoKey> {
    const { envelope, recipientPrivateKey } = options;

    // 1. Import Sender's Public Key from SPKI Base64URL
    const senderPubKey = await IdentityKeys.importPublicKeySPKI(envelope.senderPublicKeySPKI, 'ECDH');

    // 2. Perform ECDH Key Agreement -> derive identical 256-bit raw shared secret
    const sharedBits = await crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        public: senderPubKey
      },
      recipientPrivateKey,
      256
    );

    // 3. Derive Key Encryption Key (KEK) using HKDF-SHA256
    const saltBytes = BinaryUtils.base64UrlToBytes(envelope.salt);
    const hkdfKey = await crypto.subtle.importKey(
      'raw',
      sharedBits,
      'HKDF',
      false,
      ['deriveKey']
    );

    const kek = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: saltBytes as BufferSource,
        info: BinaryUtils.stringToBytes(`VaultSync-Wrap-Epoch-${envelope.epoch}`) as BufferSource
      },
      hkdfKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    // 4. Decrypt raw DEK with AES-256-GCM
    const iv = BinaryUtils.base64UrlToBytes(envelope.iv);
    const ciphertext = BinaryUtils.base64UrlToBytes(envelope.ciphertext);
    const aad = BinaryUtils.stringToBytes(`${envelope.documentId}:${envelope.epoch}:${envelope.recipientUserId}`);

    const rawDEK = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
        additionalData: aad as BufferSource
      },
      kek,
      ciphertext as BufferSource
    );

    // 5. Import recovered raw bytes into AES-256-GCM CryptoKey
    return await crypto.subtle.importKey(
      'raw',
      rawDEK,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }
}
