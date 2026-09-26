"use client"

import { Suspense } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { NotAvailableNotice } from "@/modules/student-grades/_components/results/not-available-notice"
import { usePromotionRun } from "../hooks/use-progression"
import { isRecordNotFound, toProgressionApiError } from "../lib/errors"
import { RunActions } from "./run-actions"
import { RunHeader } from "./run-header"
import { RunItemsPanel } from "./run-items-panel"

interface RunWorkspaceProps {
  runId: number
  /** Run history route for this dashboard, e.g. "/admin/progression/runs". */
  historyHref: string
}

/**
 * Promotion run workspace (screen 4): header + progress (polled while the
 * job runs), actions, summary cards and the server-paginated items table.
 */
export function RunWorkspace({ runId, historyHref }: RunWorkspaceProps) {
  const runQuery = usePromotionRun(runId > 0 ? runId : null)

  const back = (
    <Button variant="ghost" size="sm" asChild>
      <Link href={historyHref}>
        <ArrowLeft data-icon="inline-start" />
        All promotion runs
      </Link>
    </Button>
  )

  let body: React.ReactNode
  if (runId <= 0 || (runQuery.error && isRecordNotFound(runQuery.error))) {
    body = (
      <div
        role="alert"
        className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground dark:bg-card/60"
      >
        This promotion run doesn&apos;t exist, or it&apos;s outside the major
        programs you work in.
      </div>
    )
  } else if (runQuery.isPending) {
    body = (
      <div className="space-y-4" aria-busy="true" aria-label="Loading run">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  } else if (runQuery.isError) {
    body = (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
      >
        <span className="flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          {toProgressionApiError(runQuery.error).message}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void runQuery.refetch()}
        >
          Try again
        </Button>
      </div>
    )
  } else if (!runQuery.data.available) {
    body = (
      <NotAvailableNotice
        title="Promotion runs aren't available yet"
        description="The server doesn't provide promotion runs yet (GET /promotion-runs/{id}). This workspace has been built against the agreed contract and has been flagged for the backend team — it will work here automatically once the endpoint ships. No outcomes are shown until then."
      />
    )
  } else {
    const run = runQuery.data.data
    body = (
      <div className="space-y-5">
        <RunHeader run={run} />
        <RunActions run={run} />
        {/* The items panel reads its filters from the URL. */}
        <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
          <RunItemsPanel run={run} />
        </Suspense>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {back}
      {body}
    </div>
  )
}
