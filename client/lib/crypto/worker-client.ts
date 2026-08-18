/**
 * Typed Web Worker Client for Background Cryptographic Operations
 * Dispatches jobs to pbkdf2.worker.ts with fallback to main thread if Web Workers are unavailable.
 */

import { WebCryptoEngine } from './web-crypto-engine';
import { KeyDerivation } from './key-derivation';
import { PBKDF2WorkerRequest, PBKDF2WorkerResponse } from './workers/pbkdf2.worker';

export interface DerivationResult {
  key: CryptoKey;
  rawKey: Uint8Array;
  durationMs: number;
  usedWorker: boolean;
}

export class WorkerCryptoClient {
  private static workerInstance: Worker | null = null;
  private static pendingCallbacks: Map<string, {
    resolve: (result: DerivationResult) => void;
    reject: (error: Error) => void;
    startTime: number;
  }> = new Map();

  /**
   * Initializes or reuses the singleton Web Worker instance.
   */
  private static getWorker(): Worker | null {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      return null;
    }

    if (!WorkerCryptoClient.workerInstance) {
      try {
        WorkerCryptoClient.workerInstance = new Worker(
          new URL('./workers/pbkdf2.worker.ts', import.meta.url),
          { type: 'module' }
        );

        WorkerCryptoClient.workerInstance.onmessage = async (event: MessageEvent<PBKDF2WorkerResponse>) => {
          const { id, success, rawKey, error, durationMs } = event.data;
          const pending = WorkerCryptoClient.pendingCallbacks.get(id);
          if (!pending) return;

          WorkerCryptoClient.pendingCallbacks.delete(id);

          if (success && rawKey) {
            try {
              const key = await WebCryptoEngine.importRawKey(rawKey);
              pending.resolve({
                key,
                rawKey,
                durationMs: durationMs ?? Math.round(performance.now() - pending.startTime),
                usedWorker: true
              });
            } catch (err: any) {
              pending.reject(err);
            }
          } else {
            pending.reject(new Error(error || 'Worker derivation failed'));
          }
        };

        WorkerCryptoClient.workerInstance.onerror = (err) => {
          console.error('Worker error:', err);
        };
      } catch (e) {
        console.warn('Could not initialize Web Worker, falling back to main thread.', e);
        WorkerCryptoClient.workerInstance = null;
      }
    }

    return WorkerCryptoClient.workerInstance;
  }

  /**
   * Derives a master key using PBKDF2 600,000 rounds in a background Web Worker.
   * If Web Worker is unavailable, executes on the main thread.
   */
  public static async derivePBKDF2InBackground(
    passphrase: string,
    salt: Uint8Array,
    iterations: number = KeyDerivation.DEFAULT_PBKDF2_ITERATIONS
  ): Promise<DerivationResult> {
    const worker = WorkerCryptoClient.getWorker();
    const startTime = performance.now();

    if (worker) {
      return new Promise<DerivationResult>((resolve, reject) => {
        const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        WorkerCryptoClient.pendingCallbacks.set(id, { resolve, reject, startTime });

        const request: PBKDF2WorkerRequest = {
          id,
          passphrase,
          salt,
          iterations
        };

        worker.postMessage(request);
      });
    } else {
      // Main Thread Fallback
      const key = await KeyDerivation.deriveMasterKeyPBKDF2(passphrase, salt, { iterations });
      const rawKey = await WebCryptoEngine.exportRawKey(key);
      const durationMs = Math.round(performance.now() - startTime);

      return {
        key,
        rawKey,
        durationMs,
        usedWorker: false
      };
    }
  }
}
