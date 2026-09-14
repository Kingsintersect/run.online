"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { AlertTriangle, Info, Loader2 } from "lucide-react"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  useDismissDrift,
  useUnenrolDrift,
} from "../../hooks/use-sync-mutations"
import { ResolveDriftReasonSchema } from "../../schemas/enrollment-drift.schema"
import type { EnrollmentDriftItem, ResolveDriftReason } from "../../types"

// Enrollment drift — sandbox/moodle-sync-reconciliation/ENROLLMENT_DRIFT.md.
// Both actions require a reason, which
// the backend keeps on the drift record.

export type ResolveDriftMode = "dismiss" | "unenrol"

interface ResolveDriftDialogProps {
  item: EnrollmentDriftItem | null
  mode: ResolveDriftMode
  onClose: () => void
  onResolved?: (item: EnrollmentDriftItem) => void
}

export function ResolveDriftDialog({
  item,
  mode,
  onClose,
  onResolved,
}: ResolveDriftDialogProps) {
  const dismiss = useDismissDrift()
  const unenrol = useUnenrolDrift()
  const isPending = dismiss.isPending || unenrol.isPending
  const isUnenrol = mode === "unenrol"

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResolveDriftReason>({
    resolver: zodResolver(ResolveDriftReasonSchema),
    defaultValues: { reason: "" },
  })

  useEffect(() => {
    if (item) reset({ reason: "" })
  }, [item, reset])

  const onSubmit = async ({ reason }: ResolveDriftReason) => {
    if (!item) return
    try {
      const updated = isUnenrol
        ? await unenrol.mutateAsync({ id: item.id, reason })
        : await dismiss.mutateAsync({ id: item.id, reason })
      toast.success(
        isUnenrol
          ? `Removed ${item.studentName} from ${item.courseCode} in Moodle`
          : "Dismissed — it won't be flagged again unless the situation changes"
      )
      onResolved?.(updated)
      onClose()
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : isUnenrol
            ? "Couldn't remove from Moodle"
            : "Couldn't dismiss"
      )
    }
  }

  const consequence =
    item?.kind === "MISSING_IN_MOODLE"
      ? "The student stays enrolled on the portal but won't have this course in Moodle."
      : "The student keeps access in Moodle with no portal enrollment or fee record."

  return (
    <Modal
      open={item !== null}
      onClose={onClose}
      title={isUnenrol ? "Remove from Moodle" : "Dismiss drift"}
      subtitle={item ? `${item.studentName} · ${item.courseCode}` : ""}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant={isUnenrol ? "destructive" : "default"}
            onClick={handleSubmit(onSubmit)}
            disabled={isPending}
          >
            {isPending && (
              <Loader2
                className="size-4 animate-spin"
                data-icon="inline-start"
              />
            )}
            {isUnenrol ? "Remove from Moodle" : "Dismiss"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {isUnenrol ? (
          <div className="flex gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm text-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p>
              Removes {item?.studentName} from {item?.courseCode} in Moodle.
              Their portal record isn&apos;t changed. This only works for
              students added through Moodle&apos;s manual enrolment — if they
              were added another way, Moodle will say so and you&apos;ll need to
              remove them in Moodle directly.
            </p>
          </div>
        ) : (
          <div className="flex gap-2.5 rounded-xl border border-border bg-muted/40 px-3 py-3 text-sm text-foreground">
            <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p>
              {consequence} Dismiss only when that&apos;s intentional — for
              example, an approved auditor.
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="drift-reason">Reason (kept on record)</Label>
          <Textarea
            id="drift-reason"
            rows={3}
            aria-invalid={!!errors.reason}
            {...register("reason")}
          />
          {errors.reason && (
            <p className="text-sm text-destructive">{errors.reason.message}</p>
          )}
        </div>
      </div>
    </Modal>
  )
}
