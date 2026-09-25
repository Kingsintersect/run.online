"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { CloudDownload, Loader2, X, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { PullRequestSchema } from "../../schemas"
import {
  isTerminalPull,
  usePullJob,
  usePullJobs,
} from "../../hooks/use-results"
import { useStartPull } from "../../hooks/use-results-mutations"
import { toResultsApiError } from "../../lib/results-errors"
import { NotAvailableNotice } from "./not-available-notice"

interface MoodlePullPanelProps {
  semesterId: number | null
  selectedOfferingIds: number[]
  /**
   * Newest `lastPullJobId` among the sheets on screen (A45 CR2). Used as a
   * last resort to resume a pull someone else started; shown only while
   * that job is still running.
   */
  recentJobId?: number | null
  /**
   * DOM ids of the session and semester filters. When Pull is clicked with
   * no semester chosen, focus moves to whichever one still needs picking.
   */
  filterFieldIds?: { session: string; semester: string }
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
//
// Survives a page refresh: the job id lives in the URL (`?pullJob=<id>`) —
// UI state, not server data, so not in Zustand. With no URL job, the newest
// QUEUED/RUNNING job for the current semester is resumed from
// GET /results/moodle/pull-jobs; if that lookup fails (404, or a server that
// doesn't accept the comma status list) it degrades to URL-only.
// Uses useSearchParams, so render it inside <Suspense>.
export function MoodlePullPanel({
  semesterId,
  selectedOfferingIds,
  recentJobId = null,
  filterFieldIds,
  onStarted,
}: MoodlePullPanelProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const urlJobId = Number(searchParams.get("pullJob")) || null
  const [dismissedId, setDismissedId] = useState<number | null>(null)
  const [notAvailable, setNotAvailable] = useState(false)
  const [startedJobId, setStartedJobId] = useState<number | null>(null)
  // Set when Pull is clicked before a semester is chosen; cleared once one is.
  const [askedForSemester, setAskedForSemester] = useState(false)
  const needsSemester = askedForSemester && !semesterId
  const startPull = useStartPull()

  // Only looked up when the URL doesn't already name a job.
  const activeJobs = usePullJobs(
    {
      status: ["QUEUED", "RUNNING"],
      semesterId: semesterId ?? undefined,
      page: 1,
      limit: 1,
    },
    urlJobId == null
  )
  const resumedId = activeJobs.data?.available
    ? (activeJobs.data.data.data[0]?.id ?? null)
    : null
  const candidate = urlJobId ?? resumedId ?? recentJobId
  const fromRecentOnly = urlJobId == null && resumedId == null
  const jobId =
    candidate != null && candidate !== dismissedId ? candidate : null

  const setUrlJob = (id: number | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (id == null) params.delete("pullJob")
    else params.set("pullJob", String(id))
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  // Tells usePullJob this pull is ours, so it refreshes the sheets even if
  // the very first poll already comes back COMPLETED.
  const job = usePullJob(jobId, {
    startedHere: jobId != null && jobId === startedJobId,
  })
  const fetchedJob = job.data?.available ? job.data.data : null
  // A finished job found only via a sheet's lastPullJobId is history, not a
  // pull in progress — don't resurface it.
  const jobData =
    fetchedJob && fromRecentOnly && isTerminalPull(fetchedJob.status)
      ? null
      : fetchedJob

  // A URL job that no longer exists or isn't visible to this user (real 404,
  // not a missing route) is dropped from the URL rather than kept forever.
  const staleUrlJob =
    urlJobId != null && jobId === urlJobId && job.error?.status === 404
  useEffect(() => {
    if (!staleUrlJob) return
    const params = new URLSearchParams(searchParams.toString())
    params.delete("pullJob")
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [staleUrlJob, searchParams, pathname, router])
  const running = jobData != null && !isTerminalPull(jobData.status)

  const start = async () => {
    const body = PullRequestSchema.safeParse({
      semesterId: semesterId ?? undefined,
      courseOfferingIds: selectedOfferingIds.length
        ? selectedOfferingIds
        : undefined,
    })
    if (!body.success) {
      // Stay clickable and say exactly what's missing instead of a silently
      // greyed-out button: point the user at the filter to fill in.
      setAskedForSemester(true)
      if (filterFieldIds && typeof document !== "undefined") {
        const semesterField = document.getElementById(filterFieldIds.semester)
        const target =
          semesterField instanceof HTMLSelectElement && !semesterField.disabled
            ? semesterField
            : document.getElementById(filterFieldIds.session)
        target?.focus()
      }
      return
    }
    setAskedForSemester(false)
    try {
      const res = await startPull.mutateAsync(body.data)
      setDismissedId(null)
      setStartedJobId(res.jobId)
      setUrlJob(res.jobId)
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
                : "Pulls one semester at a time. Choose the academic session and semester in the filters above."}
          </p>
        </div>
        <Button
          onClick={start}
          disabled={startPull.isPending || running}
          aria-describedby={
            needsSemester ? "moodle-pull-needs-semester" : undefined
          }
        >
          {startPull.isPending || running ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <CloudDownload className="size-4" aria-hidden />
          )}
          Pull from Moodle
        </Button>
      </div>

      {needsSemester && (
        <p
          id="moodle-pull-needs-semester"
          role="alert"
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200"
        >
          Pick the <strong>academic session</strong> and then the{" "}
          <strong>semester</strong> you want to pull (for example 2026/2027 ·
          First Semester), then click Pull from Moodle again.
        </p>
      )}

      {notAvailable && (
        <NotAvailableNotice title="Moodle pull isn't available on the server yet" />
      )}

      {jobData && (
        <div className="space-y-2" aria-live="polite">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">
              {STATUS_LABEL[jobData.status]}
            </span>
            <span className="flex items-center gap-2 text-muted-foreground tabular-nums">
              {jobData.offeringsDone} / {jobData.offeringsTotal} offerings
              {isTerminalPull(jobData.status) && (
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label="Dismiss pull result"
                  onClick={() => {
                    setDismissedId(jobData.id)
                    setUrlJob(null)
                  }}
                >
                  <X />
                </Button>
              )}
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
