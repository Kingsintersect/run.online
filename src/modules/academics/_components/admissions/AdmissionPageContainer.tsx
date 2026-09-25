"use client"

import { useMemo, useState } from "react"
import {
  useAdmissionCycles,
  useCreateAdmissionCycle,
  useUpdateAdmissionCycle,
  useDeleteAdmissionCycle,
  useUpdateAdmissionStatus,
} from "./hooks/useAdmissionCycles"
import { useQuery } from "@tanstack/react-query"
import { courseStructureQueryOptions } from "@/services/courseStructureApi"
import { useMajorPrograms } from "@/hooks/useCourseStructure"

import type { AdmissionCycle, AdmissionCycleStatus } from "@/types/school"
import type { AdmissionCycleFormValues } from "@/schemas/school.schema"

import { AdmissionCycleForm } from "./components/AdmissionCycleForm"
import { AdmissionCycleCard } from "./components/AdmissionCycleCard"
import { RequirementsManager } from "./components/RequirementsManager"
import { EmptyState } from "./components/EmptyState"
import { MajorProgramTabs } from "@/components/custom/MajorProgramTabs"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  CalendarDays,
  Plus,
  Loader2,
  ArrowLeft,
  ClipboardList,
  Info,
} from "lucide-react"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useAcademicSessions } from "@/hooks/useAcademicSessions"
import { formatSessionLabel } from "@/lib/academic/session-label"

interface AdmissionsPageProps {
  canManage?: boolean
}

