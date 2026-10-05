"use client"

import { Database, GraduationCap, HardDriveDownload, Info } from "lucide-react"
import { QueryErrorState } from "@/components/query-error-state"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useResetRun } from "../hooks/use-instance-reset"
import { parseResetError } from "../lib/reset-errors"
import type { RunDetail, RunStep } from "../types"
import {
  CountText,
  RunStatusBadge,
  StepStatusIcon,
  formatDateTime,
  runStatusLabel,
} from "./reset-badges"
import { ResetErrorAlert } from "./reset-error-alert"

function describeTarget(target: string): {
  kind: "table" | "moodle" | "other"
  name: string
} {
  const [prefix, ...rest] = target.split(":")
  const name = rest.join(":") || target
  if (prefix === "table") return { kind: "table", name }
  if (prefix === "moodle")
    return { kind: "moodle", name: `Moodle ${name.replace(/_/g, " ")}` }
  return { kind: "other", name: target }
}

function percent(run: RunDetail): number | null {
  if (run.totalRows === null || run.deletedRows === null) return null
  if (run.totalRows === 0) return run.status === "completed" ? 100 : 0
  return (run.deletedRows / run.totalRows) * 100
}

function announcement(run: RunDetail): string {
  const label = runStatusLabel(run.status)
  const current = run.steps.find((s) => s.status === "running")
  if (current)
    return `${label}: clearing ${describeTarget(current.target).name}.`
  return `Reset ${label.toLowerCase()}.`
}

function StepRow({
  step,
  labelFor,
}: {
  step: RunStep
  labelFor: (key: string) => string
}) {
  const t = describeTarget(step.target)
  const Icon = t.kind === "moodle" ? GraduationCap : Database
  return (
    <li
      className={cn(
        "grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 px-3 py-2 text-xs",
        step.status === "failed" && "bg-red-50/70 dark:bg-red-950/20"
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <Icon
          className="size-3.5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <span
          className={cn(
            "truncate text-foreground",
            t.kind === "table" && "font-mono"
          )}
        >
          {t.name}
        </span>
        <span className="truncate text-muted-foreground">
          · {labelFor(step.group)}
        </span>
      </div>
      <StepStatusIcon status={step.status} />
      <p className="text-muted-foreground">
        <CountText value={step.deleted} /> / <CountText value={step.total} />{" "}
        deleted
      </p>
      {/* Only a "failed" step is a failure. A "done" (or skipped) step may
          carry a note explaining something intentionally kept, e.g. a
          non-empty Moodle category. */}
      {step.error && (
        <p
          className={cn(
            "col-span-2",
            step.status === "failed"
              ? "text-red-700 dark:text-red-300"
              : "flex items-start gap-1 text-muted-foreground"
          )}
        >
          {step.status !== "failed" && (
            <Info className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          )}
          {step.status !== "failed" && <span className="sr-only">Note: </span>}
          {step.error}
        </p>
      )}
    </li>
  )
}

interface ResetRunProgressProps {
  runId: string
  labelFor: (key: string) => string
}

/** GET /runs/{id}, polled while queued/running; per-step progress. */
export function ResetRunProgress({ runId, labelFor }: ResetRunProgressProps) {
  const { run, isLoading, isError, error, refetch } = useResetRun(runId)

  if (isLoading)
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading run">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  if (isError && error && parseResetError(error).code === "RUN_NOT_FOUND")
    return <ResetErrorAlert error={parseResetError(error)} />
  if (isError || !run)
    return (
      <QueryErrorState
        error={error}
        subject="the reset run"
        onRetry={refetch}
      />
    )

  const pct = percent(run)
  const finished = run.status !== "queued" && run.status !== "running"
  const failedSteps = run.steps.filter((s) => s.status === "failed")
  const skippedSteps = run.steps.filter((s) => s.status === "skipped")

  return (
    <div className="space-y-4">
      {/* Polite live region: status changes and the step being cleared. */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement(run)}
      </p>

      <div className="space-y-2 rounded-xl border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <RunStatusBadge status={run.status} />
          <p className="text-xs text-muted-foreground">
            Started {formatDateTime(run.startedAt)}
            {run.startedBy ? ` by ${run.startedBy.name}` : ""}
            {run.finishedAt
              ? ` · finished ${formatDateTime(run.finishedAt)}`
              : ""}
          </p>
        </div>
        <Progress
          value={finished && pct === null ? 100 : pct}
          label="Rows deleted"
          indicatorClassName={cn(
            run.status === "failed" && "bg-red-600",
            run.status === "partially_failed" && "bg-amber-500"
          )}
        />
        <p className="text-sm text-foreground">
          <CountText value={run.deletedRows} /> of{" "}
          <CountText value={run.totalRows} /> rows deleted
        </p>
        <p className="text-xs text-muted-foreground">
          Groups: {run.resolvedGroups.map(labelFor).join(", ") || "—"}
        </p>
      </div>

      {finished && (
        <div
          role={run.status === "completed" ? "status" : "alert"}
          className={cn(
            "space-y-1.5 rounded-xl border px-4 py-3 text-sm",
            run.status === "completed"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"
              : run.status === "failed"
                ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100"
                : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
          )}
        >
          <p className="font-medium">
            {run.status === "completed"
              ? "Reset completed."
              : run.status === "failed"
                ? "Reset failed."
                : `Reset partially failed: ${failedSteps.length} step${failedSteps.length === 1 ? "" : "s"} failed.`}
          </p>
          {run.error && <p className="text-xs">{run.error}</p>}
          {skippedSteps.length > 0 && (
            <p className="text-xs">
              {skippedSteps.length} step
              {skippedSteps.length === 1 ? " was" : "s were"} skipped (for
              example Moodle being unreachable).
            </p>
          )}
          <p className="flex items-center gap-1.5 text-xs">
            <HardDriveDownload className="size-3.5" aria-hidden="true" />
            Backup taken before deleting:{" "}
            {run.backupRef ? (
              <span className="font-mono break-all">{run.backupRef}</span>
            ) : (
              <span>none recorded</span>
            )}
          </p>
        </div>
      )}

      {run.steps.length > 0 ? (
        <section aria-labelledby="run-steps-heading">
          <h3
            id="run-steps-heading"
            className="text-sm font-semibold text-foreground"
          >
            Steps
          </h3>
          <ol className="mt-2 max-h-72 divide-y divide-border overflow-auto rounded-lg border border-border">
            {run.steps.map((s, i) => (
              <StepRow key={`${s.target}-${i}`} step={s} labelFor={labelFor} />
            ))}
          </ol>
        </section>
      ) : (
        <p className="text-xs text-muted-foreground">
          {finished
            ? "No steps were recorded."
            : "Waiting for the job to start…"}
        </p>
      )}

      {!finished && (
        <p className="text-xs text-muted-foreground">
          You can close this window: the reset keeps running on the server and
          the page banner links back here.
        </p>
      )}
    </div>
  )
}
