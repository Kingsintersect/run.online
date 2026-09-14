"use client"

import { useState } from "react"
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
import { useMajorPrograms } from "@/hooks/useCourseStructure"

interface ManageRolesModalProps {
  userId: number
  userName: string
  onClose: () => void
}

// Same pattern as CreateUserModal's UNSCOPABLE_ROLE_NAME_PATTERN — see
// sandbox/major-program-scoping/FRONTEND_IMPLEMENTATION_PLAN.md §2.
const UNSCOPABLE_ROLE_NAME_PATTERN = /student|super\s*admin/i

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
  const { data: majorProgramsData } = useMajorPrograms()
  const majorPrograms = (majorProgramsData?.data ?? []).filter(
    (mp) => mp.isActive
  )
  const assignMut = useAssignUserRoles()
  const revokeMut = useRevokeUserRole()

  // Scope selected for a not-yet-assigned role, keyed by role id — cleared
  // once that role is actually assigned. Can't show the CURRENT scope of an
  // already-assigned role yet: GET /auth/users/:userId/roles doesn't return
  // major_program_id on the backend today, only once
  // sandbox/major-program-scoping/ ships will an existing grant's scope be
  // visible here to edit.
  const [pendingScope, setPendingScope] = useState<Record<number, number[]>>({})

  const assignedIds = new Set((assignedRoles ?? []).map((r) => r.id))
  const isLoading = rolesLoading || assignedLoading

  const toggleScope = (roleId: number, majorProgramId: number) => {
    setPendingScope((prev) => {
      const current = prev[roleId] ?? []
      const next = current.includes(majorProgramId)
        ? current.filter((id) => id !== majorProgramId)
        : [...current, majorProgramId]
      return { ...prev, [roleId]: next }
    })
  }

  const handleToggle = (roleId: number, currentlyAssigned: boolean) => {
    if (currentlyAssigned) {
      revokeMut.mutate({ user_id: userId, role_id: roleId })
    } else {
      const scope = pendingScope[roleId]
      assignMut.mutate({
        user_id: userId,
        role_ids: [roleId],
        major_program_ids: scope?.length ? scope : undefined,
      })
      setPendingScope((prev) => ({ ...prev, [roleId]: [] }))
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
            const isScopable =
              majorPrograms.length > 0 &&
              !UNSCOPABLE_ROLE_NAME_PATTERN.test(role.name)
            const scope = pendingScope[role.id] ?? []
            return (
              <div
                key={role.id}
                className="space-y-2 rounded-xl border border-border bg-card px-3 py-2.5"
              >
                <div className="flex items-center justify-between">
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
                {!assigned && isScopable && (
                  <div className="flex flex-wrap items-center gap-1.5 pl-6">
                    <span className="text-xs text-muted-foreground">
                      Scope (optional):
                    </span>
                    {majorPrograms.map((mp) => {
                      const selected = scope.includes(mp.id)
                      return (
                        <button
                          type="button"
                          key={mp.id}
                          onClick={() => toggleScope(role.id, mp.id)}
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                            selected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-muted text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          {mp.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
