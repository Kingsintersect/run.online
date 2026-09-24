"use client"

import { useState } from "react"
import { toast } from "sonner"
import { History, Undo2 } from "lucide-react"
import EmptyState from "@/components/custom/EmptyState"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useSheetAdjustments } from "../../hooks/use-results"
import { useRevertBatch } from "../../hooks/use-results-mutations"
import { RevertSchema } from "../../schemas"
import { NotAvailableNotice } from "./not-available-notice"
import { ReasonDialog } from "./reason-dialog"
import { formatDateTime } from "./offerings-table"
import { fmtSigned } from "./format"
import type { AdjustmentBatch, BatchStatus } from "../../types"
import type { SingleAdjustment } from "../../types"

type AdjustmentStatus = SingleAdjustment["status"]

export const BATCH_STATUS_META: Record<
  BatchStatus,
  { label: string; className: string }
> = {
  PENDING_APPROVAL: {
    label: "Pending approval",
    className: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  },
  APPLIED: {
    label: "Applied",
    className:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  },
  REVERTED: {
    label: "Reverted",
    className:
      "bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300",
  },
}

// Single-row adjustments can also be SUPERSEDED (a filled-in score replaced
// by a real Moodle grade on re-pull). They have no batch, so no revert here.
const SINGLE_STATUS_META: Record<
  AdjustmentStatus,
  { label: string; className: string }
> = {
  ...BATCH_STATUS_META,
  SUPERSEDED: {
    label: "Superseded by Moodle",
    className: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  },
}

const TARGET_LABEL = {
  ALL: "all students",
  BELOW_TOTAL: "students below a total",
  SELECTED: "selected students",
  MISSING_ONLY: "students missing the component",
} as const

export function describeBatch(b: AdjustmentBatch): string {
  const what =
    b.type === "ADD_MARKS"
      ? `${fmtSigned(b.value)} ${b.component === "CA" ? "CA" : "exam"} marks`
      : `Filled missing ${b.component === "CA" ? "CA" : "exam"} with ${b.value}`
  const below =
    b.target === "BELOW_TOTAL" && typeof b.targetParams?.belowTotal === "number"
      ? ` (< ${b.targetParams.belowTotal})`
      : ""
  return `${what} for ${TARGET_LABEL[b.target]}${below}`
}

interface AdjustmentHistoryProps {
  offeringId: number
  /** results.adjust held AND the sheet is DRAFT (revert is 409 otherwise). */
  canRevert: boolean
}

export function AdjustmentHistory({
  offeringId,
  canRevert,
}: AdjustmentHistoryProps) {
  const history = useSheetAdjustments(offeringId)
  const revert = useRevertBatch(offeringId)
  const [reverting, setReverting] = useState<AdjustmentBatch | null>(null)

  if (history.isLoading)
    return (
      <div className="h-32 animate-pulse rounded-2xl bg-muted/40" aria-busy />
    )
  if (history.isError)
    return (
      <EmptyState
        icon={History}
        title="Couldn't load adjustments"
        description={history.error.message}
      />
    )
  if (history.data?.available === false)
    return (
      <NotAvailableNotice title="Adjustment history isn't available on the server yet" />
    )

  const batches = history.data?.data?.batches ?? []
  const singles = history.data?.data?.singles ?? []
  if (batches.length === 0 && singles.length === 0)
    return (
      <EmptyState
        icon={History}
        title="No adjustments yet"
        description="Every normalization and single-row adjustment will be listed here with who made it and why."
      />
    )

  return (
    <>
      <ol className="space-y-2">
        {batches.map((b) => (
          <li
            key={b.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-card p-3"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {describeBatch(b)}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    BATCH_STATUS_META[b.status].className
                  )}
                >
                  {BATCH_STATUS_META[b.status].label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {b.affected} affected · {b.capped} capped · by {b.createdBy} (
                {b.creatorRole}) · {formatDateTime(b.createdAt)}
              </p>
              <p className="text-xs text-foreground/80">“{b.reason}”</p>
              {b.decisionNote && (
                <p className="text-xs text-muted-foreground">
                  Decision by {b.approvedBy ?? "—"}: {b.decisionNote}
                </p>
              )}
            </div>
            {canRevert && b.status === "APPLIED" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setReverting(b)}
              >
                <Undo2 className="size-3.5" aria-hidden /> Revert
              </Button>
            )}
          </li>
        ))}
      </ol>
      {singles.length > 0 && (
        <section
          aria-labelledby="single-adjustments-heading"
          className="mt-5 space-y-2"
        >
          <h3
            id="single-adjustments-heading"
            className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
          >
            Single-student adjustments
          </h3>
          <ol className="space-y-2">
            {singles.map((a) => (
              <li
                key={a.id}
                className="space-y-1 rounded-xl border border-border bg-card p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {a.matricNumber}:{" "}
                    {a.mode === "ADD"
                      ? `${fmtSigned(a.value)} ${a.component === "CA" ? "CA" : "exam"} marks`
                      : `${a.component === "CA" ? "CA" : "Exam"} set to ${a.value}`}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      SINGLE_STATUS_META[a.status].className
                    )}
                  >
                    {SINGLE_STATUS_META[a.status].label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Applied {fmtSigned(a.appliedDelta)}
                  {a.capped ? " (capped)" : ""} · by {a.createdBy} ·{" "}
                  {formatDateTime(a.createdAt)}
                </p>
                <p className="text-xs text-foreground/80">“{a.reason}”</p>
              </li>
            ))}
          </ol>
        </section>
      )}
      <ReasonDialog
        open={reverting != null}
        onOpenChange={(o) => !o && setReverting(null)}
        title="Revert this adjustment?"
        description={reverting ? describeBatch(reverting) : undefined}
        label="Reason"
        confirmLabel="Revert"
        minLength={1}
        destructive
        onConfirm={async (reason) => {
          if (!reverting) return
          const body = RevertSchema.parse({ reason })
          await revert.mutateAsync({ batchId: reverting.id, body })
          toast.success("Adjustment reverted.")
        }}
      />
    </>
  )
}
