"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { Building, Link2, Loader2, Pencil, Plus, Power } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import StatusBadge from "@/components/custom/StatusBadge"
import {
  useMajorPrograms,
  useUpdateMajorProgram,
} from "@/hooks/useCourseStructure"
import { useAcademicUnits } from "@/hooks/useAcademicStructure"
import {
  academicStructureKeys,
  resolveMajorProgramAcademicUnit,
} from "@/services/academicStructureApi"
import { EmptyState } from "./EmptyState"
import { MajorProgramFormDialog } from "./MajorProgramFormDialog"
import type { MajorProgram } from "@/types/school"

// Major Programs — sandbox/major-program-scoping/. Management of
// this entity is an institution-level decision (per README.md §4.A — only
// SUPER_ADMIN should create/edit a major program, a scoped ADMIN operates
// within one, never defines new ones), gated by `canManage` from the shell
// above, same as every other course-structure panel — see
// AcademicsShell.tsx's CourseStructureShell.
export function MajorProgramsPanel({
  canManage = false,
}: {
  canManage?: boolean
}) {
  const { data, isLoading } = useMajorPrograms()
  const updateMajorProgram = useUpdateMajorProgram()
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [editing, setEditing] = useState<MajorProgram | null | undefined>(
    undefined
  )
  const queryClient = useQueryClient()
  const [linkingId, setLinkingId] = useState<number | null>(null)

  // Which major programs already have a root node in the Moodle-sync
  // structure tree — see resolveMajorProgramAcademicUnit's note.
  const { data: unitsData } = useAcademicUnits({ rootsOnly: true })
  const linkedMajorProgramIds = new Set(
    (unitsData?.data ?? [])
      .filter((u) => u.linkedEntity?.type === "major_program")
      .map((u) => u.linkedEntity!.id)
  )

  const majorPrograms = data?.data ?? []

  // PATCH `{isActive}` — a reversible soft toggle. DELETE on this resource is
  // a hard delete (bruno/academic/Major Programs - Delete.bru), so it must
  // never back this button.
  const handleToggleActive = async (mp: MajorProgram) => {
    const nextActive = !mp.isActive
    setTogglingId(mp.id)
    try {
      await updateMajorProgram.mutateAsync({
        id: mp.id,
        payload: { isActive: nextActive },
      })
      toast.success(`${mp.name} ${nextActive ? "activated" : "deactivated"}`)
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : `Failed to ${nextActive ? "activate" : "deactivate"} major program`
      )
    } finally {
      setTogglingId(null)
    }
  }

  const handleLinkToMoodleStructure = async (mp: MajorProgram) => {
    setLinkingId(mp.id)
    try {
      await resolveMajorProgramAcademicUnit(mp.id, mp.name)
      await queryClient.invalidateQueries({
        queryKey: academicStructureKeys.units.all,
      })
      toast.success(`${mp.name} linked to the Moodle structure tree`)
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to link to Moodle structure"
      )
    } finally {
      setLinkingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Major Programs
          </h2>
          <p className="text-sm text-muted-foreground">
            The administrative groupings programs are scoped under — e.g.
            Degree, Part-Time, Foundational/JUPEB, Certificate, Business School.
            Distinct from a program&apos;s category: this determines who manages
            it and which calendar/fees/roles it scopes, not its academic shape.
            Assign a program to one from its edit form.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setEditing(null)}>
            <Plus className="size-4" data-icon="inline-start" />
            New Major Program
          </Button>
        )}
      </div>

      {majorPrograms.length === 0 ? (
        <EmptyState
          icon={Building}
          title="No major programs yet"
          description="Create one per operational grouping — e.g. Degree Programmes, Part-Time Programmes, Foundational/JUPEB Programmes, Certificate Programmes."
          action={
            canManage ? (
              <Button onClick={() => setEditing(null)}>
                <Plus className="size-4" data-icon="inline-start" />
                Create First Major Program
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {majorPrograms.map((mp, index) => (
            <motion.div
              key={mp.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Building size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {mp.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {mp.code}
                        </p>
                      </div>
                    </div>
                    <StatusBadge
                      label={mp.isActive ? "Active" : "Inactive"}
                      variant={mp.isActive ? "success" : "destructive"}
                      dot
                    />
                  </div>
                  {mp.description && (
                    <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
                      {mp.description}
                    </p>
                  )}
                  {typeof mp.programCount === "number" && (
                    <p className="mb-2 text-xs text-muted-foreground">
                      {mp.programCount} program
                      {mp.programCount === 1 ? "" : "s"} assigned
                    </p>
                  )}
                  {linkedMajorProgramIds.has(mp.id) ? (
                    <p className="mb-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                      <Link2 className="size-3" />
                      Linked to Moodle structure
                    </p>
                  ) : (
                    canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mb-1 h-auto px-0 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => handleLinkToMoodleStructure(mp)}
                        disabled={linkingId === mp.id}
                      >
                        {linkingId === mp.id ? (
                          <Loader2
                            className="size-3"
                            data-icon="inline-start"
                          />
                        ) : (
                          <Link2 className="size-3" data-icon="inline-start" />
                        )}
                        Link to Moodle structure
                      </Button>
                    )
                  )}
                  {canManage && (
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setEditing(mp)}
                      >
                        <Pencil className="size-3.5" data-icon="inline-start" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => handleToggleActive(mp)}
                        disabled={togglingId === mp.id}
                        title={
                          mp.isActive
                            ? "Deactivate major program"
                            : "Activate major program"
                        }
                        aria-label={
                          mp.isActive
                            ? `Deactivate ${mp.name}`
                            : `Activate ${mp.name}`
                        }
                        aria-pressed={mp.isActive}
                      >
                        {togglingId === mp.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Power
                            className={
                              mp.isActive
                                ? "size-3.5 text-destructive"
                                : "size-3.5 text-emerald-600 dark:text-emerald-400"
                            }
                          />
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <MajorProgramFormDialog
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        majorProgram={editing}
      />
    </div>
  )
}
