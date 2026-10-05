"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Loader2,
  Lock,
  RotateCcw,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import {
  ApproveSheetSchema,
  RejectSheetSchema,
  ReopenSheetSchema,
} from "../../schemas"
import {
  useApproveSheet,
  useRejectSheet,
  useReopenSheet,
  useSubmitSheet,
} from "../../hooks/use-results-mutations"
import { RESULTS_PERMISSIONS } from "../../lib/results-permissions"
import {
  semesterLockedReason,
  toResultsApiError,
} from "../../lib/results-errors"
import { useCurrentUserId } from "../../hooks/use-current-user-id"
import { ReasonDialog } from "./reason-dialog"
import type { ResultSheetSummary } from "../../types"

type Dialog = "approve" | "reject" | "reopen" | null

// DRAFT → SUBMITTED → APPROVED (→ PUBLISHED from the Publish screen).
// Buttons appear by permission AND the sheet's state; the server remains the
// authority and its 409 message ("2 unmapped items", "pending adjustment
// approval", …) is shown as-is. Separation of duties (the submitter can't
// approve) is enforced server-side (403 SEPARATION_OF_DUTIES); since
// 2026-09-26 the summary carries `submittedBy`, so Approve is also hidden
// from the submitter. Reject stays available — the contract only forbids
// approving your own submission.
//
// B30 item 13: when the offering's semester is locked every one of these is
// refused (423 SEMESTER_LOCKED), so they render disabled with the reason
// shown next to them and linked via aria-describedby. The 423 handling in
// toResultsApiError stays as the backstop.
interface SheetWorkflowBarProps {
  sheet: ResultSheetSummary
  /** The offering's semester is locked (B30 item 13). */
  locked?: boolean
  lockedAt?: string | null
}

const LOCK_NOTE_ID = "sheet-workflow-locked-note"

export function SheetWorkflowBar({
  sheet,
  locked = false,
  lockedAt = null,
}: SheetWorkflowBarProps) {
  const id = sheet.offeringId
  const submit = useSubmitSheet(id)
  const approve = useApproveSheet(id)
  const reject = useRejectSheet(id)
  const reopen = useReopenSheet(id)
  const [dialog, setDialog] = useState<Dialog>(null)
  const currentUserId = useCurrentUserId()
  const isSubmitter =
    currentUserId != null && sheet.submittedBy?.id === currentUserId

  const lockProps = locked
    ? { disabled: true, "aria-describedby": LOCK_NOTE_ID }
    : {}

  const onSubmit = async () => {
    if (locked) return
    try {
      await submit.mutateAsync()
      toast.success("Sheet submitted for approval.")
    } catch (error) {
      if (error instanceof Error) toast.error(toResultsApiError(error).message)
    }
  }

  const status = sheet.status
  const anyAction =
    status === "DRAFT" || status === "SUBMITTED" || status === "APPROVED"
  if (!anyAction) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {locked && (
        <span
          id={LOCK_NOTE_ID}
          className="inline-flex max-w-xs items-center gap-1 text-xs text-muted-foreground"
        >
          <Lock className="size-3.5 shrink-0" aria-hidden />
          {semesterLockedReason(lockedAt)}
        </span>
      )}
      {status === "DRAFT" && (
        <PermissionGate require={RESULTS_PERMISSIONS.submit}>
          <Button
            onClick={onSubmit}
            disabled={submit.isPending || locked}
            aria-describedby={locked ? LOCK_NOTE_ID : undefined}
          >
            {submit.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Send className="size-4" aria-hidden />
            )}
            Submit for approval
          </Button>
        </PermissionGate>
      )}
      {status === "SUBMITTED" && (
        <PermissionGate require={RESULTS_PERMISSIONS.approve}>
          {isSubmitter ? (
            <span className="text-xs text-muted-foreground">
              You submitted this sheet — someone else must approve it.
            </span>
          ) : (
            <Button onClick={() => setDialog("approve")} {...lockProps}>
              <ShieldCheck className="size-4" aria-hidden /> Approve
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={() => setDialog("reject")}
            {...lockProps}
          >
            <XCircle className="size-4" aria-hidden /> Reject
          </Button>
        </PermissionGate>
      )}
      {status === "APPROVED" && (
        <PermissionGate require={RESULTS_PERMISSIONS.reopen}>
          <Button
            variant="outline"
            onClick={() => setDialog("reopen")}
            {...lockProps}
          >
            <RotateCcw className="size-4" aria-hidden /> Reopen
          </Button>
        </PermissionGate>
      )}

      <ReasonDialog
        open={dialog === "approve"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`Approve ${sheet.courseCode}?`}
        description="Approved sheets are ready to publish. Only an admin can reopen them."
        label="Remarks"
        confirmLabel="Approve"
        minLength={0}
        onConfirm={async (remarks) => {
          const body = ApproveSheetSchema.parse({
            remarks: remarks || undefined,
          })
          await approve.mutateAsync(body)
          toast.success("Sheet approved.")
        }}
      />
      <ReasonDialog
        open={dialog === "reject"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`Reject ${sheet.courseCode}?`}
        description="The sheet goes back to draft so it can be corrected and resubmitted."
        label="What needs fixing"
        confirmLabel="Reject"
        minLength={1}
        destructive
        onConfirm={async (remarks) => {
          await reject.mutateAsync(RejectSheetSchema.parse({ remarks }))
          toast.success("Sheet returned to draft.")
        }}
      />
      <ReasonDialog
        open={dialog === "reopen"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`Reopen ${sheet.courseCode}?`}
        description="The sheet goes back to draft; re-pulled Moodle marks and adjustments can then be applied."
        label="Reason"
        confirmLabel="Reopen"
        minLength={1}
        onConfirm={async (reason) => {
          await reopen.mutateAsync(ReopenSheetSchema.parse({ reason }))
          toast.success("Sheet reopened.")
        }}
      />
    </div>
  )
}
