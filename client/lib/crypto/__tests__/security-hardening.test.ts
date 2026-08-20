import { describe, it, expect } from 'vitest';
import { VaultAuthEngine } from '../../auth/vault-auth-engine';
import { ExportPipeline } from '../../export/export-pipeline';
import { VaultArchiveManager } from '../../export/vault-archive-manager';
import { BinaryCodec, MessageType } from '../../../../shared/protocol/binary-codec';
import { WebCryptoEngine } from '../web-crypto-engine';

describe('VaultSync Defensive Security Hardening Suite (4 Vulnerabilities Tested)', () => {
  describe('VULN-1: Dual-Envelope Key Recovery & Anti-Data Loss Verification', () => {
    it('successfully recovers the EXACT same Root Key and Private Key via 12-word phrase after password loss', async () => {
      const initial = await VaultAuthEngine.createVault({
        vaultName: 'Top Secret Engineering Vault',
        displayName: 'Alice Security Lead',
        masterPassword: 'OriginalMasterPassword123!',
        kdfIterations: 5000 // Fast for test
      });

      // Encrypt some sample document data using the original vaultRootKey
      const testSecretDoc = new TextEncoder().encode('Confidential VaultSync Blueprint Data');
      const originalEncrypted = await WebCryptoEngine.encryptAESGCM(initial.session.vaultRootKey, testSecretDoc);

      // Verify that recovery record contains the dual-envelope fields
      expect(initial.record.recoveryVaultRootKey).toBeDefined();
      expect(initial.record.recoveryUserPrivateKey).toBeDefined();

      // Simulate recovery using only the 12-word recovery phrase and resetting password
      const recovery = await VaultAuthEngine.unlockVaultWithRecoveryPhrase(
        initial.record,
        initial.recoveryPhrase,
        'BrandNewResetPassword456!'
      );

      expect(recovery.updatedRecord).toBeDefined();

      // Unlock with the brand new reset password
      const unlockedWithNewPass = await VaultAuthEngine.unlockVaultWithPassword(
        recovery.updatedRecord!,
        'BrandNewResetPassword456!'
      );

      // Decrypt the old document using the recovered vaultRootKey
      const decryptedDocBytes = await WebCryptoEngine.decryptCombined(
        unlockedWithNewPass.vaultRootKey,
        originalEncrypted.combinedBinary
      );
      const decryptedText = new TextDecoder().decode(decryptedDocBytes);

      expect(decryptedText).toBe('Confidential VaultSync Blueprint Data');
      expect(unlockedWithNewPass.userPublicKeySPKI).toBe(initial.session.userPublicKeySPKI);
    });
  });

  describe('VULN-2: Anti-XSS & Standalone HTML Metadata Sanitization', () => {
    it('escapes script tags and attributes in metadata and strips script tags in body', () => {
      const maliciousMeta = {
        title: '<script>alert("pwned")</script>Document',
        documentId: 'doc-123" onmouseover="alert(1)',
        author: 'Attacker <img src=x onerror=fetch("http://evil.com")>',
        folderName: 'Vault & <script>',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const maliciousBody = '<h1>Title</h1><script>stealKeys();</script><p onmouseover="badCode()">Safe Paragraph</p><iframe src="evil.html"></iframe>';

      const outputHtml = ExportPipeline.exportToStandaloneHTML(maliciousBody, maliciousMeta);

      // Metadata must be escaped
      expect(outputHtml).not.toContain('<script>alert("pwned")</script>');
      expect(outputHtml).toContain('&lt;script&gt;alert(&quot;pwned&quot;)&lt;/script&gt;Document');
      expect(outputHtml).toContain('&lt;img src=x onerror=fetch(&quot;http://evil.com&quot;)&gt;');
      
      // Standalone HTML must contain Content-Security-Policy
      expect(outputHtml).toContain('Content-Security-Policy');
      expect(outputHtml).toContain("default-src 'none'");

      // HTML body must not contain unescaped active script tags or inline handlers
      expect(outputHtml).not.toContain('<script>stealKeys();</script>');
      expect(outputHtml).not.toContain('<iframe src="evil.html"></iframe>');
      expect(outputHtml).not.toContain('<p onmouseover=');
    });
  });

  describe('VULN-3: BinaryCodec Frame Validation & Room ID Hardening', () => {
    it('rejects oversized room IDs during encoding to prevent memory exhaustion', () => {
      const oversizedRoom = 'a'.repeat(256);
      expect(() => {
        BinaryCodec.encode(MessageType.ROOM_JOIN, oversizedRoom);
      }).toThrow('Room ID is too long');
    });

    it('rejects room IDs with injection or illegal characters', () => {
      const illegalRoom = 'room\r\nSET bad 1\x00';
      expect(() => {
        BinaryCodec.encode(MessageType.ROOM_JOIN, illegalRoom);
      }).toThrow('Invalid Room ID characters');
    });

    it('encodes and decodes valid room IDs successfully', () => {
      const validRoom = 'room-doc_123.engineering:main';
      const encoded = BinaryCodec.encode(MessageType.ROOM_JOIN, validRoom, new Uint8Array([1, 2, 3]));
      const decoded = BinaryCodec.decode(encoded);

      expect(decoded.roomId).toBe(validRoom);
      expect(decoded.messageType).toBe(MessageType.ROOM_JOIN);
      expect(decoded.payload.length).toBe(3);
    });
  });

  describe('VULN-4: Constant-Time WebCrypto HMAC Verification', () => {
    it('verifies valid .vault backup archives and rejects tampered archives', async () => {
      const sampleTree: any[] = [{ id: 'f1', name: 'Notes', type: 'folder', parentId: null }];
      const sampleDocs = [{ documentId: 'doc-1', name: 'Note 1', rawText: 'Hello World', updatedAt: Date.now() }];

      const archiveJson = await VaultArchiveManager.createVaultArchive('Workspace', sampleTree, sampleDocs);

      // Verify valid archive
      const restored = await VaultArchiveManager.verifyAndRestoreVaultArchive(archiveJson);
      expect(restored.workspaceName).toBe('Workspace');
      expect(restored.documents[0]?.name).toBe('Note 1');

      // Tamper with payload
      const tamperedJson = archiveJson.replace('Hello World', 'Hacked Content');
      await expect(
        VaultArchiveManager.verifyAndRestoreVaultArchive(tamperedJson)
      ).rejects.toThrow('CHỮ KÝ XÁC THỰC HMAC-SHA256 KHÔNG HỢP LỆ');
    });
  });
});
