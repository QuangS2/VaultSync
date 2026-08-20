/**
 * Granular Document & Folder Permissions Engine for VaultSync
 * Empowers owners with fine-grained access control: View, Edit, Delete, Export, Comment.
 */

export type UserRole = 'owner' | 'editor' | 'viewer';

export interface DocumentPermissions {
  role: UserRole;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canComment: boolean;
}

export const DEFAULT_OWNER_PERMISSIONS: DocumentPermissions = {
  role: 'owner',
  canView: true,
  canEdit: true,
  canDelete: true,
  canExport: true,
  canComment: true
};

export const DEFAULT_EDITOR_PERMISSIONS: DocumentPermissions = {
  role: 'editor',
  canView: true,
  canEdit: true,
  canDelete: false,
  canExport: true,
  canComment: true
};

export const DEFAULT_VIEWER_PERMISSIONS: DocumentPermissions = {
  role: 'viewer',
  canView: true,
  canEdit: false,
  canDelete: false,
  canExport: false,
  canComment: true
};

export class PermissionsEngine {
  /**
   * Encodes permissions into a compact URL-safe string.
   */
  public static encodePermissions(perms: DocumentPermissions): string {
    const obj = {
      r: perms.role === 'owner' ? 'o' : perms.role === 'editor' ? 'e' : 'v',
      e: perms.canEdit ? 1 : 0,
      d: perms.canDelete ? 1 : 0,
      x: perms.canExport ? 1 : 0,
      c: perms.canComment ? 1 : 0
    };
    try {
      return btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch {
      return perms.role;
    }
  }

  /**
   * Decodes permissions from a compact string or URL params.
   */
  public static decodePermissions(rawStr?: string | null): DocumentPermissions {
    if (!rawStr) return { ...DEFAULT_OWNER_PERMISSIONS };

    if (rawStr === 'viewer' || rawStr === 'v') return { ...DEFAULT_VIEWER_PERMISSIONS };
    if (rawStr === 'editor' || rawStr === 'e') return { ...DEFAULT_EDITOR_PERMISSIONS };
    if (rawStr === 'owner' || rawStr === 'o') return { ...DEFAULT_OWNER_PERMISSIONS };

    try {
      let b64 = rawStr.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4 !== 0) b64 += '=';
      const json = atob(b64);
      const parsed = JSON.parse(json);

      const role: UserRole = parsed.r === 'o' ? 'owner' : parsed.r === 'e' ? 'editor' : 'viewer';
      return {
        role,
        canView: true,
        canEdit: parsed.e === 1 || (parsed.e === undefined && role !== 'viewer'),
        canDelete: parsed.d === 1 || role === 'owner',
        canExport: parsed.x === 1 || (parsed.x === undefined && role !== 'viewer'),
        canComment: parsed.c !== 0
      };
    } catch {
      return { ...DEFAULT_EDITOR_PERMISSIONS };
    }
  }
}
