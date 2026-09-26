"use client"

import Link from "next/link"
import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowRight, Loader2, Lock, PlayCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { useSessionOptions } from "@/hooks/use-session-options"
import {
  SelectField,
  toId,
} from "@/modules/student-grades/_components/results/select-field"
import { NotAvailableNotice } from "@/modules/student-grades/_components/results/not-available-notice"
import { useSessionCloseReadiness } from "../hooks/use-progression"
import {
  useCreatePromotionRun,
  useLockSession,
} from "../hooks/use-progression-mutations"
import { useProgressionMajorProgram } from "../hooks/use-progression-major-program"
import { toProgressionApiError } from "../lib/errors"
import { PROGRESSION_PERMISSIONS as P } from "../lib/permissions"
import { dashboardBase } from "../lib/readiness-links"
import type { Readiness } from "../types"
import { MajorProgramSelect } from "./major-program-select"
import { ProgressionConfirmDialog } from "./progression-confirm-dialog"
import { ReadinessChecklist } from "./readiness-checklist"

// Screen 3 — session close readiness. Pick the session being closed and the
// session students move into; the backend reports blockers (each linking to
// the screen that fixes it). "Start promotion run" stays disabled until the
// server says `ready`, and the server re-checks on create (422
// READINESS_FAILED carries a fresh checklist, shown in place).
export function SessionCloseReadiness() {
  const router = useRouter()
  const base = dashboardBase(usePathname())
  const mp = useProgressionMajorProgram()
  const sessions = useSessionOptions({ majorProgramId: mp.majorProgramId })
  const [pickedSource, setPickedSource] = useState<number | null>(null)
  const [targetId, setTargetId] = useState<number | null>(null)
  const [lockOpen, setLockOpen] = useState(false)
  const [rejected, setRejected] = useState<Readiness | null>(null)

  const sourceId =
    mp.majorProgramId == null
      ? null
      : (pickedSource ??
        sessions.options.find((o) => o.session.isActive)?.session.id ??
        null)
  const effectiveTarget =
    targetId != null && targetId !== sourceId ? targetId : null

  const readiness = useSessionCloseReadiness(sourceId, effectiveTarget)
  const lock = useLockSession()
  const createRun = useCreatePromotionRun()

  const live = readiness.data?.available ? readiness.data.data : null
  // A 422 on create returns the checklist as the server saw it then.
  const shown = rejected ?? live
  const canStart =
    mp.majorProgramId != null &&
    sourceId != null &&
    effectiveTarget != null &&
    live?.ready === true &&
    rejected == null

  const sourceLabel = sessions.labelFor(sourceId) ?? "this session"
  const targetLabel = sessions.labelFor(effectiveTarget) ?? "the next session"

  const lockSession = async () => {
    if (sourceId == null) return
    try {
      await lock.mutateAsync(sourceId)
      toast.success(`${sourceLabel} is locked. Both semesters are frozen.`)
      setLockOpen(false)
      setRejected(null)
    } catch (error) {
      if (error instanceof Error)
        toast.error(toProgressionApiError(error).message)
    }
  }

  const startRun = async () => {
    if (
      !canStart ||
      mp.majorProgramId == null ||
      sourceId == null ||
      effectiveTarget == null
    )
      return
    try {
      const run = await createRun.mutateAsync({
        major_program_id: mp.majorProgramId,
        source_session_id: sourceId,
        target_session_id: effectiveTarget,
      })
      toast.success("Promotion run created. Building the preview…")
      router.push(`${base}/progression/runs/${run.id}`)
    } catch (error) {
      if (!(error instanceof Error)) return
      const e = toProgressionApiError(error)
      if (e.readiness) setRejected(e.readiness)
      toast.error(e.message)
    }
  }

  return (
    <PermissionGate
      require={[P.readinessView, P.sessionLock, P.runCreate]}
      mode="any"
      denyBehavior="screen"
    >
      <div className="space-y-5">
        <header>
          <h2 className="text-lg font-semibold text-foreground">
            Session close
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Check that a session is ready to close, lock it, then start the
            promotion run that moves students into the next session. Results
            decide promotion; unpaid fees only affect registration later.
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
            id="close-major-program"
            programs={mp.programs}
            value={mp.majorProgramId}
            onChange={(id) => {
              mp.setMajorProgramId(id)
              setPickedSource(null)
              setTargetId(null)
              setRejected(null)
            }}
            isLoading={mp.isLoading}
          />
          <SelectField
            id="close-source-session"
            label="Session being closed"
            value={sourceId ? String(sourceId) : ""}
            onChange={(v) => {
              setPickedSource(toId(v))
              setRejected(null)
            }}
            placeholder={sessions.isLoading ? "Loading…" : "Choose a session"}
            disabled={sessions.isLoading || mp.majorProgramId == null}
            options={sessions.options.map((o) => ({
              value: o.value,
              label: o.session.isActive ? `${o.label} (active)` : o.label,
            }))}
            className="w-full sm:max-w-xs"
          />
          <ArrowRight
            className="hidden size-4 shrink-0 self-center text-muted-foreground sm:mt-5 sm:block"
            aria-hidden
          />
          <SelectField
            id="close-target-session"
            label="Students move into"
            value={effectiveTarget ? String(effectiveTarget) : ""}
            onChange={(v) => {
              setTargetId(toId(v))
              setRejected(null)
            }}
            placeholder="Choose the next session"
            disabled={sourceId == null}
            options={sessions.options
              .filter((o) => o.session.id !== sourceId)
              .map((o) => ({ value: o.value, label: o.label }))}
            className="w-full sm:max-w-xs"
          />
        </div>

        {mp.majorProgramId == null && !mp.isLoading ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            Choose a major program to see its sessions.
          </p>
        ) : sourceId != null &&
          !sessions.isLoading &&
          sessions.options.every((o) => o.session.id === sourceId) ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            This major program has no other session for students to move into
            yet. Create the next session under{" "}
            <Link
              href={`${base}/academics/academic-year`}
              className="font-medium text-primary hover:underline"
            >
              Sessions
            </Link>{" "}
            first.
          </p>
        ) : sourceId == null || effectiveTarget == null ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            Choose the session being closed and the session students move into
            to see the readiness checklist.
          </p>
        ) : (
          <PermissionGate require={P.readinessView}>
            <section aria-labelledby="close-checklist" className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3
                  id="close-checklist"
                  className="text-sm font-semibold text-foreground"
                >
                  Readiness checklist
                </h3>
                {live && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRejected(null)
                      void readiness.refetch()
                    }}
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
              ) : shown ? (
                <>
                  {rejected && (
                    <p className="text-xs text-red-700 dark:text-red-300">
                      The server refused to start the run. This is the checklist
                      it reported:
                    </p>
                  )}
                  <ReadinessChecklist
                    readiness={shown}
                    readyLabel="start a promotion run"
                  />
                </>
              ) : (
                <NotAvailableNotice
                  title="The session close checklist isn't available on the server yet"
                  description="The server can't yet report whether this session is ready for promotion, so a promotion run can't be started. This checklist, and the Start promotion run button, will work automatically once the backend ships them."
                />
              )}
            </section>
          </PermissionGate>
        )}

        {sourceId != null && effectiveTarget != null && (
          <section
            aria-label="Session close actions"
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-xs text-muted-foreground">
              Lock <span className="font-medium">{sourceLabel}</span> first,
              then start the run into{" "}
              <span className="font-medium">{targetLabel}</span>. The run builds
              a preview you can review and adjust before anything is committed.
            </p>
            <div className="flex shrink-0 flex-wrap gap-2">
              <PermissionGate require={P.sessionLock}>
                <Button
                  variant="outline"
                  onClick={() => setLockOpen(true)}
                  disabled={lock.isPending}
                >
                  <Lock className="size-4" aria-hidden />
                  Lock session
                </Button>
              </PermissionGate>
              <PermissionGate require={P.runCreate}>
                <Button
                  onClick={() => void startRun()}
                  disabled={!canStart || createRun.isPending}
                  aria-describedby="start-run-hint"
                >
                  {createRun.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <PlayCircle className="size-4" aria-hidden />
                  )}
                  Start promotion run
                </Button>
              </PermissionGate>
            </div>
          </section>
        )}
        {sourceId != null && effectiveTarget != null && !canStart && (
          <p id="start-run-hint" className="text-xs text-muted-foreground">
            Start promotion run is available once the readiness checklist
            reports the session as ready.
          </p>
        )}

        <ProgressionConfirmDialog
          open={lockOpen}
          onOpenChange={setLockOpen}
          title={`Lock ${sourceLabel}?`}
          description={
            <p>
              Both semesters of this session will be locked and their grades
              frozen for every student in the major program. Promotion is
              decided from these frozen results.
            </p>
          }
          confirmLabel="Lock session"
          onConfirm={() => void lockSession()}
          pending={lock.isPending}
          blockers={(shown?.blockers ?? []).filter(
            (b) => b.code !== "SESSION_NOT_LOCKED"
          )}
          variant="destructive"
        />
      </div>
    </PermissionGate>
  )
}
