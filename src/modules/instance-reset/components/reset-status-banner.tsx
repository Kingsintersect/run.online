"use client"

import {
  Activity,
  Clock,
  Lock,
  PowerOff,
  ShieldCheck,
  Unplug,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { QueryErrorNotice } from "@/components/query-error-state"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useResetGroups, useResetStatus } from "../hooks/use-instance-reset"
import { useInstanceResetUiStore } from "../store/instance-reset-ui.store"
import { formatDateTime } from "./reset-badges"

type Tone = "info" | "warning" | "danger" | "neutral" | "ok"

const TONE: Record<Tone, string> = {
  info: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100",
  warning:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100",
  danger:
    "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100",
  neutral: "border-border bg-muted/40 text-foreground dark:bg-muted/20",
  ok: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100",
}

function Notice({
  tone,
  icon: Icon,
  title,
  children,
  action,
}: {
  tone: Tone
  icon: typeof Lock
  title: string
  children?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-start gap-3 rounded-xl border px-4 py-3 text-sm",
        TONE[tone]
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        {children && (
          <div className="mt-0.5 text-xs opacity-90">{children}</div>
        )}
      </div>
      {action}
    </div>
  )
}

/**
 * GET /status as a stack of notices: not built yet (planned), switched off,
 * locked (live), a run in progress, Moodle not configured/unreachable.
 */
export function ResetStatusBanner() {
  const statusQ = useResetStatus()
  const groupsQ = useResetGroups()
  const watchRun = useInstanceResetUiStore((s) => s.watchRun)

  if (statusQ.isLoading)
    return (
      <div aria-busy="true" aria-label="Loading reset status">
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    )

  if (statusQ.isError)
    return (
      <QueryErrorNotice
        error={statusQ.error}
        subject="the reset status"
        onRetry={statusQ.refetch}
      />
    )

  const { status } = statusQ
  if (statusQ.source === "planned" || groupsQ.source === "planned" || !status)
    return (
      <Notice
        tone="info"
        icon={Clock}
        title="The reset service isn't available on the server yet"
      >
        The groups below are the planned design, shown without row counts. Every
        clear and lock action stays disabled until the backend ships the reset
        service; nothing here can delete data yet.
      </Notice>
    )

  const notices: React.ReactNode[] = []

  if (status.locked)
    notices.push(
      <Notice
        key="locked"
        tone="neutral"
        icon={Lock}
        title="This instance is live: reset is permanently disabled"
      >
        Marked as live on {formatDateTime(status.lockedAt)}
        {status.lockedBy ? ` by ${status.lockedBy.name}` : ""}.
      </Notice>
    )

  if (!status.enabled)
    notices.push(
      <Notice
        key="disabled"
        tone="warning"
        icon={PowerOff}
        title="Reset is switched off on this server"
      >
        The INSTANCE_RESET_ENABLED flag isn&apos;t set to true, so this screen
        is read-only. A server administrator has to turn it on before anything
        can be cleared or locked.
      </Notice>
    )

  const active = status.activeRun
  if (active && (active.status === "queued" || active.status === "running"))
    notices.push(
      <Notice
        key="active"
        tone="info"
        icon={Activity}
        title={`A reset is ${active.status === "queued" ? "queued" : "running"}`}
        action={
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => watchRun(active.id)}
          >
            View progress
          </Button>
        }
      >
        Other reset and lock actions are off until it finishes.
      </Notice>
    )

  if (!status.moodle.configured)
    notices.push(
      <Notice
        key="moodle-off"
        tone="warning"
        icon={Unplug}
        title="Moodle isn't configured"
      >
        Moodle steps will be skipped: portal-created Moodle categories, courses,
        users and enrolments won&apos;t be deleted, and the run report will list
        them as skipped.
      </Notice>
    )
  else if (status.moodle.reachable === false)
    notices.push(
      <Notice
        key="moodle-down"
        tone="warning"
        icon={Unplug}
        title="Moodle is unreachable"
      >
        {status.moodle.siteUrl ? `${status.moodle.siteUrl}: ` : ""}Moodle steps
        will be skipped and reported; portal data is still cleared.
      </Notice>
    )

  if (notices.length === 0)
    notices.push(
      <Notice
        key="ready"
        tone="ok"
        icon={ShieldCheck}
        title="Reset is enabled on this server"
      >
        Every clear needs a fresh preview, the institution name typed exactly
        and your password. The server takes a database backup first.
      </Notice>
    )

  return <div className="space-y-2">{notices}</div>
}
