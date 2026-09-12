import apiClient, {
  createApiMutationOptions,
  createApiQueryOptions,
} from "@/lib/clients/apiClient"
import type {
  Role,
  Permission,
  CreateRolePayload,
  UpdateRolePayload,
  CreatePermissionPayload,
  UpdatePermissionPayload,
  AssignRolesPayload,
  RevokeRolePayload,
  UserWithRoles,
  UserRoleSummary,
} from "@/types/roles"
import type { ApiListResponse, ApiSingleResponse } from "@/types/school"

const AUTH = { access_token: true } as const

// ── Roles ───────────────────────────────────

export const rolesApi = {
  list: async (): Promise<ApiListResponse<Role>> => {
    return apiClient.get<ApiListResponse<Role>>("/auth/roles", AUTH)
  },

  getById: async (id: number): Promise<ApiSingleResponse<Role>> => {
    return apiClient.get<ApiSingleResponse<Role>>(`/auth/roles/${id}`, AUTH)
  },

  create: async (
    payload: CreateRolePayload
  ): Promise<ApiSingleResponse<Role>> => {
    return apiClient.post<ApiSingleResponse<Role>>("/auth/roles", payload, AUTH)
  },

  update: async (
    id: number,
    payload: UpdateRolePayload
  ): Promise<ApiSingleResponse<Role>> => {
    const { permission_ids: _permission_ids, ...rolePayload } = payload
    return apiClient.patch<ApiSingleResponse<Role>>(
      `/auth/roles/${id}`,
      rolePayload,
      AUTH
    )
  },

  delete: async (id: number): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/auth/roles/${id}`, AUTH)
  },

  // No `POST /auth/roles/:id/duplicate` endpoint exists (verified 404,
  // 2026-09-10 — the earlier "now shipped" note was wrong). Composed from the
  // real Create + permission-sync endpoints: read the source role with its
  // permissions, create a new one, copy the permission set across.
  duplicate: async (id: number): Promise<ApiSingleResponse<Role>> => {
    const source = (await rolesApi.getById(id)).data
    const created = await apiClient.post<ApiSingleResponse<Role>>(
      "/auth/roles",
      {
        name: `${source.name}_copy`,
        description: source.description ?? undefined,
      },
      AUTH
    )
    const permissionIds = (source.permissions ?? []).map((p) => p.id)
    if (permissionIds.length && created.data?.id) {
      await rolePermissionsApi.sync(created.data.id, permissionIds)
      return rolesApi.getById(created.data.id)
    }
    return created
  },
}

// ── Permissions ─────────────────────────────

export const permissionsApi = {
  // GET /auth/permissions is paginated server-side (default page size well
  // below the real permission count — confirmed 89 permissions vs. a
  // hardcoded limit=15 here, which silently truncated the admin UI to
  // whatever the first page happened to contain). Page through every
  // result so callers get the full catalog; DataTable already handles
  // client-side pagination/search on top of the full array, matching every
  // other admin list in this app.
  list: async (): Promise<ApiListResponse<Permission>> => {
    const limit = 100
    let page = 1
    let all: Permission[] = []
    for (;;) {
      const res = await apiClient.get<{
        data: Permission[]
        meta: { total: number; page: number; limit: number }
      }>(`/auth/permissions?page=${page}&limit=${limit}`, AUTH)
      all = all.concat(res.data)
      const total = res.meta?.total ?? all.length
      if (all.length >= total || res.data.length === 0) break
      page += 1
    }
    return { data: all, total: all.length }
  },

  // bruno's Permissions collection documents list+create only (Show/Delete
  // weren't part of the original spec) — per MISSING_BACKEND_APIS.md, now
  // confirmed shipped by the backend team even though bruno isn't updated yet.
  getById: async (id: number): Promise<ApiSingleResponse<Permission>> => {
    return apiClient.get<ApiSingleResponse<Permission>>(
      `/auth/permissions/${id}`,
      AUTH
    )
  },

  create: async (
    payload: CreatePermissionPayload
  ): Promise<ApiSingleResponse<Permission>> => {
    return apiClient.post<ApiSingleResponse<Permission>>(
      "/auth/permissions",
      payload,
      AUTH
    )
  },

  update: async (
    id: number,
    payload: UpdatePermissionPayload
  ): Promise<ApiSingleResponse<Permission>> => {
    return apiClient.patch<ApiSingleResponse<Permission>>(
      `/auth/permissions/${id}`,
      payload,
      AUTH
    )
  },

  // See note on getById above — now shipped by the backend team.
  delete: async (id: number): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(
      `/auth/permissions/${id}`,
      AUTH
    )
  },
}

// ── Role-Permission Assignment ──────────────

export const rolePermissionsApi = {
  getForRole: async (roleId: number): Promise<ApiListResponse<Permission>> => {
    const response = await rolesApi.getById(roleId)
    const perms = response.data.permissions ?? []
    return { data: perms, total: perms.length }
  },

  // POST /auth/roles/:id/permissions uses `syncWithoutDetaching` server-side
  // (see bruno/auth/Role Permissions - Assign.bru docs) — it only ATTACHES
  // the ids passed, it never removes ones left out. Safe for a brand-new
  // role (create/duplicate) where there's nothing to remove.
  sync: async (
    roleId: number,
    permissionIds: number[]
  ): Promise<ApiSingleResponse<Role>> => {
    return apiClient.post<ApiSingleResponse<Role>>(
      `/auth/roles/${roleId}/permissions`,
      { permissionIds },
      AUTH
    )
  },

  // DELETE /auth/roles/:role/permissions/:permission — detaches one
  // permission from one role (204 No Content).
  detach: async (roleId: number, permissionId: number): Promise<void> => {
    return apiClient.delete<void>(
      `/auth/roles/${roleId}/permissions/${permissionId}`,
      AUTH
    )
  },

  // Full reconcile for the role-edit flow: `sync` can't remove permissions,
  // so diff the desired set against what's attached now, attach the additions
  // in one call, and detach each removal individually. Returns the role with
  // its refreshed permission list.
  reconcile: async (
    roleId: number,
    desiredPermissionIds: number[]
  ): Promise<ApiSingleResponse<Role>> => {
    const current = (await rolePermissionsApi.getForRole(roleId)).data.map(
      (p) => p.id
    )
    const desired = new Set(desiredPermissionIds)
    const currentSet = new Set(current)
    const toAdd = desiredPermissionIds.filter((id) => !currentSet.has(id))
    const toRemove = current.filter((id) => !desired.has(id))

    if (toAdd.length) {
      await rolePermissionsApi.sync(roleId, toAdd)
    }
    await Promise.all(
      toRemove.map((permissionId) =>
        rolePermissionsApi.detach(roleId, permissionId)
      )
    )
    return rolesApi.getById(roleId)
  },
}

// ── User-Role Assignment ────────────────────
// listForUser/assign/revoke are real, bruno-documented endpoints
// (Users - {List Roles, Assign Roles, Remove Role}.bru) with no prior
// frontend caller. getUsersWithRole is the reverse lookup ("which users
// hold this role") needed by RoleDetailView's Users tab — `GET
// /auth/roles/:roleId/users` does NOT exist (verified 404, 2026-09-10) and
// `/users` carries no role data to filter on. Kept wired against the
// designed contract (sandbox/API_GAPS_2026-09.md §9); returns [] on 404 so
// the Users tab renders an empty state instead of an error screen.

export const userRolesApi = {
  listForUser: async (
    userId: number
  ): Promise<ApiListResponse<UserRoleSummary>> => {
    return apiClient.get<ApiListResponse<UserRoleSummary>>(
      `/auth/users/${userId}/roles`,
      AUTH
    )
  },

  assign: async (payload: AssignRolesPayload): Promise<{ message: string }> => {
    return apiClient.post<{ message: string }>(
      `/auth/users/${payload.user_id}/roles`,
      { roleIds: payload.role_ids },
      AUTH
    )
  },

  revoke: async (payload: RevokeRolePayload): Promise<void> => {
    return apiClient.delete<void>(
      `/auth/users/${payload.user_id}/roles/${payload.role_id}`,
      AUTH
    )
  },

  getUsersWithRole: async (
    roleId: number
  ): Promise<ApiListResponse<UserWithRoles>> => {
    try {
      return await apiClient.get<ApiListResponse<UserWithRoles>>(
        `/auth/roles/${roleId}/users`,
        AUTH
      )
    } catch {
      return { data: [], total: 0 }
    }
  },
}

export const rolesKeys = {
  all: ["roles"] as const,
  list: () => [...rolesKeys.all, "list"] as const,
  detail: (roleId: number) => [...rolesKeys.all, "detail", roleId] as const,
  permissions: (roleId: number) =>
    [...rolesKeys.all, "permissions", roleId] as const,
  users: (roleId: number) => [...rolesKeys.all, "users", roleId] as const,
}

export const permissionsKeys = {
  all: ["permissions"] as const,
  list: () => [...permissionsKeys.all, "list"] as const,
  detail: (permissionId: number) =>
    [...permissionsKeys.all, "detail", permissionId] as const,
}

export const userRolesKeys = {
  all: ["user-roles"] as const,
  forUser: (userId: number) =>
    [...userRolesKeys.all, "for-user", userId] as const,
}

export const rolesQueryOptions = {
  list: () =>
    createApiQueryOptions({
      queryKey: rolesKeys.list(),
      queryFn: async () => {
        const response = await rolesApi.list()
        return response.data
      },
    }),

  detail: (roleId: number) =>
    createApiQueryOptions({
      queryKey: rolesKeys.detail(roleId),
      queryFn: async () => {
        const response = await rolesApi.getById(roleId)
        return response.data
      },
    }),

  permissions: (roleId: number) =>
    createApiQueryOptions({
      queryKey: rolesKeys.permissions(roleId),
      queryFn: async () => {
        const response = await rolePermissionsApi.getForRole(roleId)
        return response.data
      },
    }),

  users: (roleId: number) =>
    createApiQueryOptions({
      queryKey: rolesKeys.users(roleId),
      queryFn: async () => {
        const response = await userRolesApi.getUsersWithRole(roleId)
        return response.data
      },
    }),
}

export const permissionsQueryOptions = {
  list: () =>
    createApiQueryOptions({
      queryKey: permissionsKeys.list(),
      queryFn: async () => {
        const response = await permissionsApi.list()
        return response.data
      },
    }),

  detail: (permissionId: number) =>
    createApiQueryOptions({
      queryKey: permissionsKeys.detail(permissionId),
      queryFn: async () => {
        const response = await permissionsApi.getById(permissionId)
        return response.data
      },
    }),
}

export const userRolesQueryOptions = {
  forUser: (userId: number) =>
    createApiQueryOptions({
      queryKey: userRolesKeys.forUser(userId),
      queryFn: async () => {
        const response = await userRolesApi.listForUser(userId)
        return response.data
      },
    }),
}

export const rolesMutationOptions = {
  create: () =>
    createApiMutationOptions<ApiSingleResponse<Role>, CreateRolePayload>({
      mutationKey: [...rolesKeys.all, "create"],
      mutationFn: rolesApi.create,
    }),

  update: () =>
    createApiMutationOptions<
      ApiSingleResponse<Role>,
      { id: number; payload: UpdateRolePayload }
    >({
      mutationKey: [...rolesKeys.all, "update"],
      mutationFn: ({ id, payload }) => rolesApi.update(id, payload),
    }),

  delete: () =>
    createApiMutationOptions<{ message: string }, number>({
      mutationKey: [...rolesKeys.all, "delete"],
      mutationFn: rolesApi.delete,
    }),

  duplicate: () =>
    createApiMutationOptions<ApiSingleResponse<Role>, number>({
      mutationKey: [...rolesKeys.all, "duplicate"],
      mutationFn: rolesApi.duplicate,
    }),

  // Edit flow → full reconcile (adds + detaches). Create/duplicate keep
  // calling `rolePermissionsApi.sync` directly since a fresh role has
  // nothing to detach.
  syncPermissions: () =>
    createApiMutationOptions<
      ApiSingleResponse<Role>,
      { roleId: number; permissionIds: number[] }
    >({
      mutationKey: [...rolesKeys.all, "sync-permissions"],
      mutationFn: ({ roleId, permissionIds }) =>
        rolePermissionsApi.reconcile(roleId, permissionIds),
    }),
}

export const permissionsMutationOptions = {
  create: () =>
    createApiMutationOptions<
      ApiSingleResponse<Permission>,
      CreatePermissionPayload
    >({
      mutationKey: [...permissionsKeys.all, "create"],
      mutationFn: permissionsApi.create,
    }),

  update: () =>
    createApiMutationOptions<
      ApiSingleResponse<Permission>,
      { id: number; payload: UpdatePermissionPayload }
    >({
      mutationKey: [...permissionsKeys.all, "update"],
      mutationFn: ({ id, payload }) => permissionsApi.update(id, payload),
    }),

  delete: () =>
    createApiMutationOptions<{ message: string }, number>({
      mutationKey: [...permissionsKeys.all, "delete"],
      mutationFn: permissionsApi.delete,
    }),
}

export const userRolesMutationOptions = {
  assign: () =>
    createApiMutationOptions<{ message: string }, AssignRolesPayload>({
      mutationKey: [...userRolesKeys.all, "assign"],
      mutationFn: userRolesApi.assign,
    }),

  revoke: () =>
    createApiMutationOptions<void, RevokeRolePayload>({
      mutationKey: [...userRolesKeys.all, "revoke"],
      mutationFn: userRolesApi.revoke,
    }),
}
