import { describe, it, expect, beforeEach } from 'vitest';
import { VaultAuthEngine } from '../vault-auth-engine';
import { validateMnemonic12 } from '../bip39-wordlist';

describe('VaultAuthEngine — Zero-Knowledge Identity & Authentication (11/10 Rigor)', () => {
  beforeEach(() => {
    VaultAuthEngine.clearMemoryStore();
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.clear();
    }
  });

  describe('BIP-39 12-Word Mnemonic Generation & Validation', () => {
    it('generates a valid 12-word recovery phrase with correct 4-bit checksum', async () => {
      const phrase = await VaultAuthEngine.generateRecoveryPhrase();
      const words = phrase.split(' ');
      expect(words).toHaveLength(12);

      const isValid = await validateMnemonic12(phrase);
      expect(isValid).toBe(true);
    });

    it('rejects invalid or corrupted mnemonic phrases', async () => {
      expect(await validateMnemonic12('not a valid twelve word seed phrase at all test')).toBe(false);
      expect(await validateMnemonic12('abandon abandon abandon')).toBe(false);
    });
  });

  describe('Password Strength Evaluation', () => {
    it('correctly evaluates password strength tiers', () => {
      const weak = VaultAuthEngine.evaluatePasswordStrength('12345');
      expect(weak.score).toBeLessThanOrEqual(1);
      expect(weak.hasMinLength).toBe(false);

      const strong = VaultAuthEngine.evaluatePasswordStrength('Secr3t!P@ssw0rd2026');
      expect(strong.score).toBeGreaterThanOrEqual(3);
      expect(strong.hasUppercase).toBe(true);
      expect(strong.hasLowercase).toBe(true);
      expect(strong.hasNumber).toBe(true);
      expect(strong.hasSpecial).toBe(true);
      expect(strong.hasMinLength).toBe(true);
    });
  });

  describe('Vault Creation & Zero-Knowledge Verification', () => {
    it('creates a new vault, derives master keys, and securely stores encrypted record', async () => {
      const created = await VaultAuthEngine.createVault({
        vaultName: 'Personal Research Vault',
        displayName: 'Quang Dev',
        avatarColor: '#10b981',
        masterPassword: 'SuperSecretPassphrase123!',
        kdfIterations: 1000 // Fast iterations for unit tests
      });

      expect(created.session.vaultId).toMatch(/^vault_/);
      expect(created.session.vaultName).toBe('Personal Research Vault');
      expect(created.session.userProfile.displayName).toBe('Quang Dev');
      expect(created.session.userProfile.avatarColor).toBe('#10b981');
      expect(created.session.masterKey).toBeDefined();
      expect(created.session.vaultRootKey).toBeDefined();
      expect(created.session.userECDHKeyPair.publicKey).toBeDefined();
      expect(created.session.userPublicKeySPKI).toBeTruthy();

      expect(created.recoveryPhrase.split(' ')).toHaveLength(12);

      // Verify stored record
      const savedRecord = await VaultAuthEngine.getSavedVaultRecord(created.session.vaultId);
      expect(savedRecord).not.toBeNull();
      expect(savedRecord?.vaultName).toBe('Personal Research Vault');
      expect(savedRecord?.passwordVerifier).toBeTruthy();
      expect(savedRecord?.encryptedVaultRootKey).toBeTruthy();
      expect(savedRecord?.encryptedUserPrivateKey).toBeTruthy();
    });

    it('rejects vault creation when password is too short', async () => {
      await expect(
        VaultAuthEngine.createVault({
          vaultName: 'Test',
          displayName: 'Tester',
          masterPassword: '123'
        })
      ).rejects.toThrow('Mật khẩu chủ phải có ít nhất 6 ký tự.');
    });
  });

  describe('Vault Unlocking with Master Password', () => {
    it('successfully unlocks with correct Master Password and decodes Root Key + ECDH Keys', async () => {
      const created = await VaultAuthEngine.createVault({
        vaultName: 'Engineering Vault',
        displayName: 'Alice Engineer',
        masterPassword: 'MySecurePassword2026#',
        kdfIterations: 1000
      });

      // Unlock
      const unlockedSession = await VaultAuthEngine.unlockVaultWithPassword(
        created.record,
        'MySecurePassword2026#'
      );

      expect(unlockedSession.vaultId).toBe(created.session.vaultId);
      expect(unlockedSession.userProfile.displayName).toBe('Alice Engineer');
      expect(unlockedSession.vaultRootKey).toBeDefined();
      expect(unlockedSession.userECDHKeyPair.privateKey).toBeDefined();
      expect(unlockedSession.userPublicKeySPKI).toBe(created.record.userPublicKeySPKI);
    });

    it('fails to unlock when incorrect password is provided (Zero-Knowledge verification)', async () => {
      const created = await VaultAuthEngine.createVault({
        vaultName: 'Secret Vault',
        displayName: 'Bob',
        masterPassword: 'CorrectPassword!123',
        kdfIterations: 1000
      });

      await expect(
        VaultAuthEngine.unlockVaultWithPassword(created.record, 'WrongPassword!456')
      ).rejects.toThrow('Mật khẩu chủ không chính xác.');
    });
  });

  describe('Vault Recovery via 12-Word Mnemonic Seed Phrase', () => {
    it('allows recovering and resetting master password using 12-word seed phrase', async () => {
      const created = await VaultAuthEngine.createVault({
        vaultName: 'Backup Recovery Vault',
        displayName: 'Charlie',
        masterPassword: 'OldForgottenPassword!1',
        kdfIterations: 1000
      });

      // Recover and set new password
      const recoveryResult = await VaultAuthEngine.unlockVaultWithRecoveryPhrase(
        created.record,
        created.recoveryPhrase,
        'BrandNewStrongPassword!2026'
      );

      expect(recoveryResult.session.vaultId).toBeDefined();
      expect(recoveryResult.updatedRecord).toBeDefined();

      // Now verify that unlocking with the NEW password succeeds
      const newSession = await VaultAuthEngine.unlockVaultWithPassword(
        recoveryResult.updatedRecord!,
        'BrandNewStrongPassword!2026'
      );
      expect(newSession.userProfile.displayName).toBe('Charlie');

      // And verify OLD password fails
      await expect(
        VaultAuthEngine.unlockVaultWithPassword(recoveryResult.updatedRecord!, 'OldForgottenPassword!1')
      ).rejects.toThrow('Mật khẩu chủ không chính xác.');
    });

    it('rejects recovery attempt with invalid or mismatched mnemonic phrase', async () => {
      const validVault = await VaultAuthEngine.createVault({
        vaultName: 'Secure Vault',
        displayName: 'David',
        masterPassword: 'ValidPassword123!',
        kdfIterations: 1000
      });

      // Generate a DIFFERENT valid mnemonic that doesn't match this vault
      const otherMnemonic = await VaultAuthEngine.generateRecoveryPhrase();

      await expect(
        VaultAuthEngine.unlockVaultWithRecoveryPhrase(
          validVault.record,
          otherMnemonic,
          'NewPass123!'
        )
      ).rejects.toThrow('12 từ khóa khôi phục không khớp với kho lưu trữ này.');
    });
  });

  describe('Change Master Password in Active Session', () => {
    it('seamlessly changes Master Password and updates encrypted verifiers', async () => {
      const created = await VaultAuthEngine.createVault({
        vaultName: 'Production Vault',
        displayName: 'Admin User',
        masterPassword: 'InitialPassword123!',
        kdfIterations: 1000
      });

      // Change password
      const updatedRecord = await VaultAuthEngine.changeMasterPassword(
        created.session,
        created.record,
        'UpdatedPassword999!'
      );

      expect(updatedRecord.masterSaltHex).not.toBe(created.record.masterSaltHex);

      // New password unlocks
      const sessionNew = await VaultAuthEngine.unlockVaultWithPassword(
        updatedRecord,
        'UpdatedPassword999!'
      );
      expect(sessionNew.vaultId).toBe(created.session.vaultId);

      // Old password fails
      await expect(
        VaultAuthEngine.unlockVaultWithPassword(updatedRecord, 'InitialPassword123!')
      ).rejects.toThrow('Mật khẩu chủ không chính xác.');
    });
  });

  describe('Vault Storage Management (List & Delete)', () => {
    it('lists all saved vaults and supports deleting a vault', async () => {
      const v1 = await VaultAuthEngine.createVault({
        vaultName: 'Vault One',
        displayName: 'User 1',
        masterPassword: 'Password123!',
        kdfIterations: 1000
      });

      const v2 = await VaultAuthEngine.createVault({
        vaultName: 'Vault Two',
        displayName: 'User 2',
        masterPassword: 'Password123!',
        kdfIterations: 1000
      });

      const list = await VaultAuthEngine.listSavedVaults();
      expect(list.length).toBeGreaterThanOrEqual(2);
      expect(list.map(v => v.vaultId)).toContain(v1.session.vaultId);
      expect(list.map(v => v.vaultId)).toContain(v2.session.vaultId);

      // Delete v1
      await VaultAuthEngine.deleteVaultRecord(v1.session.vaultId);
      const listAfter = await VaultAuthEngine.listSavedVaults();
      expect(listAfter.map(v => v.vaultId)).not.toContain(v1.session.vaultId);
      expect(listAfter.map(v => v.vaultId)).toContain(v2.session.vaultId);
    });
  });
});
