import { ArrowRight } from "lucide-react"
import { AuditTrailLink } from "@/components/audit-trail-link"
import { Progress } from "@/components/ui/progress"
import { formatDateTime } from "@/lib/utils/date.utils"
import { isRunActive, RUN_STATUS_LABELS } from "../lib/outcome"
import { RunStatusBadge } from "./outcome-badge"
import type { IdName, PromotionRun } from "../types"

function Actor({
  label,
  by,
  at,
}: {
  label: string
  by: IdName | null
  at: string | null
}) {
  if (!by && !at) return null
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-medium text-foreground">
        {by?.name ?? "—"}
        {at && (
          <span className="ml-1.5 font-normal text-muted-foreground">
            {formatDateTime(at)}
          </span>
        )}
      </dd>
    </div>
  )
}

/** Source → target, status and who did what, for one promotion run. */
export function RunHeader({ run }: { run: PromotionRun }) {
  return (
    <header className="space-y-4 rounded-2xl border border-border bg-card p-5 dark:bg-card/60">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Promotion run #{run.id} · {run.major_program.name}
          </p>
          <h1 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-foreground">
            <span>{run.source_session.name}</span>
            <ArrowRight
              className="size-4 text-muted-foreground"
              aria-label="to"
            />
            <span>{run.target_session.name}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <AuditTrailLink entityType="PromotionRun" entityId={run.id} />
          <RunStatusBadge status={run.status} />
        </div>
      </div>

      <dl className="grid gap-3 sm:grid-cols-3">
        <Actor label="Created by" by={run.created_by} at={run.created_at} />
        <Actor
          label="Committed by"
          by={run.committed_by}
          at={run.committed_at}
        />
        <Actor label="Reversed by" by={run.reversed_by} at={run.reversed_at} />
      </dl>

      {run.reverse_reason && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <span className="font-semibold">Reversal reason:</span>{" "}
          {run.reverse_reason}
        </p>
      )}

      {run.status === "FAILED" && run.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          <span className="font-semibold">The job failed:</span> {run.error}
        </p>
      )}

      {isRunActive(run.status) && <RunProgress run={run} />}
    </header>
  )
}

/** Progress while the preview or commit job runs (the query polls). */
function RunProgress({ run }: { run: PromotionRun }) {
  const p = run.progress
  const percent =
    p && p.total > 0 ? Math.round((p.processed / p.total) * 100) : null
  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{RUN_STATUS_LABELS[run.status]}…</span>
        {p && p.total > 0 ? (
          <span className="tabular-nums">
            {p.processed.toLocaleString()} of {p.total.toLocaleString()}{" "}
            students ({percent}%)
          </span>
        ) : (
          <span>Waiting for the job to start</span>
        )}
      </div>
      <Progress
        value={percent}
        label={`${RUN_STATUS_LABELS[run.status]} progress`}
      />
      <p className="text-xs text-muted-foreground">
        This page updates automatically. You can leave and come back — the job
        keeps running on the server.
      </p>
    </div>
  )
}
