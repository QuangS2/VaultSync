/**
 * Background Dedicated Web Worker for PBKDF2 600,000 Iterations Key Derivation
 * Offloads heavy CPU computations away from the browser UI Main Thread to preserve 60 FPS responsiveness.
 */

export interface PBKDF2WorkerRequest {
  id: string;
  passphrase: string;
  salt: Uint8Array;
  iterations: number;
}

export interface PBKDF2WorkerResponse {
  id: string;
  success: boolean;
  rawKey?: Uint8Array;
  error?: string;
  durationMs?: number;
}

// Ensure proper typing for web worker message listener
addEventListener('message', async (event: MessageEvent<PBKDF2WorkerRequest>) => {
  const { id, passphrase, salt, iterations } = event.data;
  const start = performance.now();

  try {
    const encoder = new TextEncoder();
    const passBytes = encoder.encode(passphrase);

    // 1. Import passphrase as Key-Derivation base
    const baseKey = await crypto.subtle.importKey(
      'raw',
      passBytes as BufferSource,
      'PBKDF2',
      false,
      ['deriveKey', 'deriveBits']
    );

    // 2. Heavy PBKDF2-HMAC-SHA256 Derivation
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: iterations,
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    // 3. Export raw 32 bytes to transfer back
    const rawBuffer = await crypto.subtle.exportKey('raw', derivedKey);
    const rawKey = new Uint8Array(rawBuffer);
    const durationMs = Math.round(performance.now() - start);

    const response: PBKDF2WorkerResponse = {
      id,
      success: true,
      rawKey,
      durationMs
    };

    postMessage(response);
  } catch (err: any) {
    const response: PBKDF2WorkerResponse = {
      id,
      success: false,
      error: err.message || 'PBKDF2 derivation failed in Web Worker'
    };
    postMessage(response);
  }
});
