"use client"

import { useState } from "react"
import {
  useAdmissionCycles,
  useCreateAdmissionCycle,
  useUpdateAdmissionCycle,
  useDeleteAdmissionCycle,
  useUpdateAdmissionStatus,
} from "./hooks/useAdmissionCycles"
import { useQuery } from "@tanstack/react-query"
import { courseStructureQueryOptions } from "@/services/courseStructureApi"

import type { AdmissionCycle, AdmissionCycleStatus } from "@/types/school"
import type { AdmissionCycleFormValues } from "@/schemas/school.schema"

import { AdmissionCycleForm } from "./components/AdmissionCycleForm"
import { AdmissionCycleCard } from "./components/AdmissionCycleCard"
import { RequirementsManager } from "./components/RequirementsManager"
import { EmptyState } from "./components/EmptyState"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  CalendarDays,
  Plus,
  Loader2,
  ArrowLeft,
  ClipboardList,
} from "lucide-react"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useAcademicSessions } from "@/hooks/useAcademicSessions"

interface AdmissionsPageProps {
  canManage?: boolean
}

export default function AdmissionsPage({
  canManage = false,
}: AdmissionsPageProps) {
  // ── Shared data ──────────────────────────
  const { data: sessions, isLoading: isLoadingSessions } = useAcademicSessions()
  const { data: programsRes } = useQuery({
    ...courseStructureQueryOptions.programs.list(),
    staleTime: 1000 * 60 * 30,
  })
  // RequirementsManager compares program ids as strings (a holdover from the
  // legacy mock program shape) — real Program.id is numeric, so it's
  // stringified here rather than changing that comparison logic.
  const programs = programsRes?.data.map((p) => ({
    id: String(p.id),
    name: p.name,
    code: p.code,
  }))

  // ── Local state ──────────────────────────
  const [selectedSessionId, setSelectedSessionId] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingCycle, setEditingCycle] = useState<AdmissionCycle | null>(null)
  const [managingCycleId, setManagingCycleId] = useState<number | null>(null)

  // ── Data hooks ───────────────────────────
  const selectedSessionIdNum = selectedSessionId
    ? Number(selectedSessionId)
    : null
  const { data: cycles, isLoading: isLoadingCycles } =
    useAdmissionCycles(selectedSessionIdNum)
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
          programs={programs ?? []}
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
                {sessions
                  ?.sort(
                    (a, b) =>
                      new Date(b.startDate).getTime() -
                      new Date(a.startDate).getTime()
                  )
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.isActive ? "(Active)" : ""}
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
        {!selectedSessionId && (
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
        {selectedSessionId && showForm && canManage && (
          <AdmissionCycleForm
            sessions={sessions ?? []}
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
