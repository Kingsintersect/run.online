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
import { UNSCOPED_ROLE_NAME_PATTERN } from "../lib/role-scope"

interface ManageRolesModalProps {
  userId: number
  userName: string
  onClose: () => void
}

// Roles granted without a major program: students, super admins, and the
// cross-program teaching roles (tutor, HOD, dean). See lib/role-scope.ts.
const UNSCOPABLE_ROLE_NAME_PATTERN = UNSCOPED_ROLE_NAME_PATTERN

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
  // once that role is actually assigned.
  const [pendingScope, setPendingScope] = useState<Record<number, number[]>>({})

  const assignedIds = new Set((assignedRoles ?? []).map((r) => r.id))
  // GET /auth/users/:userId/roles returns one row per grant, each with its
  // major-program scope (null = unscoped), so a role scoped to two major
  // programs appears twice. Group the scope names per role for display.
  const assignedScopes = new Map<number, string[]>()
  for (const grant of assignedRoles ?? []) {
    if (!grant.majorProgramName) continue
    const names = assignedScopes.get(grant.id) ?? []
    names.push(grant.majorProgramName)
    assignedScopes.set(grant.id, names)
  }
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
                {assigned && (
                  <p className="pl-6 text-xs text-muted-foreground">
                    {assignedScopes.get(role.id)?.length
                      ? `Scoped to: ${assignedScopes.get(role.id)?.join(", ")}`
                      : "All major programs (unscoped)"}
                  </p>
                )}
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
