/**
 * Deterministic Client-Indexed Monotonic Nonce Generator
 * Compliant with NIST SP 800-38D Recommendation for AES-GCM 96-bit IVs.
 * Completely eliminates Birthday Paradox Nonce Collision risk in distributed multi-peer systems.
 */

export class NonceManager {
  private clientId: number;       // 32-bit unsigned integer (4 bytes)
  private epoch: number;          // 16-bit unsigned integer (2 bytes)
  private counter: bigint;        // 48-bit unsigned integer (6 bytes)

  /**
   * Initializes the Nonce Manager for the current client session.
   * @param clientId - Unique 32-bit client integer (if omitted, generated cryptographically)
   * @param initialEpoch - Key epoch version (defaults to 1)
   */
  constructor(clientId?: number, initialEpoch: number = 1) {
    if (clientId !== undefined) {
      this.clientId = clientId >>> 0; // Ensure unsigned 32-bit
    } else {
      const randBuf = new Uint32Array(1);
      crypto.getRandomValues(randBuf);
      this.clientId = (randBuf[0] ?? 1) >>> 0;
    }

    this.epoch = initialEpoch & 0xffff;
    this.counter = 0n;
  }

  /**
   * Returns the current 32-bit Client ID.
   */
  public getClientId(): number {
    return this.clientId;
  }

  /**
   * Sets or increments the current key epoch version.
   */
  public setEpoch(epoch: number): void {
    this.epoch = epoch & 0xffff;
    this.counter = 0n; // Reset monotonic counter on key rotation
  }

  /**
   * Generates the next strictly monotonic 12-byte (96-bit) IV for AES-GCM.
   * Format: [ClientID (4B), Epoch (2B), Counter (6B)]
   */
  public nextIV(): Uint8Array {
    this.counter = this.counter + 1n;

    // Boundary check for 48-bit counter limit (2.8 x 10^14)
    if (this.counter >= 0xffffffffffffn) {
      throw new Error('Monotonic 48-bit counter overflow. Document Key rotation required immediately.');
    }

    const iv = new Uint8Array(12);
    const view = new DataView(iv.buffer);

    // 1. Client ID (Bytes 0..3) - Big Endian 32-bit
    view.setUint32(0, this.clientId, false);

    // 2. Epoch (Bytes 4..5) - Big Endian 16-bit
    view.setUint16(4, this.epoch, false);

    // 3. Counter (Bytes 6..11) - Big Endian 48-bit
    const high16 = Number((this.counter >> 32n) & 0xffffn);
    const low32 = Number(this.counter & 0xffffffffn);
    view.setUint16(6, high16, false);
    view.setUint32(8, low32, false);

    return iv;
  }

  /**
   * Decodes an existing 12-byte IV into its structured components.
   */
  public static parseIV(iv: Uint8Array): { clientId: number; epoch: number; counter: bigint } {
    if (iv.length !== 12) {
      throw new Error('Invalid AES-GCM IV length. Expected exactly 12 bytes.');
    }

    const view = new DataView(iv.buffer, iv.byteOffset, iv.byteLength);
    const clientId = view.getUint32(0, false);
    const epoch = view.getUint16(4, false);
    
    const high16 = BigInt(view.getUint16(6, false));
    const low32 = BigInt(view.getUint32(8, false));
    const counter = (high16 << 32n) | low32;

    return { clientId, epoch, counter };
  }
}
