/**
 * Asymmetric Identity Keys Management (ECDH P-256 Key Agreement & ECDSA Digital Signatures)
 * Enables Zero-Knowledge Envelope Encryption, Key Exchange, and Document Edit Authorship Proofs.
 */

import { BinaryUtils } from './binary-utils';

export interface ECDHKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface ECDSAKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export class IdentityKeys {
  /**
   * Generates an ECDH (P-256 / secp256r1) key pair for asymmetric key exchange.
   */
  public static async generateECDHKeyPair(extractable: boolean = true): Promise<ECDHKeyPair> {
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      extractable,
      ['deriveKey', 'deriveBits']
    );
    return keyPair;
  }

  /**
   * Computes a shared symmetric AES-256-GCM key from local Private Key and remote Peer's Public Key.
   * 
   * @param localPrivateKey - Local user's ECDH Private Key
   * @param peerPublicKey - Peer's ECDH Public Key
   */
  public static async computeECDHSharedSecret(
    localPrivateKey: CryptoKey,
    peerPublicKey: CryptoKey
  ): Promise<CryptoKey> {
    return await crypto.subtle.deriveKey(
      {
        name: 'ECDH',
        public: peerPublicKey
      },
      localPrivateKey,
      { name: 'AES-GCM', length: 256 },
      true, // extractable for key wrapping
      ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
    );
  }

  /**
   * Generates an ECDSA (P-256 / SHA-256) key pair for digital signatures.
   */
  public static async generateECDSAKeyPair(extractable: boolean = true): Promise<ECDSAKeyPair> {
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      extractable,
      ['sign', 'verify']
    );
    return keyPair;
  }

  /**
   * Digitally signs a binary message chunk using an ECDSA Private Key.
   */
  public static async signData(
    privateKey: CryptoKey,
    data: Uint8Array
  ): Promise<Uint8Array> {
    const signatureBuffer = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      privateKey,
      data as BufferSource
    );
    return new Uint8Array(signatureBuffer);
  }

  /**
   * Verifies an ECDSA digital signature against the provided data and Public Key.
   * Returns true if authentic, false if tampered.
   */
  public static async verifySignature(
    publicKey: CryptoKey,
    signature: Uint8Array,
    data: Uint8Array
  ): Promise<boolean> {
    return await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      signature as BufferSource,
      data as BufferSource
    );
  }

  /**
   * Exports an asymmetric Public Key to standard SPKI (Base64URL encoded) format.
   */
  public static async exportPublicKeySPKI(publicKey: CryptoKey): Promise<string> {
    const spkiBuffer = await crypto.subtle.exportKey('spki', publicKey);
    return BinaryUtils.bufferToBase64Url(new Uint8Array(spkiBuffer));
  }

  /**
   * Imports an asymmetric Public Key from SPKI Base64URL string.
   */
  public static async importPublicKeySPKI(
    spkiBase64: string,
    algorithm: 'ECDH' | 'ECDSA' = 'ECDH'
  ): Promise<CryptoKey> {
    const bytes = BinaryUtils.base64UrlToBytes(spkiBase64);
    const usages: KeyUsage[] = algorithm === 'ECDH' ? [] : ['verify'];

    return await crypto.subtle.importKey(
      'spki',
      bytes as BufferSource,
      { name: algorithm, namedCurve: 'P-256' },
      true,
      usages
    );
  }

  /**
   * Exports an asymmetric key to standard JSON Web Key (JWK).
   */
  public static async exportJWK(key: CryptoKey): Promise<JsonWebKey> {
    return await crypto.subtle.exportKey('jwk', key);
  }

  /**
   * Imports an asymmetric key from JSON Web Key (JWK).
   */
  public static async importJWK(
    jwk: JsonWebKey,
    algorithm: 'ECDH' | 'ECDSA',
    isPrivate: boolean
  ): Promise<CryptoKey> {
    const usages: KeyUsage[] = algorithm === 'ECDH'
      ? (isPrivate ? ['deriveKey', 'deriveBits'] : [])
      : (isPrivate ? ['sign'] : ['verify']);

    return await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: algorithm, namedCurve: 'P-256' },
      true,
      usages
    );
  }
}
