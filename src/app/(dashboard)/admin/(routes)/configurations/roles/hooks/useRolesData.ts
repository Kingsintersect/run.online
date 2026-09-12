"use client"

import { useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useRolesStore } from "@/store/dashboard/rolesStore"
import {
  permissionsKeys,
  permissionsMutationOptions,
  permissionsQueryOptions,
  rolesKeys,
  rolesMutationOptions,
  rolesQueryOptions,
} from "@/services/rolesApi"
import type {
  CreatePermissionPayload,
  CreateRolePayload,
  Permission,
  PermissionGroup,
  UpdatePermissionPayload,
  UpdateRolePayload,
} from "@/types/roles"

function useRolesInvalidation() {
  const queryClient = useQueryClient()

  const invalidateRoles = async (roleId?: number) => {
    await queryClient.invalidateQueries({ queryKey: rolesKeys.all })
    if (roleId) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: rolesKeys.detail(roleId) }),
        queryClient.invalidateQueries({
          queryKey: rolesKeys.permissions(roleId),
        }),
        queryClient.invalidateQueries({ queryKey: rolesKeys.users(roleId) }),
      ])
    }
  }

  const invalidatePermissions = async () => {
    await queryClient.invalidateQueries({ queryKey: permissionsKeys.all })
    await queryClient.invalidateQueries({ queryKey: rolesKeys.all })
  }

  return { invalidateRoles, invalidatePermissions }
}

export function useRoles() {
  const { selectedRole, setSelectedRole } = useRolesStore()
  const { invalidateRoles } = useRolesInvalidation()
  const rolesQuery = useQuery({
    ...rolesQueryOptions.list(),
    staleTime: 1000 * 60 * 5,
  })

  const createRoleMutation = useMutation({
    ...rolesMutationOptions.create(),
    onSuccess: async () => {
      await invalidateRoles()
      toast.success("Role created successfully")
    },
    onError: () => {
      toast.error("Failed to create role")
    },
  })

  const updateRoleMutation = useMutation({
    ...rolesMutationOptions.update(),
    onSuccess: async (_, variables) => {
      await invalidateRoles(variables.id)
      toast.success("Role updated successfully")
    },
    onError: () => {
      toast.error("Failed to update role")
    },
  })

  const deleteRoleMutation = useMutation({
    ...rolesMutationOptions.delete(),
    onSuccess: async () => {
      await invalidateRoles()
      toast.success("Role deleted successfully")
    },
    onError: () => {
      toast.error("Failed to delete role")
    },
  })

  const duplicateRoleMutation = useMutation({
    ...rolesMutationOptions.duplicate(),
    onSuccess: async () => {
      await invalidateRoles()
      toast.success("Role duplicated successfully")
    },
    onError: () => {
      toast.error("Failed to duplicate role")
    },
  })

  const syncPermissionsMutation = useMutation({
    ...rolesMutationOptions.syncPermissions(),
    onSuccess: async (_, variables) => {
      await invalidateRoles(variables.roleId)
      toast.success("Permissions updated")
    },
    onError: () => {
      toast.error("Failed to update permissions")
    },
  })

  return {
    roles: rolesQuery.data ?? [],
    loading: rolesQuery.isLoading,
    refreshing: rolesQuery.isFetching,
    error: rolesQuery.error,
    selectedRole,
    setSelectedRole,
    fetchRoles: rolesQuery.refetch,
    createRole: async (payload: CreateRolePayload) => {
      const response = await createRoleMutation.mutateAsync(payload)
      return response.data
    },
    updateRole: async (id: number, payload: UpdateRolePayload) => {
      const response = await updateRoleMutation.mutateAsync({ id, payload })
      return response.data
    },
    deleteRole: (id: number) => deleteRoleMutation.mutateAsync(id),
    duplicateRole: async (id: number) => {
      const response = await duplicateRoleMutation.mutateAsync(id)
      return response.data
    },
    syncPermissions: async (roleId: number, permissionIds: number[]) => {
      const response = await syncPermissionsMutation.mutateAsync({
        roleId,
        permissionIds,
      })
      return response.data
    },
    isMutating:
      createRoleMutation.isPending ||
      updateRoleMutation.isPending ||
      deleteRoleMutation.isPending ||
      duplicateRoleMutation.isPending ||
      syncPermissionsMutation.isPending,
  }
}

