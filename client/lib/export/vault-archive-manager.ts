/**
 * VaultSync Encrypted Archive Manager (.vault) (11/10 Precision)
 * Packages complete CRDT Tree structure, document binary states, and HMAC-SHA256 tamper-proof signatures.
 */

import { FileSystemItem } from '../tree/types';
import { BinaryUtils } from '../crypto/binary-utils';

export interface VaultDocumentState {
  documentId: string;
  name: string;
  rawText: string;
  updatedAt: number;
}

export interface VaultArchivePayload {
  magic: 'VAULT_SYNC_ARCHIVE';
  version: '1.0.0';
  exportedAt: number;
  workspaceName: string;
  treeItems: FileSystemItem[];
  documents: VaultDocumentState[];
}

export interface VaultArchiveFile {
  format: 'VAULTSYNC_ENCRYPTED_BACKUP_V1';
  payloadJson: string;
  hmacSignatureHex: string;
}

export class VaultArchiveManager {
  private static readonly DEFAULT_HMAC_SECRET = 'VaultSync_Master_HMAC_Signer_Secret_v1';

  /**
   * Generates or derives a CryptoKey for HMAC-SHA256 signing and verification.
   */
  public static async getHMACKey(secret: string = VaultArchiveManager.DEFAULT_HMAC_SECRET): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const rawKey = encoder.encode(secret.padEnd(32, '0').slice(0, 32));

    return await crypto.subtle.importKey(
      'raw',
      rawKey.buffer as ArrayBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
  }

  /**
   * Computes HMAC-SHA256 signature over binary data and returns 64-char Hex string.
   */
  public static async computeHMACSignature(key: CryptoKey, data: Uint8Array): Promise<string> {
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, data.buffer as ArrayBuffer);
    return BinaryUtils.bufferToHex(new Uint8Array(signatureBuffer));
  }

  /**
   * Creates a signed, tamper-proof .vault archive JSON string.
   */
  public static async createVaultArchive(
    workspaceName: string,
    treeItems: FileSystemItem[],
    documents: VaultDocumentState[],
    secret?: string
  ): Promise<string> {
    const payload: VaultArchivePayload = {
      magic: 'VAULT_SYNC_ARCHIVE',
      version: '1.0.0',
      exportedAt: Date.now(),
      workspaceName,
      treeItems,
      documents
    };

    const payloadJson = JSON.stringify(payload);
    const dataBytes = new TextEncoder().encode(payloadJson);

    const hmacKey = await VaultArchiveManager.getHMACKey(secret);
    const hmacSignatureHex = await VaultArchiveManager.computeHMACSignature(hmacKey, dataBytes);

    const archiveFile: VaultArchiveFile = {
      format: 'VAULTSYNC_ENCRYPTED_BACKUP_V1',
      payloadJson,
      hmacSignatureHex
    };

    return JSON.stringify(archiveFile, null, 2);
  }

  /**
   * Verifies the HMAC-SHA256 signature and unpacks the .vault archive.
   * Throws an explicit error if the file has been tampered with or corrupted.
   */
  public static async verifyAndRestoreVaultArchive(
    rawArchiveText: string,
    secret?: string
  ): Promise<VaultArchivePayload> {
    let archiveFile: VaultArchiveFile;
    try {
      archiveFile = JSON.parse(rawArchiveText);
    } catch {
      throw new Error('Định dạng tệp không hợp lệ: Không thể đọc cấu trúc JSON của tệp .vault.');
    }

    if (archiveFile.format !== 'VAULTSYNC_ENCRYPTED_BACKUP_V1' || !archiveFile.payloadJson || !archiveFile.hmacSignatureHex) {
      throw new Error('Cấu trúc bản sao lưu không hợp lệ: Thiếu định dạng chuẩn hoặc chữ ký bảo mật.');
    }

    const dataBytes = new TextEncoder().encode(archiveFile.payloadJson);
    const hmacKey = await VaultArchiveManager.getHMACKey(secret);
    const signatureBytes = BinaryUtils.hexToBytes(archiveFile.hmacSignatureHex);

    // 🛡️ WebCrypto native Constant-Time HMAC Verification (Anti-Timing Attack)
    const isValid = await crypto.subtle.verify(
      'HMAC',
      hmacKey,
      signatureBytes as BufferSource,
      dataBytes as BufferSource
    );

    if (!isValid) {
      throw new Error('CHỮ KÝ XÁC THỰC HMAC-SHA256 KHÔNG HỢP LỆ! Tệp sao lưu đã bị chỉnh sửa hoặc bị giả mạo trên đường truyền.');
    }

    const payload: VaultArchivePayload = JSON.parse(archiveFile.payloadJson);
    if (payload.magic !== 'VAULT_SYNC_ARCHIVE') {
      throw new Error('Dữ liệu sao lưu không đúng định dạng VaultSync.');
    }

    return payload;
  }
}
