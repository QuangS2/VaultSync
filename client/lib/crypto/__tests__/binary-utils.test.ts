import { describe, it, expect } from 'vitest';
import { BinaryUtils } from '../binary-utils';

describe('BinaryUtils — Hex and Base64 Conversion Unit Tests', () => {
  it('should convert Uint8Array to Hex string and back losslessly', () => {
    const originalBytes = new Uint8Array([0x00, 0x01, 0x0a, 0x1f, 0xff, 0xde, 0xad, 0xbe, 0xef]);
    const hex = BinaryUtils.bufferToHex(originalBytes);

    expect(hex).toBe('00010a1fffdeadbeef');

    const recoveredBytes = BinaryUtils.hexToBytes(hex);
    expect(recoveredBytes).toEqual(originalBytes);
  });

  it('should convert Uint8Array to Base64URL string and back losslessly', () => {
    const text = 'VaultSync Zero-Knowledge Architecture & Binary Codecs';
    const originalBytes = new TextEncoder().encode(text);

    const base64Url = BinaryUtils.bufferToBase64Url(originalBytes);
    expect(typeof base64Url).toBe('string');

    const recoveredBytes = BinaryUtils.base64UrlToBytes(base64Url);
    expect(new TextDecoder().decode(recoveredBytes)).toBe(text);
  });

  it('should handle empty buffers cleanly', () => {
    const emptyBytes = new Uint8Array(0);

    const hex = BinaryUtils.bufferToHex(emptyBytes);
    expect(hex).toBe('');
    expect(BinaryUtils.hexToBytes('')).toEqual(emptyBytes);

    const base64Url = BinaryUtils.bufferToBase64Url(emptyBytes);
    expect(base64Url).toBe('');
    expect(BinaryUtils.base64UrlToBytes('')).toEqual(emptyBytes);
  });

  it('should throw error on malformed hex strings with odd lengths', () => {
    expect(() => BinaryUtils.hexToBytes('abc')).toThrow();
  });
});
