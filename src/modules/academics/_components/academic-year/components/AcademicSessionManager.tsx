"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  useAcademicSessions,
  useCreateSession,
  useActivateSession,
} from "@/hooks/useAcademicSessions"
import { useSessionDetail } from "@/modules/timetable/hooks/useAcademicCalendar"
import Modal from "@/components/custom/Modal"
import { useAcademicSessionSetupStore } from "@/store/dashboard/academicSessionSetupStore"
import {
  academicSessionSchema,
  type AcademicSessionFormValues,
} from "@/schemas/school.schema"

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
import { EmptyState } from "./EmptyState"
import {
  CalendarDays,
  Plus,
  ArrowRight,
  Power,
  Loader2,
  Layers,
} from "lucide-react"

interface AcademicSessionManagerProps {
  canManage?: boolean
}

export function AcademicSessionManager({
  canManage = false,
}: AcademicSessionManagerProps) {
  const { data: sessions, isLoading } = useAcademicSessions()
  const createSession = useCreateSession()
  const activateSession = useActivateSession()

  const { setSelectedSession, setCurrentStep } = useAcademicSessionSetupStore()

  const [showForm, setShowForm] = useState(false)
  const [detailSessionId, setDetailSessionId] = useState<number | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AcademicSessionFormValues>({
    resolver: zodResolver(academicSessionSchema),
    defaultValues: { name: "", startDate: "", endDate: "", isActive: false },
  })

  const onSubmit = async (data: AcademicSessionFormValues) => {
    await createSession.mutateAsync(data)
    reset()
    setShowForm(false)
  }

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
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="size-4" data-icon="inline-start" />
            New Session
          </Button>
        )}
      </div>

      {/* Create Form - only if can manage */}
      {showForm && canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Create Academic Session</CardTitle>
            <CardDescription>
              e.g., 2024/2025 — September 2024 to August 2025
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
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit(onSubmit)}
                disabled={createSession.isPending}
              >
                {createSession.isPending && (
                  <Loader2
                    className="size-4 animate-spin"
                    data-icon="inline-start"
                  />
                )}
                Create Session
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
              <Button onClick={() => setShowForm(true)}>
                <Plus className="size-4" data-icon="inline-start" />
                Create First Session
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sessions?.map((session) => (
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
                <div className="flex items-center gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleSelect(session.id, session.name)}
                  >
                    Configure
                    <ArrowRight className="size-4" data-icon="inline-end" />
                  </Button>
                  {canManage && !session.isActive && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => activateSession.mutate(session.id)}
                      title="Activate session"
                    >
                      <Power className="size-4" />
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