export function useRoleDetail(roleId: number) {
  const queryEnabled = Number.isFinite(roleId) && roleId > 0
  const roleQuery = useQuery({
    ...rolesQueryOptions.detail(roleId),
    enabled: queryEnabled,
    staleTime: 1000 * 60 * 2,
  })
  const permissionsQuery = useQuery({
    ...rolesQueryOptions.permissions(roleId),
    enabled: queryEnabled,
    staleTime: 1000 * 60 * 2,
  })
  const usersQuery = useQuery({
    ...rolesQueryOptions.users(roleId),
    enabled: queryEnabled,
    staleTime: 1000 * 60,
  })

  const groupedPermissions = useMemo(() => {
    return (permissionsQuery.data ?? []).reduce<Record<string, Permission[]>>(
      (acc, p) => {
        if (!acc[p.module]) acc[p.module] = []
        acc[p.module].push(p)
        return acc
      },
      {}
    )
  }, [permissionsQuery.data])

  return {
    role: roleQuery.data ?? null,
    permissions: permissionsQuery.data ?? [],
    users: usersQuery.data ?? [],
    groupedPermissions,
    loading:
      roleQuery.isLoading || permissionsQuery.isLoading || usersQuery.isLoading,
    refreshing:
      roleQuery.isFetching ||
      permissionsQuery.isFetching ||
      usersQuery.isFetching,
    error:
      roleQuery.error ?? permissionsQuery.error ?? usersQuery.error ?? null,
    refetch: () =>
      Promise.all([
        roleQuery.refetch(),
        permissionsQuery.refetch(),
        usersQuery.refetch(),
      ]),
  }
}

export function usePermissions() {
  const {
    selectedPermission,
    setSelectedPermission,
    moduleFilter,
    setModuleFilter,
  } = useRolesStore()
  const { invalidatePermissions } = useRolesInvalidation()
  const permissionsQuery = useQuery({
    ...permissionsQueryOptions.list(),
    staleTime: 1000 * 60 * 5,
  })
  const permissions = useMemo(
    () => permissionsQuery.data ?? [],
    [permissionsQuery.data]
  )

  const createPermissionMutation = useMutation({
    ...permissionsMutationOptions.create(),
    onSuccess: async () => {
      await invalidatePermissions()
      toast.success("Permission created successfully")
    },
    onError: () => {
      toast.error("Failed to create permission")
    },
  })

  const updatePermissionMutation = useMutation({
    ...permissionsMutationOptions.update(),
    onSuccess: async () => {
      await invalidatePermissions()
      toast.success("Permission updated successfully")
    },
    onError: () => {
      toast.error("Failed to update permission")
    },
  })

  const deletePermissionMutation = useMutation({
    ...permissionsMutationOptions.delete(),
    onSuccess: async () => {
      await invalidatePermissions()
      toast.success("Permission deleted successfully")
    },
    onError: () => {
      toast.error("Failed to delete permission")
    },
  })

  const groupedPermissions: PermissionGroup[] = useMemo(() => {
    const groups = new Map<string, Permission[]>()
    const filtered =
      moduleFilter === "all"
        ? permissions
        : permissions.filter((p) => p.module === moduleFilter)

    filtered.forEach((permission) => {
      const existing = groups.get(permission.module) || []
      existing.push(permission)
      groups.set(permission.module, existing)
    })

    return Array.from(groups.entries())
      .map(([module, modulePermissions]) => ({
        module,
        permissions: modulePermissions,
      }))
      .sort((a, b) => a.module.localeCompare(b.module))
  }, [moduleFilter, permissions])

  const modules = useMemo(
    () =>
      [...new Set(permissions.map((permission) => permission.module))].sort(),
    [permissions]
  )

  return {
    permissions,
    groupedPermissions,
    modules,
    moduleFilter,
    setModuleFilter,
    selectedPermission,
    setSelectedPermission,
    loading: permissionsQuery.isLoading,
    refreshing: permissionsQuery.isFetching,
    error: permissionsQuery.error,
    fetchPermissions: permissionsQuery.refetch,
    createPermission: async (payload: CreatePermissionPayload) => {
      const response = await createPermissionMutation.mutateAsync(payload)
      return response.data
    },
    updatePermission: async (id: number, payload: UpdatePermissionPayload) => {
      const response = await updatePermissionMutation.mutateAsync({
        id,
        payload,
      })
      return response.data
    },
    deletePermission: (id: number) => deletePermissionMutation.mutateAsync(id),
    isMutating:
      createPermissionMutation.isPending ||
      updatePermissionMutation.isPending ||
      deletePermissionMutation.isPending,
  }
}
