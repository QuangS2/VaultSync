/**
 * High-Performance Zero-Dependency Binary Utilities
 * Optimized for Web Crypto ArrayBuffer, Uint8Array, Base64URL, Hex, and UTF-8 strings.
 */

export class BinaryUtils {
  private static readonly TEXT_ENCODER = new TextEncoder();
  private static readonly TEXT_DECODER = new TextDecoder('utf-8');

  /**
   * Converts a UTF-8 string to a Uint8Array.
   */
  public static stringToBytes(str: string): Uint8Array {
    return BinaryUtils.TEXT_ENCODER.encode(str);
  }

  /**
   * Converts a Uint8Array / ArrayBuffer to a UTF-8 string.
   */
  public static bytesToString(bytes: ArrayBuffer | Uint8Array): string {
    const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    return BinaryUtils.TEXT_DECODER.decode(view);
  }

  /**
   * Encodes a binary buffer into a standard RFC 4648 Base64URL string (URL-safe, no padding).
   */
  public static bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    
    // Chunked processing (32KB chunks) to prevent Call Stack Overflow on large binary blobs
    const chunkSize = 0x8000;
    const chunks: string[] = [];
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const subarray = bytes.subarray(i, i + chunkSize);
      chunks.push(String.fromCharCode.apply(null, subarray as unknown as number[]));
    }
    
    const binary = chunks.join('');
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Decodes an RFC 4648 Base64URL string back into a Uint8Array.
   */
  public static base64UrlToBytes(base64Url: string): Uint8Array {
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    
    const binary = atob(base64);
    const length = binary.length;
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Converts a binary buffer to a lowercase hexadecimal string.
   */
  public static bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Converts a hexadecimal string back to a Uint8Array.
   */
  public static hexToBytes(hex: string): Uint8Array {
    const cleanHex = hex.replace(/\s+/g, '');
    if (cleanHex.length % 2 !== 0) {
      throw new Error('Hex string must have an even length.');
    }
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
    }
    return bytes;
  }

  /**
   * Converts a standard UUID string (e.g. "550e8400-e29b-41d4-a716-446655440000") into a 16-byte Uint8Array.
   */
  public static uuidToBytes(uuid: string): Uint8Array {
    const cleanHex = uuid.replace(/-/g, '');
    if (cleanHex.length !== 32) {
      // Fallback for non-standard ID strings: SHA-256 slice or UTF-8 truncated
      const bytes = new Uint8Array(16);
      const strBytes = BinaryUtils.stringToBytes(uuid);
      bytes.set(strBytes.subarray(0, 16));
      return bytes;
    }
    return BinaryUtils.hexToBytes(cleanHex);
  }

  /**
   * Constant-time byte array comparison to prevent timing attacks.
   */
  public static constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) {
      return false;
    }
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
    }
    return diff === 0;
  }
}
