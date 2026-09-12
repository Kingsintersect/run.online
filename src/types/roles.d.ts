// ──────────────────────────────────────────────
// Roles & Permissions Domain Types
// ──────────────────────────────────────────────

export interface Permission {
  id: number
  resource: string
  action: string
  module: string
  description: string | null
  created_at: string
}

export interface Role {
  id: number
  name: string
  slug: string
  description: string | null
  is_default: boolean
  created_at: string
  permissions?: Permission[]
  users_count?: number
}

export interface RolePermission {
  role_id: number
  permission_id: number
  created_at: string
}

export interface UserRole {
  user_id: number
  role_id: number
  assigned_by: number | null
  assigned_at: string
  expires_at: string | null
}

// Real shape per bruno/auth's `Users - List.bru` pattern (matches
// usersApi.ts's `User` shape) plus a `roles` array — this is what the
// proposed `GET /auth/roles/:roleId/users` endpoint (see
// MISSING_BACKEND_APIS.md) is specified to return, and what
// `GET /auth/users/:userId/roles` actually returns for the reverse
// direction (just id/name, no full user object needed there).
export interface UserWithRoles {
  id: number
  email: string
  username: string
  first_name: string | null
  last_name: string | null
  phone_number: string | null
  is_active: boolean
  roles: { id: number; name: string; slug: string }[]
}

export interface UserRoleSummary {
  id: number
  name: string
}

// ── Form / Payload types ────────────────────

export type CreateRolePayload = {
  name: string
  slug: string
  description: string
  is_default: boolean
  permission_ids: number[]
}

export type UpdateRolePayload = Partial<CreateRolePayload>

export type CreatePermissionPayload = {
  resource: string
  action: string
  module: string
  description: string
}

export type UpdatePermissionPayload = Partial<CreatePermissionPayload>

// Matches the real AssignRolesRequest DTO — takes a non-empty array, not a
// single role_id, and uses syncWithoutDetaching server-side (re-assigning
// an already-held role is a safe no-op).
export type AssignRolesPayload = {
  user_id: number
  role_ids: number[]
}

export type RevokeRolePayload = {
  user_id: number
  role_id: number
}

// ── Grouped permission view ──────────────────

export interface PermissionGroup {
  module: string
  permissions: Permission[]
}
