"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react"
import EmptyState from "@/components/custom/EmptyState"
import { Button } from "@/components/ui/button"
import { useAdjustmentQueue } from "../../hooks/use-results"
import { useDecideBatch } from "../../hooks/use-results-mutations"
import { BatchApproveSchema, BatchRejectSchema } from "../../schemas"
import { NotAvailableNotice } from "./not-available-notice"
import { ReasonDialog } from "./reason-dialog"
import { SemesterPicker } from "./semester-picker"
import { describeBatch } from "./adjustment-history"
import { formatDateTime } from "./offerings-table"
import type { AdjustmentBatch } from "../../types"

const PAGE_SIZE = 20

// Screen C — PENDING_APPROVAL batches (HOD/DEAN adjustments above the major
// program's threshold). Gate results.adjust.approve at the page. The creator
// of a batch can't approve it — enforced server-side; the batch only carries
// the creator's name, not id, so the UI can't hide it reliably (contract
// change request logged in BACKEND_DEVIATIONS).
export function AdjustmentApprovalsQueue() {
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [semesterId, setSemesterId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [deciding, setDeciding] = useState<{
    batch: AdjustmentBatch
    decision: "approve" | "reject"
  } | null>(null)

  const queue = useAdjustmentQueue({
    status: "PENDING_APPROVAL",
    semesterId: semesterId ?? undefined,
    page,
    limit: PAGE_SIZE,
  })
  const decide = useDecideBatch()
  const data = queue.data?.available ? queue.data.data : null
  const totalPages = data
    ? (data.meta.totalPages ??
      Math.max(1, Math.ceil(data.meta.total / data.meta.limit)))
    : 1

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-lg font-semibold text-foreground">
          Adjustment approvals
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Score adjustments by HODs and Deans above the major program&apos;s
          approval threshold wait here. Approving applies them to the sheet;
          rejecting leaves the scores unchanged.
        </p>
      </header>

      <div className="grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
        <SemesterPicker
          idPrefix="aq"
          sessionId={sessionId}
          semesterId={semesterId}
          onSessionChange={(id) => {
            setSessionId(id)
            setSemesterId(null)
            setPage(1)
          }}
          onSemesterChange={(id) => {
            setSemesterId(id)
            setPage(1)
          }}
        />
      </div>

      {queue.isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-muted/40" aria-busy />
      ) : queue.isError ? (
        <EmptyState
          icon={ShieldCheck}
          title="Couldn't load the approvals queue"
          description={queue.error.message}
        />
      ) : queue.data?.available === false ? (
        <NotAvailableNotice title="Adjustment approvals aren't available on the server yet" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Nothing waiting for approval"
          description="Adjustments that need an admin's sign-off will appear here."
        />
      ) : (
        <>
          <ul className="space-y-2">
            {data.data.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {describeBatch(b)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Offering #{b.offeringId} · {b.affected} students affected ·{" "}
                    {b.capped} capped
                  </p>
                  <p className="text-xs text-muted-foreground">
                    By {b.createdBy} ({b.creatorRole}) ·{" "}
                    {formatDateTime(b.createdAt)}
                  </p>
                  <p className="text-xs text-foreground/80">“{b.reason}”</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      setDeciding({ batch: b, decision: "approve" })
                    }
                  >
                    <ShieldCheck className="size-3.5" aria-hidden /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      setDeciding({ batch: b, decision: "reject" })
                    }
                  >
                    <XCircle className="size-3.5" aria-hidden /> Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="tabular-nums">
                Page {page} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <ReasonDialog
        open={deciding != null}
        onOpenChange={(o) => !o && setDeciding(null)}
        title={
          deciding?.decision === "approve"
            ? "Approve this adjustment?"
            : "Reject this adjustment?"
        }
        description={deciding ? describeBatch(deciding.batch) : undefined}
        label="Note"
        confirmLabel={deciding?.decision === "approve" ? "Approve" : "Reject"}
        minLength={deciding?.decision === "reject" ? 1 : 0}
        destructive={deciding?.decision === "reject"}
        onConfirm={async (note) => {
          if (!deciding) return
          const { batch } = deciding
          if (deciding.decision === "approve")
            await decide.mutateAsync({
              decision: "approve",
              batchId: batch.id,
              offeringId: batch.offeringId,
              body: BatchApproveSchema.parse({ note: note || undefined }),
            })
          else
            await decide.mutateAsync({
              decision: "reject",
              batchId: batch.id,
              offeringId: batch.offeringId,
              body: BatchRejectSchema.parse({ note }),
            })
          toast.success(
            deciding.decision === "approve"
              ? "Adjustment approved and applied."
              : "Adjustment rejected."
          )
        }}
      />
    </div>
  )
}
