"use client"

import { Eye } from "lucide-react"
import { QueryErrorState } from "@/components/query-error-state"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useResetGroups, useResetRuns } from "../hooks/use-instance-reset"
import { useInstanceResetUiStore } from "../store/instance-reset-ui.store"
import { CountText, RunStatusBadge, formatDateTime } from "./reset-badges"

/** GET /runs: every reset ever run on this instance (never cleared). */
export function RunHistoryTable() {
  const { runs, source, isLoading, isError, error, refetch } = useResetRuns()
  const { labelFor } = useResetGroups()
  const watchRun = useInstanceResetUiStore((s) => s.watchRun)

  return (
    <section aria-labelledby="run-history-heading" className="space-y-3">
      <div>
        <h2
          id="run-history-heading"
          className="text-lg font-semibold text-foreground"
        >
          Run history
        </h2>
        <p className="text-sm text-muted-foreground">
          Every reset is recorded here permanently, with the backup taken before
          it.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading runs">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : isError ? (
        <QueryErrorState
          error={error}
          subject="the run history"
          onRetry={refetch}
        />
      ) : runs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {source === "planned"
            ? "Run history appears here once the reset service is live."
            : "No resets have been run on this instance."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Instance reset runs, newest first
            </caption>
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Status
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Groups
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Rows deleted
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Run by
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  When
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Backup
                </th>
                <th scope="col" className="px-3 py-2">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => {
                const requested = new Set(r.requestedGroups)
                const cascaded = r.resolvedGroups.filter(
                  (g) => !requested.has(g)
                )
                return (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="px-3 py-2">
                      <RunStatusBadge status={r.status} />
                    </td>
                    <td className="max-w-xs px-3 py-2 text-xs">
                      <p className="text-foreground">
                        {r.requestedGroups.map(labelFor).join(", ") || "—"}
                      </p>
                      {cascaded.length > 0 && (
                        <p className="text-muted-foreground">
                          + {cascaded.map(labelFor).join(", ")}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-xs whitespace-nowrap">
                      <CountText value={r.deletedRows} /> /{" "}
                      <CountText value={r.totalRows} />
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {r.startedBy?.name ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">
                      {formatDateTime(r.startedAt)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs break-all">
                      {r.backupRef ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`View details of the run started ${formatDateTime(r.startedAt)}`}
                        onClick={() => watchRun(r.id)}
                      >
                        <Eye data-icon="inline-start" aria-hidden="true" />
                        Details
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
