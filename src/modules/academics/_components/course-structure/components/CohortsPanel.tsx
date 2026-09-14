"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { CalendarRange, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import StatusBadge from "@/components/custom/StatusBadge"
import { useAllPrograms } from "@/hooks/useCourseStructure"
import {
  useCohorts,
  useRemoveCohort,
  useTransitionCohort,
} from "@/hooks/useCourseStructure"
import { EmptyState } from "./EmptyState"
import { CohortFormDialog } from "./CohortFormDialog"
import type { Cohort, CohortStatus } from "@/types/school"

const STATUS_VARIANT: Record<
  CohortStatus,
  "success" | "info" | "warning" | "default" | "purple" | "destructive"
> = {
  OPEN: "success",
  IN_PROGRESS: "info",
  EXAM_WINDOW: "warning",
  CLOSED: "default",
  CERTIFIED: "purple",
  CANCELLED: "destructive",
}

const NEXT_STATUS: Record<CohortStatus, CohortStatus | null> = {
  OPEN: "IN_PROGRESS",
  IN_PROGRESS: "EXAM_WINDOW",
  EXAM_WINDOW: "CLOSED",
  CLOSED: "CERTIFIED",
  CERTIFIED: null,
  CANCELLED: null,
}

// Cohorts — sandbox/program-structure-depth/. A Certificate
// program's replacement for Session/Semester/Level (see school.d.ts's
// Cohort note). Scoped to a single program picker rather than nested under
// FacultiesPanel's drill-down, since only CERTIFICATE-category programs use
// this at all — most deployments will have a handful of these, not one per
// department.
export function CohortsPanel({ canManage = false }: { canManage?: boolean }) {
  const { data: programsData, isLoading: programsLoading } = useAllPrograms()
  const certificatePrograms = useMemo(
    () =>
      (programsData?.data ?? []).filter(
        (p) => p.programCategory === "CERTIFICATE"
      ),
    [programsData]
  )

  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(
    null
  )
  const activeProgramId =
    selectedProgramId ?? certificatePrograms[0]?.id ?? null

  const { data: cohortsData, isLoading: cohortsLoading } =
    useCohorts(activeProgramId)
  const removeCohort = useRemoveCohort(activeProgramId)
  const transitionCohort = useTransitionCohort(activeProgramId)
  const [editing, setEditing] = useState<Cohort | null | undefined>(undefined)

  const cohorts = cohortsData?.data ?? []

  const handleAdvance = async (cohort: Cohort) => {
    const next = NEXT_STATUS[cohort.status]
    if (!next) return
    try {
      await transitionCohort.mutateAsync({
        id: cohort.id,
        payload: { status: next },
      })
      toast.success(`Cohort moved to ${next.replace("_", " ")}`)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to transition cohort"
      )
    }
  }

  const handleRemove = async (id: number) => {
    try {
      await removeCohort.mutateAsync(id)
      toast.success("Cohort removed")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove cohort"
      )
    }
  }

  if (programsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  if (certificatePrograms.length === 0) {
    return (
      <EmptyState
        icon={CalendarRange}
        title="No Certificate programs yet"
        description="Cohorts only apply to CERTIFICATE-category programs — create one under Faculties first, then come back here to manage its intake sittings."
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Cohorts</h2>
          <p className="text-sm text-muted-foreground">
            Intake sittings for Certificate programs — independent of the
            institution&apos;s academic session, so multiple can run
            concurrently (e.g. an ICAN May sitting and a CIB November sitting).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={activeProgramId ? String(activeProgramId) : undefined}
            onValueChange={(v) => setSelectedProgramId(Number(v))}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a Certificate program" />
            </SelectTrigger>
            <SelectContent>
              {certificatePrograms.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canManage && activeProgramId && (
            <Button onClick={() => setEditing(null)}>
              <Plus className="size-4" data-icon="inline-start" />
              New Cohort
            </Button>
          )}
        </div>
      </div>

      {cohortsLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : cohorts.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="No cohorts yet"
          description="Create the first intake sitting for this program."
          action={
            canManage ? (
              <Button onClick={() => setEditing(null)}>
                <Plus className="size-4" data-icon="inline-start" />
                Add First Cohort
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cohorts.map((cohort, index) => {
            const next = NEXT_STATUS[cohort.status]
            return (
              <motion.div
                key={cohort.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card>
                  <CardContent className="pt-6">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {cohort.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {cohort.code}
                        </p>
                      </div>
                      <StatusBadge
                        label={cohort.status.replace("_", " ")}
                        variant={STATUS_VARIANT[cohort.status]}
                        dot
                      />
                    </div>
                    <p className="mb-3 text-xs text-muted-foreground">
                      {cohort.startDate} → {cohort.endDate}
                      {typeof cohort.enrolledCount === "number" &&
                        ` · ${cohort.enrolledCount} enrolled`}
                      {cohort.capacity ? ` / ${cohort.capacity}` : ""}
                    </p>
                    {canManage && (
                      <div className="flex items-center gap-2">
                        {next && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleAdvance(cohort)}
                            disabled={transitionCohort.isPending}
                          >
                            Advance to {next.replace("_", " ")}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setEditing(cohort)}
                          title="Edit cohort"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        {cohort.status === "OPEN" && !cohort.enrolledCount && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleRemove(cohort.id)}
                            disabled={removeCohort.isPending}
                            title="Remove cohort"
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {activeProgramId && (
        <CohortFormDialog
          open={editing !== undefined}
          onClose={() => setEditing(undefined)}
          programId={activeProgramId}
          cohort={editing}
        />
      )}
    </div>
  )
}
