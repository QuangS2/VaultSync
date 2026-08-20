/**
 * VaultSync Zero-Knowledge Identity & Authentication Engine
 * Orchestrates Master Password derivation (PBKDF2-HMAC-SHA256),
 * BIP-39 12-word recovery mnemonic verification, ECDH keypair generation,
 * and AES-256-GCM encrypted vault credential management.
 */

import { BinaryUtils } from '../crypto/binary-utils';
import { KeyDerivation } from '../crypto/key-derivation';
import { IdentityKeys } from '../crypto/identity-keys';
import { WebCryptoEngine } from '../crypto/web-crypto-engine';
import { generateMnemonic12, validateMnemonic12 } from './bip39-wordlist';
import {
  UserProfile,
  EncryptedVaultRecord,
  UnlockedVaultSession,
  CreateVaultParams,
  PasswordStrengthResult
} from './types';

export class VaultAuthEngine {
  public static readonly CURRENT_VERSION = 1;
  public static readonly DEFAULT_KDF_ITERATIONS = 100_000; // Fast and secure for responsive client-side unlocking
  private static readonly VERIFIER_MAGIC = 'VAULTSYNC_ZERO_KNOWLEDGE_VERIFIER_V1';
  private static readonly STORAGE_KEY_PREFIX = 'vaultsync_vault_record_';
  private static readonly ACTIVE_VAULT_KEY = 'vaultsync_active_vault_id';

  // In-memory fallback cache for Node/Vitest or non-DOM environments
  private static memoryStore = new Map<string, string>();

  /**
   * Generates a new 12-word BIP-39 recovery mnemonic phrase.
   */
  public static async generateRecoveryPhrase(): Promise<string> {
    return await generateMnemonic12();
  }

  /**
   * Validates a 12-word recovery mnemonic phrase.
   */
  public static async validateRecoveryPhrase(phrase: string): Promise<boolean> {
    return await validateMnemonic12(phrase);
  }

  /**
   * Evaluates the cryptographic strength of a user password.
   */
  public static evaluatePasswordStrength(password: string): PasswordStrengthResult {
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (hasUppercase && hasLowercase) score++;
    if (hasNumber && hasSpecial) score++;

    const labels: PasswordStrengthResult['label'][] = ['Yếu', 'Trung bình', 'Khá', 'Mạnh', 'Rất mạnh'];
    const label = labels[Math.min(score, 4)] ?? 'Yếu';

    return {
      score: Math.min(score, 4),
      label,
      hasMinLength,
      hasUppercase,
      hasLowercase,
      hasNumber,
      hasSpecial
    };
  }

  /**
   * Creates and initializes a new Zero-Knowledge Vault with Master Password and 12-word Recovery Phrase.
   */
  public static async createVault(params: CreateVaultParams): Promise<{
    session: UnlockedVaultSession;
    recoveryPhrase: string;
    record: EncryptedVaultRecord;
  }> {
    const {
      vaultName,
      displayName,
      avatarColor = '#2563eb',
      masterPassword,
      customRecoveryPhrase,
      kdfIterations = VaultAuthEngine.DEFAULT_KDF_ITERATIONS
    } = params;

    if (!masterPassword || masterPassword.length < 6) {
      throw new Error('Mật khẩu chủ phải có ít nhất 6 ký tự.');
    }

    if (!displayName || displayName.trim().length === 0) {
      throw new Error('Vui lòng nhập tên hiển thị của bạn.');
    }

    // 1. Recovery Phrase Generation / Validation
    let recoveryPhrase = customRecoveryPhrase?.trim().toLowerCase();
    if (recoveryPhrase) {
      const isValid = await validateMnemonic12(recoveryPhrase);
      if (!isValid) {
        throw new Error('12 từ khóa khôi phục không hợp lệ theo chuẩn BIP-39.');
      }
    } else {
      recoveryPhrase = await generateMnemonic12();
    }

    // 2. Generate Random Salts
    const masterSalt = KeyDerivation.generateSalt(16);
    const recoverySalt = KeyDerivation.generateSalt(16);
    const masterSaltHex = BinaryUtils.bufferToHex(masterSalt);
    const recoverySaltHex = BinaryUtils.bufferToHex(recoverySalt);

    // 3. Derive Master Key & Recovery Key via PBKDF2
    const masterKey = await KeyDerivation.deriveMasterKeyPBKDF2(masterPassword, masterSalt, {
      iterations: kdfIterations
    });

    const recoveryKey = await KeyDerivation.deriveMasterKeyPBKDF2(recoveryPhrase, recoverySalt, {
      iterations: kdfIterations
    });

    // 4. Generate Vault Root Key (AES-256-GCM symmetric key for note data)
    const vaultRootKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
    );

