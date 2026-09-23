"use client"

import { Loader2, RefreshCw, Lock, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useScheduledJobs } from "@/hooks/useConfiguration"

export function ScheduledJobsPanel() {
  const { data, isLoading, isError, refetch, isFetching } = useScheduledJobs()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Every command registered in the backend&apos;s cron schedule, and when
          it will next run.
          {data && ` Timezone: ${data.timezone}.`}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-1.5"
        >
          <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          <AlertTriangle size={20} className="opacity-50" />
          Couldn&apos;t load the schedule — this endpoint is super-admin only.
        </div>
      ) : !data || data.jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          No jobs registered.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                <th className="px-4 py-2.5 font-medium">Command</th>
                <th className="px-4 py-2.5 font-medium">Schedule</th>
                <th className="px-4 py-2.5 font-medium">Next Run</th>
                <th className="px-4 py-2.5 font-medium">Overlap Guard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.jobs.map((job, i) => (
                <tr key={i} className="align-top">
                  <td className="max-w-xs px-4 py-3">
                    <p className="truncate font-medium text-foreground">
                      {job.description ?? job.command}
                    </p>
                    {job.description && (
                      <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                        {job.command}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {job.cronExpression}
                    </code>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {job.nextRunHuman}
                  </td>
                  <td className="px-4 py-3">
                    {job.withoutOverlapping ? (
                      <Badge
                        variant="outline"
                        className="gap-1 text-emerald-600 dark:text-emerald-400"
                      >
                        <Lock size={10} data-icon="inline-start" />
                        Guarded
                      </Badge>
                    ) : (
                      <Badge variant="secondary">None</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
