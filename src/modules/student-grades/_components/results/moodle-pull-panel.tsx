"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CloudDownload, Loader2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { PullRequestSchema } from "../../schemas"
import { isTerminalPull, usePullJob } from "../../hooks/use-results"
import { useStartPull } from "../../hooks/use-results-mutations"
import { toResultsApiError } from "../../lib/results-errors"
import { NotAvailableNotice } from "./not-available-notice"

interface MoodlePullPanelProps {
  semesterId: number | null
  selectedOfferingIds: number[]
  onStarted?: () => void
}

const STATUS_LABEL = {
  QUEUED: "Queued",
  RUNNING: "Pulling from Moodle…",
  COMPLETED: "Completed",
  FAILED: "Failed",
  PARTIAL: "Completed with errors",
} as const

// "Pull from Moodle" (gate results.sync at the call site). Starts a job
// (202 {jobId}) then polls it every 3 s until terminal (usePullJob), showing
// progress and per-offering errors.
export function MoodlePullPanel({
  semesterId,
  selectedOfferingIds,
  onStarted,
}: MoodlePullPanelProps) {
  const [jobId, setJobId] = useState<number | null>(null)
  const [notAvailable, setNotAvailable] = useState(false)
  const startPull = useStartPull()
  const job = usePullJob(jobId)
  const jobData = job.data?.available ? job.data.data : null
  const running = jobData != null && !isTerminalPull(jobData.status)

  const start = async () => {
    const body = PullRequestSchema.safeParse({
      semesterId: semesterId ?? undefined,
      courseOfferingIds: selectedOfferingIds.length
        ? selectedOfferingIds
        : undefined,
    })
    if (!body.success) {
      toast.error("Choose a semester to pull.")
      return
    }
    try {
      const res = await startPull.mutateAsync(body.data)
      setJobId(res.jobId)
      setNotAvailable(false)
      onStarted?.()
      toast.success(
        `Pull started for ${res.offeringsQueued} course offering${res.offeringsQueued === 1 ? "" : "s"}.`
      )
    } catch (error) {
      if (!(error instanceof Error)) return
      const e = toResultsApiError(error)
      if (e.notAvailable) setNotAvailable(true)
      else toast.error(e.message)
    }
  }

  const pct =
    jobData && jobData.offeringsTotal > 0
      ? Math.round((jobData.offeringsDone / jobData.offeringsTotal) * 100)
      : 0

  return (
    <section
      aria-labelledby="moodle-pull-heading"
      className="space-y-3 rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3
            id="moodle-pull-heading"
            className="text-sm font-semibold text-foreground"
          >
            Pull marks from Moodle
          </h3>
          <p className="text-xs text-muted-foreground">
            {selectedOfferingIds.length > 0
              ? `${selectedOfferingIds.length} selected offering${selectedOfferingIds.length === 1 ? "" : "s"} in the chosen semester.`
              : semesterId
                ? "Every offering in the chosen semester (select rows below to narrow it)."
                : "Choose a semester in the filters first."}
          </p>
        </div>
        <Button
          onClick={start}
          disabled={!semesterId || startPull.isPending || running}
        >
          {startPull.isPending || running ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <CloudDownload className="size-4" aria-hidden />
          )}
          Pull from Moodle
        </Button>
      </div>

      {notAvailable && (
        <NotAvailableNotice title="Moodle pull isn't available on the server yet" />
      )}

      {jobData && (
        <div className="space-y-2" aria-live="polite">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">
              {STATUS_LABEL[jobData.status]}
            </span>
            <span className="text-muted-foreground tabular-nums">
              {jobData.offeringsDone} / {jobData.offeringsTotal} offerings
            </span>
          </div>
          <Progress value={pct} label="Moodle pull progress" />
          <p className="text-xs text-muted-foreground">
            {jobData.rowsCreated} rows created · {jobData.rowsUpdated} updated
          </p>
          {jobData.errors.length > 0 && (
            <ul className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/5 p-2">
              {jobData.errors.map((err) => (
                <li
                  key={`${err.offeringId}-${err.message}`}
                  className="flex items-start gap-1.5 text-xs text-destructive"
                >
                  <XCircle className="mt-0.5 size-3 shrink-0" aria-hidden />
                  <span>
                    Offering #{err.offeringId}: {err.message}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
