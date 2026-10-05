"use client"

import {
  CheckCircle2,
  Circle,
  CircleSlash,
  Clock,
  Loader2,
  XCircle,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { RunStatus, RunStepStatus } from "../types"

/** A row/entity count, or "—" when the server hasn't given one. */
export function CountText({
  value,
  className,
}: {
  value: number | null
  className?: string
}) {
  if (value === null)
    return (
      <span className={cn("text-muted-foreground", className)}>
        <span aria-hidden="true">—</span>
        <span className="sr-only">count not available</span>
      </span>
    )
  return (
    <span className={cn("tabular-nums", className)}>
      {value.toLocaleString()}
    </span>
  )
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
}

const RUN_STATUS: Record<
  RunStatus,
  { label: string; className: string; icon: typeof Circle }
> = {
  queued: {
    label: "Queued",
    icon: Clock,
    className:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  },
  running: {
    label: "Running",
    icon: Loader2,
    className: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  },
  partially_failed: {
    label: "Partially failed",
    icon: AlertTriangle,
    className:
      "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  },
}

export function runStatusLabel(status: RunStatus): string {
  return RUN_STATUS[status].label
}

export function RunStatusBadge({ status }: { status: RunStatus }) {
  const s = RUN_STATUS[status]
  const Icon = s.icon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        s.className
      )}
    >
      <Icon
        className={cn("size-3", status === "running" && "animate-spin")}
        aria-hidden="true"
      />
      {s.label}
    </span>
  )
}

const STEP_STATUS: Record<
  RunStepStatus,
  { label: string; className: string; icon: typeof Circle }
> = {
  pending: {
    label: "Pending",
    icon: Circle,
    className: "text-muted-foreground",
  },
  running: {
    label: "Running",
    icon: Loader2,
    className: "text-sky-600 dark:text-sky-400",
  },
  done: {
    label: "Done",
    icon: CheckCircle2,
    className: "text-emerald-600 dark:text-emerald-400",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    className: "text-red-600 dark:text-red-400",
  },
  skipped: {
    label: "Skipped",
    icon: CircleSlash,
    className: "text-amber-600 dark:text-amber-400",
  },
}

export function StepStatusIcon({ status }: { status: RunStepStatus }) {
  const s = STEP_STATUS[status]
  const Icon = s.icon
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", s.className)}>
      <Icon
        className={cn("size-4", status === "running" && "animate-spin")}
        aria-hidden="true"
      />
      <span>{s.label}</span>
    </span>
  )
}

/** The visible reason a destructive control is disabled. */
export function BlockedReason({
  id,
  reason,
  className,
}: {
  id: string
  reason: string | null
  className?: string
}) {
  if (!reason) return null
  return (
    <p
      id={id}
      className={cn("text-xs text-amber-800 dark:text-amber-300", className)}
    >
      {reason}
    </p>
  )
}
