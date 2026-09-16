"use client"

import { useMemo, useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  useAcademicSessions,
  useCreateSession,
  useUpdateSession,
  useActivateSession,
  useDeleteSession,
} from "@/hooks/useAcademicSessions"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { useMajorPrograms } from "@/hooks/useCourseStructure"
import { useSessionDetail } from "@/modules/timetable/hooks/useAcademicCalendar"
import Modal from "@/components/custom/Modal"
import { MajorProgramTabs } from "@/components/custom/MajorProgramTabs"
import { useAcademicSessionSetupStore } from "@/store/dashboard/academicSessionSetupStore"
import {
  academicSessionSchema,
  type AcademicSessionFormValues,
} from "@/schemas/school.schema"
import type { AcademicSession } from "@/types/school"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EmptyState } from "./EmptyState"
import {
  CalendarDays,
  Plus,
  ArrowRight,
  Power,
  PowerOff,
  Pencil,
  Loader2,
  Layers,
  Building2,
  Trash2,
} from "lucide-react"

// A "date" input needs exactly YYYY-MM-DD; the API returns a full ISO
// timestamp for these fields — truncate rather than leave the input blank.
const toDateInputValue = (iso: string) => iso.slice(0, 10)

interface AcademicSessionManagerProps {
  canManage?: boolean
}