    // 5. Generate User ECDH P-256 KeyPair
    const userECDHKeyPair = await IdentityKeys.generateECDHKeyPair(true);
    const userPublicKeySPKI = await IdentityKeys.exportPublicKeySPKI(userECDHKeyPair.publicKey);
    const privateKeyJWK = await IdentityKeys.exportJWK(userECDHKeyPair.privateKey);

    // 6. Encrypt Verifiers for Password & Recovery checks
    const verifierBytes = BinaryUtils.stringToBytes(VaultAuthEngine.VERIFIER_MAGIC);
    const encPassVerifier = await WebCryptoEngine.encryptAESGCM(masterKey, verifierBytes);
    const encRecVerifier = await WebCryptoEngine.encryptAESGCM(recoveryKey, verifierBytes);

    // 7. Encrypt Vault Root Key with Master Key AND Recovery Key (Dual Envelope)
    const rawRootKey = await crypto.subtle.exportKey('raw', vaultRootKey);
    const encRootKey = await WebCryptoEngine.encryptAESGCM(masterKey, new Uint8Array(rawRootKey));
    const recRootKey = await WebCryptoEngine.encryptAESGCM(recoveryKey, new Uint8Array(rawRootKey));

    // 8. Encrypt User Private Key JWK with Master Key AND Recovery Key (Dual Envelope)
    const privateKeyJWKBytes = BinaryUtils.stringToBytes(JSON.stringify(privateKeyJWK));
    const encUserPrivKey = await WebCryptoEngine.encryptAESGCM(masterKey, privateKeyJWKBytes);
    const recUserPrivKey = await WebCryptoEngine.encryptAESGCM(recoveryKey, privateKeyJWKBytes);

    // 9. Construct Encrypted Vault Record
    const vaultId = `vault_${BinaryUtils.bufferToHex(KeyDerivation.generateSalt(8))}`;
    const userId = `user_${BinaryUtils.bufferToHex(KeyDerivation.generateSalt(6))}`;
    const now = Date.now();

    const randomTag = `#${Math.floor(1000 + Math.random() * 9000)}`;
    const userProfile: UserProfile = {
      userId,
      displayName: displayName.trim(),
      userTag: randomTag,
      avatarColor,
      createdAt: now
    };

    const record: EncryptedVaultRecord = {
      vaultId,
      vaultName: vaultName.trim() || 'Engineering Vault',
      version: VaultAuthEngine.CURRENT_VERSION,
      createdAt: now,
      lastUnlockedAt: now,
      masterSaltHex,
      kdfIterations,
      recoverySaltHex,
      passwordVerifier: BinaryUtils.bufferToBase64Url(encPassVerifier.combinedBinary),
      recoveryVerifier: BinaryUtils.bufferToBase64Url(encRecVerifier.combinedBinary),
      encryptedVaultRootKey: BinaryUtils.bufferToBase64Url(encRootKey.combinedBinary),
      recoveryVaultRootKey: BinaryUtils.bufferToBase64Url(recRootKey.combinedBinary),
      encryptedUserPrivateKey: BinaryUtils.bufferToBase64Url(encUserPrivKey.combinedBinary),
      recoveryUserPrivateKey: BinaryUtils.bufferToBase64Url(recUserPrivKey.combinedBinary),
      userPublicKeySPKI,
      userProfile
    };

