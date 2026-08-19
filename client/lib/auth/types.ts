/**
 * VaultSync Zero-Knowledge Authentication & Identity Management Types
 */

import { ECDHKeyPair } from '../crypto/identity-keys';

export interface UserProfile {
  userId: string;
  displayName: string;
  userTag?: string | undefined;
  avatarColor: string;
  createdAt: number;
}

export interface EncryptedVaultRecord {
  vaultId: string;
  vaultName: string;
  version: number;
  createdAt: number;
  lastUnlockedAt: number;
  
  // PBKDF2 Parameters
  masterSaltHex: string;
  kdfIterations: number;
  
  // Recovery Mnemonic Parameters
  recoverySaltHex: string;
  
  // Integrity & Password Verification Payload (AES-256-GCM encrypted check string)
  passwordVerifier: string; // Base64 combined ciphertext of VERIFIER_MAGIC
  recoveryVerifier: string; // Base64 combined ciphertext of VERIFIER_MAGIC
  
  // Encrypted Secrets
  encryptedVaultRootKey: string; // Base64 combined ciphertext (encrypted by Master Key)
  encryptedUserPrivateKey: string; // Base64 combined ciphertext of Private Key JWK
  userPublicKeySPKI: string; // Base64 SPKI string of ECDH Public Key
  
  // Plaintext Metadata
  userProfile: UserProfile;
}

export interface UnlockedVaultSession {
  vaultId: string;
  vaultName: string;
  userProfile: UserProfile;
  masterKey: CryptoKey;
  vaultRootKey: CryptoKey;
  userECDHKeyPair: ECDHKeyPair;
  userPublicKeySPKI: string;
  unlockedAt: number;
}

export interface CreateVaultParams {
  vaultName: string;
  displayName: string;
  avatarColor?: string | undefined;
  masterPassword: string;
  customRecoveryPhrase?: string | undefined;
  kdfIterations?: number | undefined;
}

export interface PasswordStrengthResult {
  score: number; // 0 to 4
  label: 'Yếu' | 'Trung bình' | 'Khá' | 'Mạnh' | 'Rất mạnh';
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}
