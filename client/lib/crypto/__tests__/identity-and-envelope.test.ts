import { describe, it, expect } from 'vitest';
import { IdentityKeys } from '../identity-keys';
import { EnvelopeEncryptionManager } from '../envelope-encryption';
import { WebCryptoEngine } from '../web-crypto-engine';

describe('IdentityKeys & EnvelopeEncryptionManager — ECDH + HKDF Unit Tests', () => {
  it('should generate valid ECDH P-256 keypairs', async () => {
    const keyPair = await IdentityKeys.generateECDHKeyPair();
    expect(keyPair.publicKey).toBeDefined();
    expect(keyPair.privateKey).toBeDefined();
    expect(keyPair.publicKey.algorithm.name).toBe('ECDH');
    expect((keyPair.publicKey.algorithm as EcKeyAlgorithm).namedCurve).toBe('P-256');
  });

  it('should export and re-import SPKI Base64 public keys cleanly', async () => {
    const keyPair = await IdentityKeys.generateECDHKeyPair();
    const spkiBase64 = await IdentityKeys.exportPublicKeySPKI(keyPair.publicKey);

    expect(typeof spkiBase64).toBe('string');
    expect(spkiBase64.length).toBeGreaterThan(50);

    const reimportedPublicKey = await IdentityKeys.importPublicKeySPKI(spkiBase64);
    expect(reimportedPublicKey).toBeDefined();
    expect(reimportedPublicKey.algorithm.name).toBe('ECDH');
    expect((reimportedPublicKey.algorithm as EcKeyAlgorithm).namedCurve).toBe('P-256');
  });

  it('should wrap and unwrap document key using WrappedKeyEnvelope', async () => {
    const senderKeys = await IdentityKeys.generateECDHKeyPair();
    const recipientKeys = await IdentityKeys.generateECDHKeyPair();
    const documentKey = await EnvelopeEncryptionManager.generateDocumentKey();

    const recipientSPKI = await IdentityKeys.exportPublicKeySPKI(recipientKeys.publicKey);

    // Sender wraps documentKey for Recipient
    const envelope = await EnvelopeEncryptionManager.wrapDocumentKey({
      senderPrivateKey: senderKeys.privateKey,
      senderPublicKey: senderKeys.publicKey,
      recipientPublicKey: recipientSPKI,
      recipientUserId: 'user_bob',
      documentId: 'doc-shared-vault',
      documentKey
    });

    expect(envelope.envelopeId).toBeDefined();
    expect(envelope.epoch).toBe(1);
    expect(envelope.recipientUserId).toBe('user_bob');
    expect(envelope.ciphertext).toBeDefined();
    expect(envelope.iv).toBeDefined();

    // Recipient unwraps documentKey using their Private Key and Sender's Ephemeral Public Key
    const unwrappedDocKey = await EnvelopeEncryptionManager.unwrapDocumentKey({
      recipientPrivateKey: recipientKeys.privateKey,
      envelope
    });

    expect(unwrappedDocKey).toBeDefined();

    // Verify unwrapped key can decrypt data originally encrypted with documentKey
    const samplePayload = new TextEncoder().encode('Tài liệu mã hóa bọc trong phong bì mật mã.');
    const encResult = await WebCryptoEngine.encryptAESGCM(documentKey, samplePayload);
    const decryptedWithUnwrapped = await WebCryptoEngine.decryptAESGCM(unwrappedDocKey, encResult.ciphertext, encResult.iv);

    expect(new TextDecoder().decode(decryptedWithUnwrapped)).toBe('Tài liệu mã hóa bọc trong phong bì mật mã.');
  });
});
