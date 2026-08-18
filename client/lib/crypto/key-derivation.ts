/**
 * Enterprise Key Derivation Functions (PBKDF2 & HKDF-SHA256)
 * Compliant with OWASP 2023 Recommendations and RFC 5869.
 */

import { BinaryUtils } from './binary-utils';

export interface PBKDF2Options {
  iterations?: number;
  hash?: 'SHA-256' | 'SHA-512';
}

export class KeyDerivation {
  public static readonly DEFAULT_PBKDF2_ITERATIONS = 600_000; // OWASP recommendation for PBKDF2-HMAC-SHA256

  /**
   * Generates a cryptographically strong 16-byte (128-bit) salt.
   */
  public static generateSalt(length: number = 16): Uint8Array {
    const salt = new Uint8Array(length);
    crypto.getRandomValues(salt);
    return salt;
  }

  /**
   * Derives a 256-bit AES-GCM Master Key from a user passphrase and salt using PBKDF2-HMAC-SHA256.
   * 
   * @param passphrase - User plaintext passphrase
   * @param salt - 16-byte random salt
   * @param options - Iteration count (defaults to 600,000)
   */
  public static async deriveMasterKeyPBKDF2(
    passphrase: string,
    salt: Uint8Array,
    options?: PBKDF2Options
  ): Promise<CryptoKey> {
    const iterations = options?.iterations ?? KeyDerivation.DEFAULT_PBKDF2_ITERATIONS;
    const hash = options?.hash ?? 'SHA-256';

    const passBytes = BinaryUtils.stringToBytes(passphrase);

    // 1. Import passphrase as raw Key-Derivation Key
    const baseKey = await crypto.subtle.importKey(
      'raw',
      passBytes as BufferSource,
      'PBKDF2',
      false,
      ['deriveKey', 'deriveBits']
    );

    // 2. Derive AES-256-GCM symmetric key
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: iterations,
        hash: hash
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      true, // extractable for client-side storage wrapping
      ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
    );
  }

  /**
   * Derives multiple deterministic sub-keys from a Master Secret using HKDF-SHA256 (RFC 5869).
   * 
   * @param masterKey - Base CryptoKey or raw secret bytes
   * @param info - Context and application-specific info string (e.g. "vaultsync:storage:kek" or "vaultsync:ws:signing")
   * @param salt - Optional salt (defaults to 16 bytes)
   * @param keyLengthBits - Length of derived key in bits (defaults to 256)
   */
  public static async deriveSubKeyHKDF(
    masterKey: CryptoKey | Uint8Array,
    info: string,
    salt?: Uint8Array,
    keyLengthBits: number = 256
  ): Promise<CryptoKey> {
    let baseKey: CryptoKey;

    if (masterKey instanceof Uint8Array) {
      baseKey = await crypto.subtle.importKey(
        'raw',
        masterKey as BufferSource,
        'HKDF',
        false,
        ['deriveKey', 'deriveBits']
      );
    } else {
      // Export and re-import for HKDF if baseKey is not HKDF type
      const rawBytes = await crypto.subtle.exportKey('raw', masterKey);
      baseKey = await crypto.subtle.importKey(
        'raw',
        rawBytes,
        'HKDF',
        false,
        ['deriveKey', 'deriveBits']
      );
    }

    const saltBuffer = salt ?? new Uint8Array(16); // 16-byte zero salt if omitted
    const infoBytes = BinaryUtils.stringToBytes(info);

    return await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: saltBuffer as BufferSource,
        info: infoBytes as BufferSource
      },
      baseKey,
      { name: 'AES-GCM', length: keyLengthBits },
      true,
      ['encrypt', 'decrypt']
    );
  }
}
