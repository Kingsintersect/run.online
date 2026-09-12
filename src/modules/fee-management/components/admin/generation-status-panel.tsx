"use client"

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useGenerationStatus } from "../../hooks/use-fee-types"

interface GenerationStatusPanelProps {
  feeTypeId: number
  onRetry?: () => void
}

export function GenerationStatusPanel({
  feeTypeId,
  onRetry,
}: GenerationStatusPanelProps) {
  const { data, isLoading, error } = useGenerationStatus(feeTypeId, !!feeTypeId)

  if (isLoading) {
    return (
      <div className="space-y-3 rounded-xl border border-border p-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-2.5 w-full rounded-full" />
        <Skeleton className="h-3 w-24" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <AlertTriangle size={14} className="shrink-0" />
        Generation status unavailable. The job may not have started yet.
      </div>
    )
  }

  const percent =
    data.total > 0 ? Math.round((data.processed / data.total) * 100) : 0

  const statusIcon = {
    QUEUED: <Clock size={15} className="text-slate-500" />,
    RUNNING: <Loader2 size={15} className="animate-spin text-primary" />,
    DONE: (
      <CheckCircle2 size={15} className="text-green-600 dark:text-green-400" />
    ),
    FAILED: <AlertTriangle size={15} className="text-destructive" />,
  }[data.status]

  const statusLabel = {
    QUEUED: "Queued — waiting to start",
    RUNNING: "Running — generating invoices…",
    DONE: "Done",
    FAILED: "Failed",
  }[data.status]

  const isDone = data.status === "DONE"
  const isFailed = data.status === "FAILED"

  return (
    <div
      className={
        "space-y-3 rounded-xl border p-4 " +
        (isFailed
          ? "border-destructive/40 bg-destructive/5"
          : isDone
            ? "border-green-200 bg-green-50/50 dark:border-green-900/40 dark:bg-green-900/10"
            : "border-border bg-muted/30")
      }
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          {statusIcon}
          Invoice Generation — {statusLabel}
        </div>
        {(isDone || isFailed) && onRetry && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={onRetry}
            title="Re-trigger generation (idempotent — skips already-created invoices)"
          >
            <RotateCcw size={12} />
            Re-run
          </Button>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={
              "h-full rounded-full transition-all duration-500 " +
              (isFailed
                ? "bg-destructive"
                : isDone
                  ? "bg-green-500"
                  : "bg-primary")
            }
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {data.processed.toLocaleString("en-NG")} /{" "}
          {data.total.toLocaleString("en-NG")} invoices
          {data.total > 0 && ` (${percent}%)`}
        </p>
      </div>

      {/* Failure count */}
      {data.failures > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <span>
            <strong>{data.failures.toLocaleString("en-NG")}</strong> invoice
            {data.failures !== 1 ? "s" : ""} failed to generate. Re-running
            activation is safe — already-created invoices will be skipped.
          </span>
        </div>
      )}
    </div>
  )
}