export function AcademicSessionManager({
  canManage = false,
}: AcademicSessionManagerProps) {
  const { data: sessions, isLoading } = useAcademicSessions()
  const { data: majorProgramsRes } = useMajorPrograms()
  const majorPrograms = useMemo(
    () => (majorProgramsRes?.data ?? []).filter((mp) => mp.isActive),
    [majorProgramsRes]
  )
  // Every screen a single-major-program (or major-program-less) deployment
  // sees must render exactly as it did before this feature existed — see
  // sandbox/major-program-scoping/README.md §0/§5's governing rule.
  const hasMultipleMajorPrograms = majorPrograms.length > 1
  const createSession = useCreateSession()
  const updateSession = useUpdateSession()
  const activateSession = useActivateSession()
  const deleteSession = useDeleteSession()

  const { setSelectedSession, setCurrentStep } = useAcademicSessionSetupStore()

  const [showForm, setShowForm] = useState(false)
  const [editingSession, setEditingSession] = useState<AcademicSession | null>(
    null
  )
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [detailSessionId, setDetailSessionId] = useState<number | null>(null)
  const [sessionFilter, setSessionFilter] = useState<number | null>(null)
  const [deletingSession, setDeletingSession] =
    useState<AcademicSession | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<AcademicSessionFormValues>({
    resolver: zodResolver(academicSessionSchema),
    defaultValues: {
      name: "",
      startDate: "",
      endDate: "",
      isActive: false,
      majorProgramId: null,
    },
  })

  const closeForm = () => {
    reset({
      name: "",
      startDate: "",
      endDate: "",
      isActive: false,
      majorProgramId: null,
    })
    setShowForm(false)
    setEditingSession(null)
  }

  const onSubmit = async (data: AcademicSessionFormValues) => {
    try {
      if (editingSession) {
        await updateSession.mutateAsync({
          id: editingSession.id,
          payload: data,
        })
        toast.success("Session updated")
        closeForm()
        return
      }
      await createSession.mutateAsync(data)
      toast.success("Session created")
      closeForm()
      // Land back on "All" so the session just created is visible alongside
      // every other one, not hidden behind whichever tab happened to be
      // active — it was easy to read that as "the new session displaced the
      // others" when really the (still-engaged) filter was just narrower than
      // expected. A reload used to "fix" this only because the filter is
      // local state that resets on remount; now creating does the same thing
      // without needing one.
      setSessionFilter(null)
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : `Couldn't ${editingSession ? "update" : "create"} this session`
      )
    }
  }

  const openCreateForm = () => {
    setEditingSession(null)
    // Pre-fill the new session's major program with whichever tab is
    // active, since creating one while looking at a specific program's
    // sessions almost always means it belongs to that program.
    reset({
      name: "",
      startDate: "",
      endDate: "",
      isActive: false,
      majorProgramId: sessionFilter,
    })
    setShowForm(true)
  }

  const openEditForm = (session: AcademicSession) => {
    setEditingSession(session)
    reset({
      name: session.name,
      startDate: toDateInputValue(session.startDate),
      endDate: toDateInputValue(session.endDate),
      isActive: session.isActive,
      majorProgramId: session.majorProgramId ?? null,
    })
    setShowForm(true)
  }

  const handleToggleActive = async (session: AcademicSession) => {
    setTogglingId(session.id)
    try {
      if (session.isActive) {
        await updateSession.mutateAsync({
          id: session.id,
          payload: { isActive: false },
        })
        toast.success(`${session.name} deactivated`)
      } else {
        await activateSession.mutateAsync(session.id)
        toast.success(`${session.name} activated`)
      }
    } catch (err) {
      const action = session.isActive ? "deactivate" : "activate"
      toast.error(
        `Couldn't ${action} "${session.name}"${err instanceof Error ? `: ${err.message}` : ""}`
      )
    } finally {
      setTogglingId(null)
    }
  }

  // Safe delete only (BACKEND_DEVIATIONS A11) — the backend 409s with
  // SESSION_IN_USE and names every blocking table if anything still
  // references this session, so the error is shown as-is rather than
  // re-worded.
  const handleDeleteSession = async () => {
    if (!deletingSession) return
    const session = deletingSession
    try {
      await deleteSession.mutateAsync(session.id)
      toast.success(`${session.name} deleted`)
      setDeletingSession(null)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Couldn't delete "${session.name}"`
      )
    }
  }

  const visibleSessions = sessionFilter
    ? sessions?.filter((s) => s.majorProgramId === sessionFilter)
    : sessions

  const majorProgramName = (id: number | null | undefined) =>
    id == null
      ? "Institution-wide"
      : (majorPrograms.find((mp) => mp.id === id)?.name ?? "Institution-wide")

  const handleSelect = (id: number, name: string) => {
    setSelectedSession(id, name)
    setCurrentStep("semesters")
  }

  // If user doesn't have permission, show nothing
  if (!canManage) return null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Academic Sessions
          </h2>
          <p className="text-sm text-muted-foreground">
            Create a new session or select an existing one to configure.
            {hasMultipleMajorPrograms &&
              " Each major program can run its own active session."}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => (showForm ? closeForm() : openCreateForm())}>
            <Plus className="size-4" data-icon="inline-start" />
            New Session
          </Button>
        )}
      </div>

      {/* Major-program filter — different major programs can run
          independent calendars (e.g. Undergraduate vs Foundational/JUPEB),
          so sessions are filtered here rather than shown as one flat list. */}
      <MajorProgramTabs
        programs={majorPrograms}
        value={sessionFilter}
        onChange={setSessionFilter}
      />

      {/* Create Form - only if can manage */}
      {showForm && canManage && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingSession
                ? "Edit Academic Session"
                : "Create Academic Session"}
            </CardTitle>
            <CardDescription>
              {editingSession
                ? "Update this session's name or dates."
                : "e.g., 2024/2025 — September 2024 to August 2025"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Session Name</Label>
                <Input
                  id="name"
                  placeholder="2024/2025"
                  aria-invalid={!!errors.name}
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  aria-invalid={!!errors.startDate}
                  {...register("startDate")}
                />
                {errors.startDate && (
                  <p className="text-sm text-destructive">
                    {errors.startDate.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  aria-invalid={!!errors.endDate}
                  {...register("endDate")}
                />
                {errors.endDate && (
                  <p className="text-sm text-destructive">
                    {errors.endDate.message}
                  </p>
                )}
              </div>
              {hasMultipleMajorPrograms && (
                <div className="space-y-1.5">
                  <Label htmlFor="session-major-program">Major Program</Label>
                  <Controller
                    name="majorProgramId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={
                          field.value == null ? "none" : String(field.value)
                        }
                        onValueChange={(val) =>
                          field.onChange(val === "none" ? null : Number(val))
                        }
                        disabled={!!editingSession}
                      >
                        <SelectTrigger
                          id="session-major-program"
                          className="w-full"
                        >
                          <SelectValue placeholder="Institution-wide" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Institution-wide</SelectItem>
                          {majorPrograms.map((mp) => (
                            <SelectItem key={mp.id} value={String(mp.id)}>
                              {mp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    {editingSession
                      ? "The major program can't be changed after creation."
                      : "Institution-wide sessions are shared by every program."}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={closeForm}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit(onSubmit)}
                disabled={createSession.isPending || updateSession.isPending}
              >
                {(createSession.isPending || updateSession.isPending) && (
                  <Loader2
                    className="size-4 animate-spin"
                    data-icon="inline-start"
                  />
                )}
                {editingSession ? "Save Changes" : "Create Session"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session List - action buttons only if can manage */}
      {!sessions?.length && !showForm ? (
        <EmptyState
          icon={CalendarDays}
          title="No academic sessions yet"
          description="Create your first academic session to get started with fee configuration."
          action={
            canManage ? (
              <Button onClick={openCreateForm}>
                <Plus className="size-4" data-icon="inline-start" />
                Create First Session
              </Button>
            ) : undefined
          }
        />
      ) : !visibleSessions?.length && !showForm ? (
        <EmptyState
          icon={CalendarDays}
          title="No sessions for this major program yet"
          description="Create a session scoped to this major program, or switch to a different tab."
          action={
            canManage ? (
              <Button onClick={openCreateForm}>
                <Plus className="size-4" data-icon="inline-start" />
                New Session
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleSessions?.map((session) => (
            <Card key={session.id} className="relative">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-primary" />
                  {session.name}
                </CardTitle>
                <CardDescription>
                  {new Date(session.startDate).toLocaleDateString("en-NG", {
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  —{" "}
                  {new Date(session.endDate).toLocaleDateString("en-NG", {
                    month: "short",
                    year: "numeric",
                  })}
                </CardDescription>
                <CardAction>
                  {session.isActive && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      <span className="size-1.5 rounded-full bg-primary" />
                      Active
                    </span>
                  )}
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-2">
                {hasMultipleMajorPrograms && (
                  <Badge
                    variant="outline"
                    className="mb-1 gap-1.5 text-[11px] font-normal text-muted-foreground"
                  >
                    <Building2 className="size-3" />
                    {majorProgramName(session.majorProgramId)}
                  </Badge>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleSelect(session.id, session.name)}
                  >
                    Configure
                    <ArrowRight className="size-4" data-icon="inline-end" />
                  </Button>
                  {canManage && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openEditForm(session)}
                      title="Edit session"
                    >
                      <Pencil className="size-4" />
                    </Button>
                  )}
                  {canManage && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleToggleActive(session)}
                      disabled={togglingId === session.id}
                      title={
                        session.isActive
                          ? "Deactivate session"
                          : "Activate session"
                      }
                    >
                      {togglingId === session.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : session.isActive ? (
                        <PowerOff className="size-4" />
                      ) : (
                        <Power className="size-4" />
                      )}
                    </Button>
                  )}
                  {canManage && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setDeletingSession(session)}
                      title="Delete session"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full gap-1.5 text-xs text-muted-foreground"
                  onClick={() => setDetailSessionId(session.id)}
                >
                  <Layers className="size-3.5" />
                  View semesters
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SessionSemestersModal
        sessionId={detailSessionId}
        onClose={() => setDetailSessionId(null)}
      />

      <ConfirmDialog
        open={deletingSession !== null}
        onOpenChange={(open) => !open && setDeletingSession(null)}
        onConfirm={handleDeleteSession}
        title="Delete academic session?"
        description={
          deletingSession
            ? `This permanently deletes "${deletingSession.name}". It only succeeds if nothing else references it yet (semesters, offerings, admissions, fees, enrollments, etc.) — otherwise the server will refuse and name what's still attached.`
            : ""
        }
        confirmLabel={deleteSession.isPending ? "Deleting…" : "Delete"}
        variant="destructive"
      />
    </div>
  )
}

function SessionSemestersModal({
  sessionId,
  onClose,
}: {
  sessionId: number | null
  onClose: () => void
}) {
  const { data: session, isLoading } = useSessionDetail(sessionId)

  return (
    <Modal
      open={sessionId !== null}
      onClose={onClose}
      title={session ? `${session.name} — Semesters` : "Session"}
      subtitle={
        session
          ? [session.startDate, session.endDate].filter(Boolean).join(" → ") ||
            undefined
          : undefined
      }
      size="md"
    >
      {isLoading && !session ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : !session ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Couldn&apos;t load this session.
        </p>
      ) : session.semesters.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No semesters defined for this session yet.
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {session.semesters.map((sem) => (
            <li
              key={sem.id}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {sem.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[sem.startDate, sem.endDate].filter(Boolean).join(" → ") ||
                    "Dates not set"}
                </p>
              </div>
              {sem.isActive && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  <span className="size-1.5 rounded-full bg-primary" />
                  Active
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
