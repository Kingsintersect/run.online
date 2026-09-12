"use client"

import { useQuery } from "@tanstack/react-query"
import { Loader2, Shield, Trash2 } from "lucide-react"
import Modal from "@/components/custom/Modal"
import StatusBadge from "@/components/custom/StatusBadge"
import { Button } from "@/components/ui/button"
import { rolesQueryOptions } from "@/services/rolesApi"
import {
  useUserRoles,
  useAssignUserRoles,
  useRevokeUserRole,
} from "@/hooks/useUserRoles"

interface ManageRolesModalProps {
  userId: number
  userName: string
  onClose: () => void
}

export function ManageRolesModal({
  userId,
  userName,
  onClose,
}: ManageRolesModalProps) {
  const { data: allRoles, isLoading: rolesLoading } = useQuery(
    rolesQueryOptions.list()
  )
  const { data: assignedRoles, isLoading: assignedLoading } =
    useUserRoles(userId)
  const assignMut = useAssignUserRoles()
  const revokeMut = useRevokeUserRole()

  const assignedIds = new Set((assignedRoles ?? []).map((r) => r.id))
  const isLoading = rolesLoading || assignedLoading

  const handleToggle = (roleId: number, currentlyAssigned: boolean) => {
    if (currentlyAssigned) {
      revokeMut.mutate({ user_id: userId, role_id: roleId })
    } else {
      assignMut.mutate({ user_id: userId, role_ids: [roleId] })
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Manage Roles"
      subtitle={userName}
      size="md"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {(allRoles ?? []).map((role) => {
            const assigned = assignedIds.has(role.id)
            return (
              <div
                key={role.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <Shield className="size-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {role.name}
                  </span>
                  {assigned && (
                    <StatusBadge label="Assigned" variant="success" dot />
                  )}
                </div>
                <Button
                  variant={assigned ? "outline" : "default"}
                  size="sm"
                  onClick={() => handleToggle(role.id, assigned)}
                  disabled={assignMut.isPending || revokeMut.isPending}
                >
                  {assigned ? (
                    <>
                      <Trash2 className="size-3.5" data-icon="inline-start" />
                      Remove
                    </>
                  ) : (
                    "Assign"
                  )}
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