export default function AdmissionsPage({
  canManage = false,
}: AdmissionsPageProps) {
  // ── Shared data ──────────────────────────
  const { data: sessions, isLoading: isLoadingSessions } = useAcademicSessions()
  const { data: majorProgramsRes } = useMajorPrograms()
  const majorPrograms = useMemo(
    () => (majorProgramsRes?.data ?? []).filter((mp) => mp.isActive),
    [majorProgramsRes]
  )
  const { data: programsRes } = useQuery({
    ...courseStructureQueryOptions.programs.list(),
    staleTime: 1000 * 60 * 30,
  })
  // RequirementsManager compares program ids as strings (a holdover from the
  // legacy mock program shape) — real Program.id is numeric, so it's
  // stringified here rather than changing that comparison logic.
  const allPrograms = programsRes?.data ?? []
  const toProgramSummary = (list: typeof allPrograms) =>
    list.map((p) => ({ id: String(p.id), name: p.name, code: p.code }))

  // ── Local state ──────────────────────────
  // Different major programs can run independent calendars (Undergraduate,
  // Foundational/JUPEB, Part-Time, …), so the session picker below is
  // filtered to one major program at a time rather than one flat list.
  // Admission cycles have no scope field of their own — they inherit it
  // transitively through the session they're attached to.
  const [majorProgramFilter, setMajorProgramFilter] = useState<number | null>(
    null
  )
  const visibleSessions = majorProgramFilter
    ? sessions?.filter((s) => s.majorProgramId === majorProgramFilter)
    : sessions
  const majorProgramName = (id: number | null | undefined) =>
    id == null
      ? "Institution-wide"
      : (majorPrograms.find((mp) => mp.id === id)?.name ?? "Institution-wide")
  const [selectedSessionId, setSelectedSessionId] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingCycle, setEditingCycle] = useState<AdmissionCycle | null>(null)
  const [managingCycleId, setManagingCycleId] = useState<number | null>(null)

  // ── Data hooks ───────────────────────────
  const selectedSessionIdNum = selectedSessionId
    ? Number(selectedSessionId)
    : null
  const selectedSession =
    sessions?.find((s) => s.id === selectedSessionIdNum) ?? null
  // Major-Program Scoping — sandbox/major-program-scoping/
  // BACKEND_DEVIATIONS_2026-09-14.md A35. Sent ahead of the backend per
  // CLAUDE.md §14 — a no-op today since selecting a session (already
  // filtered to this major program via the tabs above) fully determines
  // scope; see admissionSetupApi.ts's note.
  const { data: cycles, isLoading: isLoadingCycles } = useAdmissionCycles(
    selectedSessionIdNum,
    majorProgramFilter
  )
  const createCycle = useCreateAdmissionCycle()
  const updateCycle = useUpdateAdmissionCycle(selectedSessionIdNum ?? 0)
  const deleteCycle = useDeleteAdmissionCycle(selectedSessionIdNum ?? 0)
  const updateStatus = useUpdateAdmissionStatus(selectedSessionIdNum ?? 0)

  // If user doesn't have permission, show nothing
  if (!canManage) return null

  // ── Handlers ─────────────────────────────
  const handleCreate = () => {
    setEditingCycle(null)
    setShowForm(true)
  }

  const handleEdit = (cycle: AdmissionCycle) => {
    setEditingCycle(cycle)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    await deleteCycle.mutateAsync(id)
    toast.success("Admission cycle deleted")
  }

  const handleToggleStatus = async (
    id: number,
    status: AdmissionCycleStatus
  ) => {
    await updateStatus.mutateAsync({ id, status })
    toast.success(status === "OPEN" ? "Admissions opened" : "Admissions closed")
  }

  const handleFormSubmit = async (data: AdmissionCycleFormValues) => {
    if (editingCycle) {
      await updateCycle.mutateAsync({
        id: editingCycle.id,
        payload: {
          ...data,
          academic_session_id: Number(data.academic_session_id),
          status: editingCycle.status,
        },
      })
      toast.success("Admission cycle updated")
    } else {
      await createCycle.mutateAsync({
        ...data,
        academic_session_id: Number(data.academic_session_id),
        status: "DRAFT",
      })
      toast.success("Admission cycle created")
    }
    setShowForm(false)
    setEditingCycle(null)
  }

  const handleCancelForm = () => {
    setShowForm(false)
    setEditingCycle(null)
  }

  const getSessionName = (sessionId: number) =>
    sessions?.find((s) => s.id === sessionId)?.name ?? String(sessionId)

  const isPending = createCycle.isPending || updateCycle.isPending

  // ── Drilled-in: Requirements view ────────
  if (managingCycleId) {
    const cycle = cycles?.find((c) => c.id === managingCycleId)
    // Major-Program Scoping — sandbox/major-program-scoping/
    // BACKEND_DEVIATIONS_2026-09-14.md A35. Program already carries a real
    // majorProgramId, so this is an exact client-side filter (not a
    // name-derived fallback): a requirement's program picker only offers
    // programs under this cycle's own session's major program. A null
    // session.majorProgramId (institution-wide session) keeps today's
    // exact behavior — every program stays offered, unscoped.
    const cycleSession = sessions?.find(
      (s) => s.id === cycle?.academic_session_id
    )
    const scopedPrograms =
      cycleSession?.majorProgramId != null
        ? allPrograms.filter(
            (p) => p.majorProgramId === cycleSession.majorProgramId
          )
        : allPrograms
    return (
      <div className="mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => setManagingCycleId(null)}
        >
          <ArrowLeft className="size-3.5" data-icon="inline-start" />
          Back to Admission Cycles
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Requirements — {getSessionName(cycle?.academic_session_id ?? 0)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set minimum entry requirements for each program or for all programs.
          </p>
        </div>

        <RequirementsManager
          cycleId={managingCycleId}
          programs={toProgramSummary(scopedPrograms)}
          canManage={canManage}
        />
      </div>
    )
  }

  // ── Main view ────────────────────────────
  return (
    <div className="mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Admissions Management
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Open and close admission windows, configure application settings, and
          manage entry requirements.
        </p>
      </div>

      {/* Major-program filter — narrows which sessions (and therefore which
          admission cycles) the picker below offers, since each major
          program can run its own calendar. */}
      <MajorProgramTabs
        programs={majorPrograms}
        value={majorProgramFilter}
        onChange={(id) => {
          setMajorProgramFilter(id)
          setSelectedSessionId("")
          setShowForm(false)
          setEditingCycle(null)
        }}
        className="mb-4"
      />

      {majorPrograms.length > 1 && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <p>
            Certificate programs are admitted through Cohorts (Course Structure
            → Cohorts), not Admission Cycles — they don&apos;t run on the
            session calendar.
          </p>
        </div>
      )}

      {/* Session selector + actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Card className="flex-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-muted-foreground" />
                <Label htmlFor="adm-session">Academic Session</Label>
              </div>
              <select
                id="adm-session"
                value={selectedSessionId}
                onChange={(e) => {
                  setSelectedSessionId(e.target.value)
                  setShowForm(false)
                  setEditingCycle(null)
                }}
                className="flex h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <option value="">Select a session</option>
                {visibleSessions
                  ?.sort(
                    (a, b) =>
                      new Date(b.startDate).getTime() -
                      new Date(a.startDate).getTime()
                  )
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {formatSessionLabel(s, majorProgramsRes?.data)}
                      {s.isActive ? " (Active)" : ""}
                    </option>
                  ))}
              </select>
              {isLoadingSessions && (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </CardContent>
        </Card>

        {selectedSessionId && !showForm && canManage && (
          <Button onClick={handleCreate}>
            <Plus className="size-4" data-icon="inline-start" />
            New Admission Cycle
          </Button>
        )}
      </div>

      <div className="mt-6 space-y-6">
        {/* No session selected */}
        {!selectedSessionId && !visibleSessions?.length && (
          <EmptyState
            icon={CalendarDays}
            title="No sessions for this major program yet"
            description="Create a session scoped to this major program under Academic Sessions, or switch to a different tab."
          />
        )}
        {!selectedSessionId && !!visibleSessions?.length && (
          <EmptyState
            icon={CalendarDays}
            title="Select a session"
            description="Choose an academic session above to view or create admission cycles."
          />
        )}

        {/* Loading */}
        {selectedSessionId && isLoadingCycles && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        )}

        {/* Create / Edit form */}
        {selectedSessionId && showForm && canManage && selectedSession && (
          <AdmissionCycleForm
            session={selectedSession}
            majorProgramLabel={majorProgramName(selectedSession.majorProgramId)}
            editingCycle={editingCycle}
            isPending={isPending}
            onSubmit={handleFormSubmit}
            onCancel={handleCancelForm}
            canManage={canManage}
          />
        )}

        {/* Cycle cards */}
        {selectedSessionId && !isLoadingCycles && !showForm && (
          <>
            {cycles && cycles.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {cycles.map((cycle) => (
                  <div key={cycle.id} className="space-y-2">
                    <AdmissionCycleCard
                      cycle={cycle}
                      sessionName={getSessionName(cycle.academic_session_id)}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onToggleStatus={handleToggleStatus}
                      canManage={canManage}
                    />
                    {canManage && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setManagingCycleId(cycle.id)}
                      >
                        <ClipboardList
                          className="size-3.5"
                          data-icon="inline-start"
                        />
                        Manage Requirements
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ClipboardList}
                title="No admission cycles"
                description="Create an admission cycle to start accepting applications for this session."
                action={
                  canManage ? (
                    <Button onClick={handleCreate}>
                      <Plus className="size-4" data-icon="inline-start" />
                      Create First Cycle
                    </Button>
                  ) : undefined
                }
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
