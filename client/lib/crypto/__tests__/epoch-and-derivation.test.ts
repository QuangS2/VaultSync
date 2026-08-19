import { describe, it, expect } from 'vitest';
import { KeyDerivation } from '../key-derivation';
import { EpochKeyManager } from '../epoch-key-manager';
import { EnvelopeEncryptionManager } from '../envelope-encryption';
import { IdentityKeys } from '../identity-keys';
import { ChunkType } from '../types';

describe('KeyDerivation & EpochKeyManager — Unit Tests', () => {
  it('should derive deterministic 256-bit AES-GCM key with PBKDF2 using identical salt', async () => {
    const password = 'SuperSecretVaultMasterPassword!';
    const salt = KeyDerivation.generateSalt(16);

    const key1 = await KeyDerivation.deriveMasterKeyPBKDF2(password, salt, { iterations: 1000 }); // 1000 rounds for fast test
    const key2 = await KeyDerivation.deriveMasterKeyPBKDF2(password, salt, { iterations: 1000 });

    const raw1 = await crypto.subtle.exportKey('raw', key1);
    const raw2 = await crypto.subtle.exportKey('raw', key2);

    expect(new Uint8Array(raw1)).toEqual(new Uint8Array(raw2));
  });

  it('should derive divergent keys when different salts are used', async () => {
    const password = 'IdenticalPassword123';
    const salt1 = KeyDerivation.generateSalt(16);
    const salt2 = KeyDerivation.generateSalt(16);

    const key1 = await KeyDerivation.deriveMasterKeyPBKDF2(password, salt1, { iterations: 1000 });
    const key2 = await KeyDerivation.deriveMasterKeyPBKDF2(password, salt2, { iterations: 1000 });

    const raw1 = await crypto.subtle.exportKey('raw', key1);
    const raw2 = await crypto.subtle.exportKey('raw', key2);

    expect(new Uint8Array(raw1)).not.toEqual(new Uint8Array(raw2));
  });

  it('should manage multi-epoch key rotation and backward compatibility', async () => {
    const key1 = await EnvelopeEncryptionManager.generateDocumentKey();
    const epochManager = new EpochKeyManager('doc-epoch-unit-test', 1, key1);

    expect(epochManager.getCurrentEpoch()).toBe(1);

    // 1. Encrypt chunk under Epoch 1
    const textEpoch1 = new TextEncoder().encode('Dữ liệu kỷ nguyên 1 (Tạo bởi Alice & Bob)');
    const encEpoch1 = await epochManager.encryptWithCurrentEpoch(textEpoch1, ChunkType.CRDT_UPDATE, 'user_alice');

    expect(encEpoch1.epoch).toBe(1);

    // 2. Rotate to Epoch 2 (Revoke Bob)
    const aliceKeys = await IdentityKeys.generateECDHKeyPair();
    const aliceSPKI = await IdentityKeys.exportPublicKeySPKI(aliceKeys.publicKey);

    const rotation = await epochManager.rotateKey({
      documentId: 'doc-epoch-unit-test',
      ownerPrivateKey: aliceKeys.privateKey,
      ownerPublicKeySPKI: aliceSPKI,
      remainingMembers: []
    });

    expect(rotation.newKey).toBeDefined();
    expect(epochManager.getCurrentEpoch()).toBe(2);

    // 3. Encrypt chunk under Epoch 2
    const textEpoch2 = new TextEncoder().encode('Dữ liệu kỷ nguyên 2 (Sau khi thu hồi Bob)');
    const encEpoch2 = await epochManager.encryptWithCurrentEpoch(textEpoch2, ChunkType.CRDT_UPDATE, 'user_alice');

    expect(encEpoch2.epoch).toBe(2);

    // 4. Authorized owner can decrypt both Epoch 1 and Epoch 2
    const decEpoch1 = await epochManager.decryptForEpoch(1, encEpoch1.ciphertext, encEpoch1.iv, ChunkType.CRDT_UPDATE, 'user_alice');
    const decEpoch2 = await epochManager.decryptForEpoch(2, encEpoch2.ciphertext, encEpoch2.iv, ChunkType.CRDT_UPDATE, 'user_alice');

    expect(new TextDecoder().decode(decEpoch1)).toBe('Dữ liệu kỷ nguyên 1 (Tạo bởi Alice & Bob)');
    expect(new TextDecoder().decode(decEpoch2)).toBe('Dữ liệu kỷ nguyên 2 (Sau khi thu hồi Bob)');
  });

  it('should enforce Forward Secrecy: Peer having only Epoch 1 key cannot decrypt Epoch 2', async () => {
    const key1 = await EnvelopeEncryptionManager.generateDocumentKey();
    const epochManagerAlice = new EpochKeyManager('doc-forward-secrecy-test', 1, key1);

    const epochManagerBobRevoked = new EpochKeyManager('doc-forward-secrecy-test', 1, key1);

    // Alice rotates to Epoch 2 without giving key to Bob
    const aliceKeys = await IdentityKeys.generateECDHKeyPair();
    const aliceSPKI = await IdentityKeys.exportPublicKeySPKI(aliceKeys.publicKey);

    await epochManagerAlice.rotateKey({
      documentId: 'doc-forward-secrecy-test',
      ownerPrivateKey: aliceKeys.privateKey,
      ownerPublicKeySPKI: aliceSPKI,
      remainingMembers: []
    });

    const secretEpoch2Text = new TextEncoder().encode('Tài liệu mật Epoch 2 không dành cho Bob');
    const encEpoch2 = await epochManagerAlice.encryptWithCurrentEpoch(secretEpoch2Text, ChunkType.CRDT_UPDATE, 'user_alice');

    // Bob attempts to decrypt Epoch 2 payload without Epoch 2 key -> Must fail!
    await expect(
      epochManagerBobRevoked.decryptForEpoch(2, encEpoch2.ciphertext, encEpoch2.iv, ChunkType.CRDT_UPDATE, 'user_alice')
    ).rejects.toThrow();
  });
});
