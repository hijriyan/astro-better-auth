/**
 * Server-resolved permissions for the current user in an organization.
 * Computed via auth.api.hasPermission (server-side) so dynamic roles
 * stored in the DB are correctly accounted for.
 */
export interface OrgPermissions {
  organization: { update: boolean; delete: boolean }
  member:       { create: boolean; update: boolean; delete: boolean }
  invitation:   { create: boolean; cancel: boolean }
  team:         { create: boolean; update: boolean; delete: boolean }
  ac:           { read: boolean; create: boolean; update: boolean; delete: boolean }
}

export const DEFAULT_PERMISSIONS: OrgPermissions = {
  organization: { update: false, delete: false },
  member:       { create: false, update: false, delete: false },
  invitation:   { create: false, cancel: false },
  team:         { create: false, update: false, delete: false },
  ac:           { read: false, create: false, update: false, delete: false },
};
