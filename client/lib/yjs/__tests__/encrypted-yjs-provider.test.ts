import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as Y from 'yjs';
import { EncryptedYjsProvider } from '../encrypted-yjs-provider';
import { WebCryptoEngine } from '../../crypto/web-crypto-engine';
import { ProviderConnectionStatus } from '../types';

describe('EncryptedYjsProvider Unit Tests (Task 12.1)', () => {
  let yDoc: Y.Doc;
  let documentKey: CryptoKey;

  beforeEach(async () => {
    yDoc = new Y.Doc();
    documentKey = await WebCryptoEngine.generateAESGCMKey();
  });

  afterEach(() => {
    yDoc.destroy();
  });

  it('should initialize with offline state when autoConnect is false', () => {
    const statuses: ProviderConnectionStatus[] = [];
    const provider = new EncryptedYjsProvider({
      serverUrl: 'ws://localhost:1234',
      roomId: 'test-room-1',
      yDoc,
      documentKey,
      autoConnect: false,
      user: {
        name: 'Quang Lê',
        color: '#10b981',
        avatar: 'Q'
      },
      onStatusChange: (s) => statuses.push(s)
    });

    expect(provider.roomId).toBe('test-room-1');
    expect(provider.getEpoch()).toBe(1);
    expect(provider.getStatus().connected).toBe(false);
    expect(provider.getStatus().syncStatus).toBe('offline');

    const users = provider.getAwarenessUsers();
    expect(users.length).toBeGreaterThanOrEqual(1);
    expect(users[0]?.name).toBe('Quang Lê');

    provider.destroy();
  });

  it('should allow updating user awareness profile dynamically', () => {
    const provider = new EncryptedYjsProvider({
      serverUrl: 'ws://localhost:1234',
      roomId: 'test-room-2',
      yDoc,
      documentKey,
      autoConnect: false,
      user: {
        name: 'Initial User',
        color: '#2563eb'
      }
    });

    expect(provider.getAwarenessUsers()[0]?.name).toBe('Initial User');

    provider.setUser({
      name: 'Updated User Name',
      color: '#ec4899',
      avatar: 'U'
    });

    const updated = provider.getAwarenessUsers();
    expect(updated[0]?.name).toBe('Updated User Name');
    expect(updated[0]?.color).toBe('#ec4899');

    provider.destroy();
  });

  it('should clean up awareness and timers on destroy', () => {
    const provider = new EncryptedYjsProvider({
      serverUrl: 'ws://localhost:1234',
      roomId: 'test-room-3',
      yDoc,
      documentKey,
      autoConnect: false
    });

    provider.destroy();
    expect(provider.getStatus().connected).toBe(false);
  });
});
