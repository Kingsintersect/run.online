import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  userRolesKeys,
  userRolesMutationOptions,
  userRolesQueryOptions,
} from "@/services/rolesApi"

// Real endpoints (Users - {List Roles, Assign Roles, Remove Role}.bru) —
// used from the User Management "Manage Roles" action on a specific user,
// distinct from the role-centric hooks in the Roles admin screen.

export function useUserRoles(userId: number | null) {
  return useQuery({
    ...userRolesQueryOptions.forUser(userId ?? 0),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  })
}

export function useAssignUserRoles() {
  const qc = useQueryClient()
  return useMutation({
    ...userRolesMutationOptions.assign(),
    onSuccess: async (_data, variables) => {
      await qc.invalidateQueries({
        queryKey: userRolesKeys.forUser(variables.user_id),
      })
      toast.success("Roles updated")
    },
    onError: () => toast.error("Failed to update roles"),
  })
}

export function useRevokeUserRole() {
  const qc = useQueryClient()
  return useMutation({
    ...userRolesMutationOptions.revoke(),
    onSuccess: async (_data, variables) => {
      await qc.invalidateQueries({
        queryKey: userRolesKeys.forUser(variables.user_id),
      })
      toast.success("Role removed")
    },
    onError: () => toast.error("Failed to remove role"),
  })
}
