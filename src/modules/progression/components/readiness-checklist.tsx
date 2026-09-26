"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { readinessCodeLabel } from "../lib/outcome"
import { dashboardBase, readinessIssueLink } from "../lib/readiness-links"
import type { Readiness, ReadinessIssue } from "../types"

interface ReadinessChecklistProps {
  readiness: Readiness
  /** What "ready" unlocks, e.g. "start a promotion run". */
  readyLabel: string
  className?: string
}

// Renders a backend Readiness payload as-is: the frontend never decides
// readiness, it only lists what the server reported and where to fix it.
export function ReadinessChecklist({
  readiness,
  readyLabel,
  className,
}: ReadinessChecklistProps) {
  const base = dashboardBase(usePathname())
  const { ready, blockers, warnings } = readiness

  return (
    <section
      aria-label="Readiness checklist"
      className={cn("space-y-3", className)}
    >
      <div
        role="status"
        className={cn(
          "flex items-start gap-3 rounded-2xl border p-4",
          ready
            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
            : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
        )}
      >
        {ready ? (
          <CheckCircle2
            className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400"
            aria-hidden
          />
        ) : (
          <XCircle
            className="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-400"
            aria-hidden
          />
        )}
        <div>
          <p
            className={cn(
              "text-sm font-semibold",
              ready
                ? "text-emerald-800 dark:text-emerald-200"
                : "text-red-800 dark:text-red-200"
            )}
          >
            {ready
              ? `Ready — you can ${readyLabel}.`
              : `Not ready — ${blockers.length} blocker${blockers.length === 1 ? "" : "s"} to resolve before you can ${readyLabel}.`}
          </p>
          {warnings.length > 0 && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {warnings.length} warning{warnings.length === 1 ? "" : "s"} —
              these don&apos;t block, but check them first.
            </p>
          )}
        </div>
      </div>

      {blockers.length > 0 && (
        <IssueList
          title="Blockers"
          issues={blockers}
          tone="blocker"
          base={base}
        />
      )}
      {warnings.length > 0 && (
        <IssueList
          title="Warnings"
          issues={warnings}
          tone="warning"
          base={base}
        />
      )}
    </section>
  )
}

interface IssueListProps {
  title: string
  issues: ReadinessIssue[]
  tone: "blocker" | "warning"
  base: string
}

function IssueList({ title, issues, tone, base }: IssueListProps) {
  const Icon = tone === "blocker" ? CircleAlert : AlertTriangle
  return (
    <div className="rounded-2xl border border-border bg-card">
      <h3 className="border-b border-border px-4 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      <ul className="divide-y divide-border">
        {issues.map((issue, i) => {
          const link = readinessIssueLink(issue, base)
          return (
            <li
              key={`${issue.code}-${i}`}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-2.5">
                <Icon
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    tone === "blocker"
                      ? "text-red-600 dark:text-red-400"
                      : "text-amber-600 dark:text-amber-400"
                  )}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {issue.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {readinessCodeLabel(issue.code)}
                    {issue.count != null && (
                      <>
                        {" · "}
                        <span className="font-medium tabular-nums">
                          {issue.count.toLocaleString()}
                        </span>{" "}
                        affected
                      </>
                    )}
                  </p>
                </div>
              </div>
              {link && (
                <Link
                  href={link.href}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md text-xs font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                >
                  {link.label}
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
