"use client"

import { useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { toast } from "sonner"
import { Lock, PlayCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { useSessionOptions } from "@/hooks/use-session-options"
import { useSemesters } from "@/hooks/useSemesters"
import {
  SelectField,
  toId,
} from "@/modules/student-grades/_components/results/select-field"
import { NotAvailableNotice } from "@/modules/student-grades/_components/results/not-available-notice"
import { useSemesterRolloverReadiness } from "../hooks/use-progression"
import {
  useActivateSemester,
  useLockSemester,
} from "../hooks/use-progression-mutations"
import { useProgressionMajorProgram } from "../hooks/use-progression-major-program"
import { toProgressionApiError } from "../lib/errors"
import { PROGRESSION_PERMISSIONS as P } from "../lib/permissions"
import { dashboardBase } from "../lib/readiness-links"
import { MajorProgramSelect } from "./major-program-select"
import { ProgressionConfirmDialog } from "./progression-confirm-dialog"
import { ReadinessChecklist } from "./readiness-checklist"

type PendingAction = "lock" | "activate" | null

// Screen 2 — semester rollover: readiness checklist for a semester, then
// Lock semester, then Activate next semester. The backend enforces
// readiness; these actions stay available (with blockers repeated in the
// confirmation) rather than being hidden by a frontend-side lock.
export function SemesterRollover() {
  const base = dashboardBase(usePathname())
  const mp = useProgressionMajorProgram()
  const sessions = useSessionOptions({ majorProgramId: mp.majorProgramId })
  const [pickedSession, setPickedSession] = useState<number | null>(null)
  const [pickedSemester, setPickedSemester] = useState<number | null>(null)
  const [pickedNext, setPickedNext] = useState<number | null>(null)
  const [dialog, setDialog] = useState<PendingAction>(null)

  // Default to the active session, then the active semester within it.
  const sessionId =
    mp.majorProgramId == null
      ? null
      : (pickedSession ??
        sessions.options.find((o) => o.session.isActive)?.session.id ??
        null)
  const semestersQuery = useSemesters(sessionId)
  const semesters = useMemo(
    () => semestersQuery.data ?? [],
    [semestersQuery.data]
  )
  const semesterId =
    pickedSemester != null && semesters.some((s) => s.id === pickedSemester)
      ? pickedSemester
      : (semesters.find((s) => s.isActive)?.id ?? null)
  const semester = semesters.find((s) => s.id === semesterId) ?? null

  // Next semester: the admin's pick, else the one listed after this one.
  // An already-active semester can't be "activated next", so it's never offered.
  const nextOptions = semesters.filter(
    (s) => s.id !== semesterId && !s.isActive
  )
  const alreadyActive = semesters.find((s) => s.id !== semesterId && s.isActive)
  const index = semesters.findIndex((s) => s.id === semesterId)
  const nextId =
    pickedNext != null && nextOptions.some((s) => s.id === pickedNext)
      ? pickedNext
      : index >= 0
        ? (nextOptions.find((s) => s.id === semesters[index + 1]?.id)?.id ??
          null)
        : null
  const nextSemester = semesters.find((s) => s.id === nextId) ?? null

  const readiness = useSemesterRolloverReadiness(semesterId)
  const lock = useLockSemester()
  const activate = useActivateSemester()
  const liveReadiness = readiness.data?.available ? readiness.data.data : null
  const blockers = liveReadiness?.blockers ?? []

  const run = async (action: "lock" | "activate") => {
    const id = action === "lock" ? semesterId : nextId
    if (id == null) return
    try {
      if (action === "lock") await lock.mutateAsync(id)
      else await activate.mutateAsync(id)
      toast.success(
        action === "lock"
          ? `${semester?.name ?? "Semester"} is locked. Its grades are now frozen.`
          : `${nextSemester?.name ?? "The next semester"} is now the active semester.`
      )
      setDialog(null)
    } catch (error) {
      if (error instanceof Error)
        toast.error(toProgressionApiError(error).message)
    }
  }

  return (
    <PermissionGate
      require={[P.readinessView, P.sessionLock]}
      mode="any"
      denyBehavior="screen"
    >
      <div className="space-y-5">
        <header>
          <h2 className="text-lg font-semibold text-foreground">
            Semester rollover
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Check that a semester can be closed, lock it to freeze its grades,
            then activate the next semester.
            {mp.majorProgramName && (
              <>
                {" "}
                Working in{" "}
                <span className="font-medium text-foreground">
                  {mp.majorProgramName}
                </span>
                .
              </>
            )}
          </p>
        </header>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <MajorProgramSelect
            id="rollover-major-program"
            programs={mp.programs}
            value={mp.majorProgramId}
            onChange={(id) => {
              mp.setMajorProgramId(id)
              setPickedSession(null)
              setPickedSemester(null)
              setPickedNext(null)
            }}
            isLoading={mp.isLoading}
          />
          <SelectField
            id="rollover-session"
            label="Academic session"
            value={sessionId ? String(sessionId) : ""}
            onChange={(v) => {
              setPickedSession(toId(v))
              setPickedSemester(null)
              setPickedNext(null)
            }}
            placeholder={sessions.isLoading ? "Loading…" : "Choose a session"}
            disabled={sessions.isLoading || mp.majorProgramId == null}
            options={sessions.options.map((o) => ({
              value: o.value,
              label: o.session.isActive ? `${o.label} (active)` : o.label,
            }))}
            className="w-full sm:max-w-xs"
          />
          <SelectField
            id="rollover-semester"
            label="Semester to close"
            value={semesterId ? String(semesterId) : ""}
            onChange={(v) => {
              setPickedSemester(toId(v))
              setPickedNext(null)
            }}
            placeholder={
              semestersQuery.isLoading ? "Loading…" : "Choose a semester"
            }
            disabled={sessionId == null || semestersQuery.isLoading}
            options={semesters.map((s) => ({
              value: String(s.id),
              label: s.isActive ? `${s.name} (active)` : s.name,
            }))}
            className="w-full sm:max-w-[14rem]"
          />
        </div>

        {mp.majorProgramId == null && !mp.isLoading ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            Choose a major program to see its semesters.
          </p>
        ) : semesterId == null ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            {semestersQuery.isError ? (
              "Semesters couldn't be loaded. Refresh to try again."
            ) : sessionId != null &&
              !semestersQuery.isLoading &&
              semesters.length === 0 ? (
              <>
                This session has no semesters yet. Add them under{" "}
                <Link
                  href={`${base}/academics/academic-year`}
                  className="font-medium text-primary hover:underline"
                >
                  Sessions
                </Link>{" "}
                first.
              </>
            ) : (
              "Choose a session and the semester you want to close."
            )}
          </p>
        ) : (
          <>
            <PermissionGate require={P.readinessView}>
              <section
                aria-labelledby="rollover-checklist"
                className="space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3
                    id="rollover-checklist"
                    className="text-sm font-semibold text-foreground"
                  >
                    Step 1 · Readiness checklist
                  </h3>
                  {liveReadiness && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void readiness.refetch()}
                      disabled={readiness.isFetching}
                    >
                      <RefreshCw
                        className={
                          readiness.isFetching
                            ? "size-3.5 animate-spin"
                            : "size-3.5"
                        }
                        aria-hidden
                      />
                      Re-check
                    </Button>
                  )}
                </div>
                {readiness.isLoading ? (
                  <div
                    className="h-28 animate-pulse rounded-2xl bg-muted/40"
                    aria-busy
                    aria-label="Checking readiness"
                  />
                ) : readiness.isError ? (
                  <p role="alert" className="text-sm text-destructive">
                    {toProgressionApiError(readiness.error).message}
                  </p>
                ) : liveReadiness ? (
                  <ReadinessChecklist
                    readiness={liveReadiness}
                    readyLabel="close this semester and activate the next"
                  />
                ) : (
                  <NotAvailableNotice
                    title="The semester rollover checklist isn't available on the server yet"
                    description="The server can't yet report whether this semester is ready to close (unapproved result sheets, pending adjustments, unpublished results). Check those screens by hand before locking. This checklist will appear here automatically once the backend ships it."
                  />
                )}
              </section>
            </PermissionGate>

            <PermissionGate require={P.sessionLock}>
              <section
                aria-label="Rollover actions"
                className="grid gap-3 md:grid-cols-2"
              >
                <ActionCard
                  step="Step 2 · Lock semester"
                  body={`Freezes grades for ${semester?.name ?? "this semester"}. Result sheets can no longer be changed once it's locked.`}
                >
                  <Button
                    variant="outline"
                    onClick={() => setDialog("lock")}
                    disabled={lock.isPending}
                  >
                    <Lock className="size-4" aria-hidden />
                    Lock semester
                  </Button>
                </ActionCard>
                <ActionCard
                  step="Step 3 · Activate next semester"
                  body={
                    nextOptions.length === 0
                      ? alreadyActive
                        ? `${alreadyActive.name} is already the active semester, so there is nothing to activate.`
                        : "This session has no other semester."
                      : "Makes the chosen semester the active one and deactivates the previous one in this major program."
                  }
                >
                  {nextOptions.length > 0 ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <SelectField
                        id="rollover-next-semester"
                        label="Next semester"
                        value={nextId ? String(nextId) : ""}
                        onChange={(v) => setPickedNext(toId(v))}
                        placeholder="Choose a semester"
                        options={nextOptions.map((s) => ({
                          value: String(s.id),
                          label: s.isActive ? `${s.name} (active)` : s.name,
                        }))}
                        className="w-full sm:max-w-[12rem]"
                      />
                      <Button
                        onClick={() => setDialog("activate")}
                        disabled={nextId == null || activate.isPending}
                      >
                        <PlayCircle className="size-4" aria-hidden />
                        Activate next semester
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Moving to a new session is done from{" "}
                      <Link
                        href={`${base}/progression/session-close`}
                        className="font-medium text-primary hover:underline"
                      >
                        Session close
                      </Link>
                      .
                    </p>
                  )}
                </ActionCard>
              </section>
            </PermissionGate>
          </>
        )}

        <ProgressionConfirmDialog
          open={dialog === "lock"}
          onOpenChange={(open) => setDialog(open ? "lock" : null)}
          title={`Lock ${semester?.name ?? "this semester"}?`}
          description={
            <p>
              Grades for this semester will be frozen for every student in the
              major program. Make sure all result sheets are approved first.
            </p>
          }
          confirmLabel="Lock semester"
          onConfirm={() => void run("lock")}
          pending={lock.isPending}
          blockers={blockers}
          variant="destructive"
        />
        <ProgressionConfirmDialog
          open={dialog === "activate"}
          onOpenChange={(open) => setDialog(open ? "activate" : null)}
          title={`Activate ${nextSemester?.name ?? "the next semester"}?`}
          description={
            <p>
              {nextSemester?.name ?? "The chosen semester"} becomes the active
              semester and {semester?.name ?? "the current one"} is deactivated.
              Students will register and be graded against the new semester from
              now on.
            </p>
          }
          confirmLabel="Activate semester"
          onConfirm={() => void run("activate")}
          pending={activate.isPending}
          blockers={blockers}
        />
      </div>
    </PermissionGate>
  )
}

function ActionCard({
  step,
  body,
  children,
}: {
  step: string
  body: string
  children: ReactNode
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{step}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
      </div>
      {children}
    </div>
  )
}
