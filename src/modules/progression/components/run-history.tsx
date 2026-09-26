"use client"

import { useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowRight, History } from "lucide-react"
import EmptyState from "@/components/custom/EmptyState"
import { MajorProgramFilterTabs } from "@/components/custom/MajorProgramFilterTabs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useMajorProgramScope } from "@/hooks/use-major-program-scope"
import { formatDateTime } from "@/lib/utils/date.utils"
import { cn } from "@/lib/utils"
import { NotAvailableNotice } from "@/modules/student-grades/_components/results/not-available-notice"
import { usePromotionRuns } from "../hooks/use-progression"
import { toProgressionApiError } from "../lib/errors"
import {
  OUTCOME_LABELS,
  OUTCOME_ORDER,
  RUN_STATUS_LABELS,
} from "../lib/outcome"
import { RunStatusSchema } from "../schemas"
import { RunStatusBadge } from "./outcome-badge"
import { RunPagination } from "./run-pagination"
import type { PromotionRun, RunStatus } from "../types"

const PER_PAGE = 20
const ANY = "any"

interface RunHistoryProps {
  /** Base route of the run workspace, e.g. "/admin/progression/runs". */
  runsBasePath: string
}

function CountsSummary({ run }: { run: PromotionRun }) {
  const total = Object.values(run.counts).reduce((a, b) => a + b, 0)
  const top = OUTCOME_ORDER.filter((o) => (run.counts[o] ?? 0) > 0).slice(0, 3)
  return (
    <div className="text-xs">
      <p className="font-medium text-foreground tabular-nums">
        {total.toLocaleString()} students
      </p>
      <p className="text-muted-foreground">
        {top
          .map(
            (o) =>
              `${OUTCOME_LABELS[o]} ${(run.counts[o] ?? 0).toLocaleString()}`
          )
          .join(" · ")}
      </p>
      {(run.exception_count > 0 || run.override_count > 0) && (
        <p className="text-muted-foreground">
          {run.exception_count.toLocaleString()} exceptions ·{" "}
          {run.override_count.toLocaleString()} overridden
        </p>
      )}
    </div>
  )
}

/**
 * Run history (screen 5): server-paginated runs for the major programs the
 * user works in, filterable by status, each linking to its workspace.
 */
export function RunHistory({ runsBasePath }: RunHistoryProps) {
  const { isMultiScoped, scopedPrograms } = useMajorProgramScope()
  // A single-scoped user always works in their one program; a multi-scoped
  // user picks one (or all within scope); unscoped users see every run.
  const [majorProgramId, setMajorProgramId] = useState<number | null>(null)
  const effectiveMajorProgramId =
    majorProgramId ??
    (!isMultiScoped && scopedPrograms.length === 1
      ? scopedPrograms[0].id
      : null)
  const [status, setStatus] = useState<RunStatus | undefined>(undefined)
  const [page, setPage] = useState(1)

  const runsQuery = usePromotionRuns({
    major_program_id: effectiveMajorProgramId ?? undefined,
    status,
    page,
    per_page: PER_PAGE,
  })

  const result = runsQuery.data?.available ? runsQuery.data.data : null
  const runs = result?.data ?? []

  const filters = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <MajorProgramFilterTabs
        value={majorProgramId}
        onChange={(id) => {
          setMajorProgramId(id)
          setPage(1)
        }}
      />
      <Select
        value={status ?? ANY}
        onValueChange={(v) => {
          const parsed = RunStatusSchema.safeParse(v)
          setStatus(parsed.success ? parsed.data : undefined)
          setPage(1)
        }}
      >
        <SelectTrigger aria-label="Run status" className="min-w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>All statuses</SelectItem>
          {RunStatusSchema.options.map((s) => (
            <SelectItem key={s} value={s}>
              {RUN_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <section aria-labelledby="run-history-heading" className="space-y-4">
      <div className="space-y-1">
        <h2
          id="run-history-heading"
          className="text-lg font-semibold text-foreground"
        >
          Promotion runs
        </h2>
        <p className="text-sm text-muted-foreground">
          Every end-of-session promotion run, newest first. Open a run to review
          its preview, override outcomes, commit or reverse it.
        </p>
      </div>
      {runsQuery.data && !runsQuery.data.available ? (
        <NotAvailableNotice
          title="Promotion run history isn't available yet"
          description="The server doesn't list promotion runs yet (GET /promotion-runs). It has been flagged for the backend team, and past and current runs will be listed here automatically once it ships."
        />
      ) : (
        filters
      )}

      {runsQuery.data &&
      !runsQuery.data.available ? null : runsQuery.isError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            {toProgressionApiError(runsQuery.error).message}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void runsQuery.refetch()}
          >
            Try again
          </Button>
        </div>
      ) : runsQuery.isPending ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading runs">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : runs.length === 0 ? (
        <EmptyState
          icon={History}
          title={status ? "No runs with this status" : "No promotion runs yet"}
          description="A run is started from the session close readiness screen once the session is ready."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table
            className={cn(
              "w-full min-w-[900px] border-collapse text-sm",
              runsQuery.isFetching && "opacity-70"
            )}
          >
            <caption className="sr-only">Promotion runs, newest first</caption>
            <thead className="bg-muted/50 dark:bg-muted/20">
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th scope="col" className="px-3 py-2 font-medium">
                  Run
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Sessions
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Status
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Counts
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Created
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Committed
                </th>
                <th scope="col" className="px-3 py-2">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr
                  key={run.id}
                  className="border-b border-border align-top last:border-0 hover:bg-muted/40 dark:hover:bg-muted/20"
                >
                  <td className="px-3 py-3">
                    <p className="font-medium text-foreground">#{run.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {run.major_program.name}
                    </p>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      {run.source_session.name}
                      <ArrowRight
                        className="size-3 text-muted-foreground"
                        aria-label="to"
                      />
                      {run.target_session.name}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <RunStatusBadge status={run.status} />
                    {run.status === "COMMITTED" && run.is_reversible && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Still reversible
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <CountsSummary run={run} />
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <p className="text-foreground">
                      {run.created_by?.name ?? "—"}
                    </p>
                    {run.created_at && (
                      <p className="text-muted-foreground">
                        {formatDateTime(run.created_at)}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <p className="text-foreground">
                      {run.committed_by?.name ?? "—"}
                    </p>
                    {run.committed_at && (
                      <p className="text-muted-foreground">
                        {formatDateTime(run.committed_at)}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href={`${runsBasePath}/${run.id}`}
                        aria-label={`Open run #${run.id}, ${run.source_session.name} to ${run.target_session.name}`}
                      >
                        Open
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result && result.meta.total > 0 && (
        <RunPagination
          meta={result.meta}
          noun="runs"
          onPageChange={setPage}
          disabled={runsQuery.isFetching}
        />
      )}
    </section>
  )
}
