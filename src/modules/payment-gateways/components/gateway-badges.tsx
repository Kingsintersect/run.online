"use client"

import { CheckCircle2, CircleHelp, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { GatewayEnvironment, GatewayHealthStatus } from "../types"

const pill =
  "inline-flex h-5 items-center gap-1 rounded-full border px-2 text-[11px] font-semibold whitespace-nowrap"

export function EnvironmentBadge({ env }: { env: GatewayEnvironment }) {
  return (
    <span
      className={cn(
        pill,
        env === "LIVE"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
          : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300"
      )}
    >
      {env}
    </span>
  )
}

const HEALTH = {
  OK: {
    label: "Healthy",
    icon: CheckCircle2,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  FAILED: {
    label: "Failing",
    icon: XCircle,
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300",
  },
  UNKNOWN: {
    label: "Not checked",
    icon: CircleHelp,
    className: "border-border bg-muted text-muted-foreground",
  },
} as const

export function HealthBadge({
  status,
  title,
}: {
  status: GatewayHealthStatus
  title?: string
}) {
  const h = HEALTH[status]
  const Icon = h.icon
  return (
    <span className={cn(pill, h.className)} title={title}>
      <Icon className="size-3" aria-hidden="true" />
      {h.label}
    </span>
  )
}