    // 10. Save to Persistent Storage & Ephemeral Session Storage
    await VaultAuthEngine.saveVaultRecord(record);
    await VaultAuthEngine.persistSessionToStorage(masterKey);

    const session: UnlockedVaultSession = {
      vaultId,
      vaultName: record.vaultName,
      userProfile,
      masterKey,
      vaultRootKey,
      userECDHKeyPair,
      userPublicKeySPKI,
      unlockedAt: now
    };

    return {
      session,
      recoveryPhrase,
      record
    };
  }

  /**
   * Unlocks an encrypted vault using the Master Password.
   */
  public static async unlockVaultWithPassword(
    record: EncryptedVaultRecord,
    masterPassword: string
  ): Promise<UnlockedVaultSession> {
    if (!masterPassword) {
      throw new Error('Vui lòng nhập mật khẩu chủ để mở khóa.');
    }

    const masterSalt = BinaryUtils.hexToBytes(record.masterSaltHex);
    const masterKey = await KeyDerivation.deriveMasterKeyPBKDF2(masterPassword, masterSalt, {
      iterations: record.kdfIterations
    });

    // 1. Verify Password against Password Verifier
    const verifierBytes = BinaryUtils.base64UrlToBytes(record.passwordVerifier);
    try {
      const decryptedVerifier = await WebCryptoEngine.decryptCombined(masterKey, verifierBytes);
      const magicStr = BinaryUtils.bytesToString(decryptedVerifier);
      if (magicStr !== VaultAuthEngine.VERIFIER_MAGIC) {
        throw new Error('Mật khẩu chủ không chính xác.');
      }
    } catch {
      throw new Error('Mật khẩu chủ không chính xác.');
    }

    // 2. Decrypt Vault Root Key
    const encRootKeyBytes = BinaryUtils.base64UrlToBytes(record.encryptedVaultRootKey);
    const rawRootKey = await WebCryptoEngine.decryptCombined(masterKey, encRootKeyBytes);
    const vaultRootKey = await crypto.subtle.importKey(
      'raw',
      rawRootKey as BufferSource,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
    );

    // 3. Decrypt User ECDH Private Key
    const encPrivKeyBytes = BinaryUtils.base64UrlToBytes(record.encryptedUserPrivateKey);
    const privKeyJWKBytes = await WebCryptoEngine.decryptCombined(masterKey, encPrivKeyBytes);
    const privKeyJWK = JSON.parse(BinaryUtils.bytesToString(privKeyJWKBytes)) as JsonWebKey;
    const userPrivateKey = await IdentityKeys.importJWK(privKeyJWK, 'ECDH', true);
    const userPublicKey = await IdentityKeys.importPublicKeySPKI(record.userPublicKeySPKI, 'ECDH');

    // Update last unlocked timestamp
    const now = Date.now();
    record.lastUnlockedAt = now;
    await VaultAuthEngine.saveVaultRecord(record);
    await VaultAuthEngine.persistSessionToStorage(masterKey);

    return {
      vaultId: record.vaultId,
      vaultName: record.vaultName,
      userProfile: record.userProfile,
      masterKey,
      vaultRootKey,
      userECDHKeyPair: {
        publicKey: userPublicKey,
        privateKey: userPrivateKey
      },
      userPublicKeySPKI: record.userPublicKeySPKI,
      unlockedAt: now
    };
  }

  private static readonly SESSION_STORAGE_KEY = 'vaultsync_tab_session_key';

  /**
   * Securely saves the ephemeral decrypted master key in sessionStorage (tab scope only).
   */
  public static async persistSessionToStorage(masterKey: CryptoKey): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const rawKey = await crypto.subtle.exportKey('raw', masterKey);
        const base64Key = BinaryUtils.bufferToBase64Url(new Uint8Array(rawKey));
        sessionStorage.setItem(VaultAuthEngine.SESSION_STORAGE_KEY, base64Key);
      }
    } catch {
      // ignore
    }
  }

  /**
   * Clears the ephemeral session key from sessionStorage upon lock or logout.
   */
  public static clearSessionStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem(VaultAuthEngine.SESSION_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }

  /**
   * Restores an active session from sessionStorage on page refresh without requiring password re-entry.
   */
  public static async restoreSessionFromStorage(record: EncryptedVaultRecord): Promise<UnlockedVaultSession | null> {
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) return null;
      const base64Key = sessionStorage.getItem(VaultAuthEngine.SESSION_STORAGE_KEY);
      if (!base64Key) return null;

      const rawBytes = BinaryUtils.base64UrlToBytes(base64Key);
      const masterKey = await crypto.subtle.importKey(
        'raw',
        rawBytes as BufferSource,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
      );

      // Verify masterKey with passwordVerifier
      const verifierBytes = BinaryUtils.base64UrlToBytes(record.passwordVerifier);
      const decryptedVerifier = await WebCryptoEngine.decryptCombined(masterKey, verifierBytes);
      const magicStr = BinaryUtils.bytesToString(decryptedVerifier);
      if (magicStr !== VaultAuthEngine.VERIFIER_MAGIC) {
        VaultAuthEngine.clearSessionStorage();
        return null;
      }

      // Decrypt Root Key
      const encRootKeyBytes = BinaryUtils.base64UrlToBytes(record.encryptedVaultRootKey);
      const rawRootKey = await WebCryptoEngine.decryptCombined(masterKey, encRootKeyBytes);
      const vaultRootKey = await crypto.subtle.importKey(
        'raw',
        rawRootKey as BufferSource,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
      );

      // Decrypt ECDH Private Key
      const encPrivKeyBytes = BinaryUtils.base64UrlToBytes(record.encryptedUserPrivateKey);
      const privKeyJWKBytes = await WebCryptoEngine.decryptCombined(masterKey, encPrivKeyBytes);
      const privKeyJWK = JSON.parse(BinaryUtils.bytesToString(privKeyJWKBytes)) as JsonWebKey;
      const userPrivateKey = await IdentityKeys.importJWK(privKeyJWK, 'ECDH', true);
      const userPublicKey = await IdentityKeys.importPublicKeySPKI(record.userPublicKeySPKI, 'ECDH');

      return {
        vaultId: record.vaultId,
        vaultName: record.vaultName,
        userProfile: record.userProfile,
        masterKey,
        vaultRootKey,
        userECDHKeyPair: {
          publicKey: userPublicKey,
          privateKey: userPrivateKey
        },
        userPublicKeySPKI: record.userPublicKeySPKI,
        unlockedAt: Date.now()
      };
    } catch {
      VaultAuthEngine.clearSessionStorage();
      return null;
    }
  }

  /**
   * Recovers and unlocks a vault using the 12-word Recovery Phrase with Dual-Envelope unwrap.
   * If newMasterPassword is provided, re-encrypts the true Root Key and Private Key under the new password.
   */
  public static async unlockVaultWithRecoveryPhrase(
    record: EncryptedVaultRecord,
    recoveryPhrase: string,
    newMasterPassword?: string
  ): Promise<{ session: UnlockedVaultSession; updatedRecord?: EncryptedVaultRecord }> {
    const cleanPhrase = recoveryPhrase.trim().toLowerCase();
    const isValid = await validateMnemonic12(cleanPhrase);
    if (!isValid) {
      throw new Error('12 từ khóa khôi phục không đúng định dạng chuẩn.');
    }

    const recoverySalt = BinaryUtils.hexToBytes(record.recoverySaltHex);
    const recoveryKey = await KeyDerivation.deriveMasterKeyPBKDF2(cleanPhrase, recoverySalt, {
      iterations: record.kdfIterations
    });

    // 1. Verify Recovery Key against Recovery Verifier
    const verifierBytes = BinaryUtils.base64UrlToBytes(record.recoveryVerifier);
    try {
      const decryptedVerifier = await WebCryptoEngine.decryptCombined(recoveryKey, verifierBytes);
      const magicStr = BinaryUtils.bytesToString(decryptedVerifier);
      if (magicStr !== VaultAuthEngine.VERIFIER_MAGIC) {
        throw new Error('12 từ khóa khôi phục không khớp với kho lưu trữ này.');
      }
    } catch {
      throw new Error('12 từ khóa khôi phục không khớp với kho lưu trữ này.');
    }

    // 2. Unwrap the real Vault Root Key and User Private Key from the Recovery Envelope
    let vaultRootKey: CryptoKey;
    let userPrivateKey: CryptoKey;

    if (record.recoveryVaultRootKey && record.recoveryUserPrivateKey) {
      const recRootKeyBytes = BinaryUtils.base64UrlToBytes(record.recoveryVaultRootKey);
      const rawRootKey = await WebCryptoEngine.decryptCombined(recoveryKey, recRootKeyBytes);
      vaultRootKey = await crypto.subtle.importKey(
        'raw',
        rawRootKey as BufferSource,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
      );

      const recPrivKeyBytes = BinaryUtils.base64UrlToBytes(record.recoveryUserPrivateKey);
      const privKeyJWKBytes = await WebCryptoEngine.decryptCombined(recoveryKey, recPrivKeyBytes);
      const privKeyJWK = JSON.parse(BinaryUtils.bytesToString(privKeyJWKBytes)) as JsonWebKey;
      userPrivateKey = await IdentityKeys.importJWK(privKeyJWK, 'ECDH', true);
    } else {
      // Legacy compatibility fallback
      vaultRootKey = await KeyDerivation.deriveMasterKeyPBKDF2(cleanPhrase, recoverySalt);
      userPrivateKey = (await IdentityKeys.generateECDHKeyPair(true)).privateKey;
    }

    const userPublicKey = await IdentityKeys.importPublicKeySPKI(record.userPublicKeySPKI, 'ECDH');
    const now = Date.now();

    // 3. If newMasterPassword is provided, reset master password without losing existing keys
    if (newMasterPassword && newMasterPassword.length >= 6) {
      const newMasterSalt = KeyDerivation.generateSalt(16);
      const newMasterSaltHex = BinaryUtils.bufferToHex(newMasterSalt);

      const newMasterKey = await KeyDerivation.deriveMasterKeyPBKDF2(newMasterPassword, newMasterSalt, {
        iterations: record.kdfIterations
      });

      // Encrypt new password verifier
      const verifierMagicBytes = BinaryUtils.stringToBytes(VaultAuthEngine.VERIFIER_MAGIC);
      const encPassVerifier = await WebCryptoEngine.encryptAESGCM(newMasterKey, verifierMagicBytes);

      // Re-encrypt the existing Vault Root Key with New Master Key
      const rawRootKey = await crypto.subtle.exportKey('raw', vaultRootKey);
      const encRootKey = await WebCryptoEngine.encryptAESGCM(newMasterKey, new Uint8Array(rawRootKey));

      // Re-encrypt the existing User Private Key JWK with New Master Key
      const privateKeyJWK = await IdentityKeys.exportJWK(userPrivateKey);
      const privateKeyJWKBytes = BinaryUtils.stringToBytes(JSON.stringify(privateKeyJWK));
      const encUserPrivKey = await WebCryptoEngine.encryptAESGCM(newMasterKey, privateKeyJWKBytes);

      const updatedRecord: EncryptedVaultRecord = {
        ...record,
        masterSaltHex: newMasterSaltHex,
        passwordVerifier: BinaryUtils.bufferToBase64Url(encPassVerifier.combinedBinary),
        encryptedVaultRootKey: BinaryUtils.bufferToBase64Url(encRootKey.combinedBinary),
        encryptedUserPrivateKey: BinaryUtils.bufferToBase64Url(encUserPrivKey.combinedBinary),
        lastUnlockedAt: now
      };

      await VaultAuthEngine.saveVaultRecord(updatedRecord);
      await VaultAuthEngine.persistSessionToStorage(newMasterKey);

      return {
        session: {
          vaultId: record.vaultId,
          vaultName: record.vaultName,
          userProfile: record.userProfile,
          masterKey: newMasterKey,
          vaultRootKey,
          userECDHKeyPair: {
            publicKey: userPublicKey,
            privateKey: userPrivateKey
          },
          userPublicKeySPKI: record.userPublicKeySPKI,
          unlockedAt: now
        },
        updatedRecord
      };
    }

    // Direct recovery session
    await VaultAuthEngine.persistSessionToStorage(recoveryKey);
    return {
      session: {
        vaultId: record.vaultId,
        vaultName: record.vaultName,
        userProfile: record.userProfile,
        masterKey: recoveryKey,
        vaultRootKey,
        userECDHKeyPair: {
          publicKey: userPublicKey,
          privateKey: userPrivateKey
        },
        userPublicKeySPKI: record.userPublicKeySPKI,
        unlockedAt: now
      }
    };
  }

  /**
   * Changes the Master Password for an active unlocked vault session.
   */
  public static async changeMasterPassword(
    session: UnlockedVaultSession,
    currentRecord: EncryptedVaultRecord,
    newPassword: string
  ): Promise<EncryptedVaultRecord> {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');
    }

    const newMasterSalt = KeyDerivation.generateSalt(16);
    const newMasterSaltHex = BinaryUtils.bufferToHex(newMasterSalt);

    const newMasterKey = await KeyDerivation.deriveMasterKeyPBKDF2(newPassword, newMasterSalt, {
      iterations: currentRecord.kdfIterations
    });

    // 1. New Password Verifier
    const verifierBytes = BinaryUtils.stringToBytes(VaultAuthEngine.VERIFIER_MAGIC);
    const encPassVerifier = await WebCryptoEngine.encryptAESGCM(newMasterKey, verifierBytes);

    // 2. Re-encrypt Vault Root Key with New Master Key
    const rawRootKey = await crypto.subtle.exportKey('raw', session.vaultRootKey);
    const encRootKey = await WebCryptoEngine.encryptAESGCM(newMasterKey, new Uint8Array(rawRootKey));

    // 3. Re-encrypt User Private Key JWK with New Master Key
    const privateKeyJWK = await IdentityKeys.exportJWK(session.userECDHKeyPair.privateKey);
    const privateKeyJWKBytes = BinaryUtils.stringToBytes(JSON.stringify(privateKeyJWK));
    const encUserPrivKey = await WebCryptoEngine.encryptAESGCM(newMasterKey, privateKeyJWKBytes);

    const updatedRecord: EncryptedVaultRecord = {
      ...currentRecord,
      masterSaltHex: newMasterSaltHex,
      passwordVerifier: BinaryUtils.bufferToBase64Url(encPassVerifier.combinedBinary),
      encryptedVaultRootKey: BinaryUtils.bufferToBase64Url(encRootKey.combinedBinary),
      encryptedUserPrivateKey: BinaryUtils.bufferToBase64Url(encUserPrivKey.combinedBinary),
      lastUnlockedAt: Date.now()
    };

    // Update active session masterKey
    session.masterKey = newMasterKey;

    await VaultAuthEngine.saveVaultRecord(updatedRecord);
    return updatedRecord;
  }

  /**
   * Persists an encrypted vault record to local persistent storage (localStorage + memory fallback).
   */
  public static async saveVaultRecord(record: EncryptedVaultRecord): Promise<void> {
    const jsonStr = JSON.stringify(record);
    const key = `${VaultAuthEngine.STORAGE_KEY_PREFIX}${record.vaultId}`;

    VaultAuthEngine.memoryStore.set(key, jsonStr);
    VaultAuthEngine.memoryStore.set(VaultAuthEngine.ACTIVE_VAULT_KEY, record.vaultId);

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, jsonStr);
        localStorage.setItem(VaultAuthEngine.ACTIVE_VAULT_KEY, record.vaultId);
      }
    } catch {
      // Storage unavailable / private mode quota exceeded
    }
  }

  /**
   * Retrieves the active or specified saved vault record from persistent storage.
   */
  public static async getSavedVaultRecord(vaultId?: string): Promise<EncryptedVaultRecord | null> {
    let targetId = vaultId;

    if (!targetId) {
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          targetId = localStorage.getItem(VaultAuthEngine.ACTIVE_VAULT_KEY) ?? undefined;
        } catch {
          // ignore
        }
      }
      if (!targetId) {
        targetId = VaultAuthEngine.memoryStore.get(VaultAuthEngine.ACTIVE_VAULT_KEY);
      }
    }

    if (!targetId) {
      // Find first available record in memory or localStorage
      for (const [k, v] of VaultAuthEngine.memoryStore.entries()) {
        if (k.startsWith(VaultAuthEngine.STORAGE_KEY_PREFIX)) {
          try {
            return JSON.parse(v) as EncryptedVaultRecord;
          } catch {
            // ignore
          }
        }
      }

      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(VaultAuthEngine.STORAGE_KEY_PREFIX)) {
              const item = localStorage.getItem(k);
              if (item) {
                return JSON.parse(item) as EncryptedVaultRecord;
              }
            }
          }
        } catch {
          // ignore
        }
      }

      return null;
    }

    const key = `${VaultAuthEngine.STORAGE_KEY_PREFIX}${targetId}`;
    let raw = VaultAuthEngine.memoryStore.get(key);

    if (!raw && typeof window !== 'undefined' && window.localStorage) {
      try {
        raw = localStorage.getItem(key) ?? undefined;
      } catch {
        // ignore
      }
    }

    if (!raw) return null;

    try {
      return JSON.parse(raw) as EncryptedVaultRecord;
    } catch {
      return null;
    }
  }

  /**
   * Lists all saved encrypted vaults on this device.
   */
  public static async listSavedVaults(): Promise<EncryptedVaultRecord[]> {
    const listMap = new Map<string, EncryptedVaultRecord>();

    // 1. From memory
    for (const [k, v] of VaultAuthEngine.memoryStore.entries()) {
      if (k.startsWith(VaultAuthEngine.STORAGE_KEY_PREFIX)) {
        try {
          const rec = JSON.parse(v) as EncryptedVaultRecord;
          listMap.set(rec.vaultId, rec);
        } catch {
          // ignore
        }
      }
    }

    // 2. From localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(VaultAuthEngine.STORAGE_KEY_PREFIX)) {
            const raw = localStorage.getItem(k);
            if (raw) {
              try {
                const rec = JSON.parse(raw) as EncryptedVaultRecord;
                listMap.set(rec.vaultId, rec);
              } catch {
                // ignore
              }
            }
          }
        }
      } catch {
        // ignore
      }
    }

    return Array.from(listMap.values()).sort((a, b) => b.lastUnlockedAt - a.lastUnlockedAt);
  }

  /**
   * Deletes a saved vault record from local storage.
   */
  public static async deleteVaultRecord(vaultId: string): Promise<void> {
    const key = `${VaultAuthEngine.STORAGE_KEY_PREFIX}${vaultId}`;
    VaultAuthEngine.memoryStore.delete(key);
    if (VaultAuthEngine.memoryStore.get(VaultAuthEngine.ACTIVE_VAULT_KEY) === vaultId) {
      VaultAuthEngine.memoryStore.delete(VaultAuthEngine.ACTIVE_VAULT_KEY);
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem(key);
        const active = localStorage.getItem(VaultAuthEngine.ACTIVE_VAULT_KEY);
        if (active === vaultId) {
          localStorage.removeItem(VaultAuthEngine.ACTIVE_VAULT_KEY);
        }
      } catch {
        // ignore
      }
    }
  }

  /**
   * Clears internal memory store (useful for clean unit test isolation).
   */
  public static clearMemoryStore(): void {
    VaultAuthEngine.memoryStore.clear();
  }
}
