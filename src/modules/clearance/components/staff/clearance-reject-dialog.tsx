"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, XCircle } from "lucide-react"
import { toast } from "sonner"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RejectClearanceDtoSchema } from "../../schemas/clearance.schema"
import { useRejectClearance } from "../../hooks/use-clearance-mutations"
import type { RejectClearanceDto } from "../../types"

interface ClearanceRejectDialogProps {
  clearanceId: number | null
  onClose: () => void
}

export function ClearanceRejectDialog({
  clearanceId,
  onClose,
}: ClearanceRejectDialogProps) {
  const reject = useRejectClearance()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RejectClearanceDto>({
    resolver: zodResolver(RejectClearanceDtoSchema),
    defaultValues: { comments: "" },
  })

  const submit = handleSubmit(async (values) => {
    if (!clearanceId) return
    try {
      await reject.mutateAsync({ id: clearanceId, dto: values })
      toast.success("Clearance rejected")
      reset()
      onClose()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reject clearance"
      )
    }
  })

  return (
    <Modal
      open={clearanceId !== null}
      onClose={onClose}
      title="Reject Clearance"
      subtitle="The student will be notified and can re-request after resolving this."
      size="sm"
      footer={
        <>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={reject.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={submit}
            disabled={reject.isPending}
          >
            {reject.isPending ? (
              <Loader2
                className="size-4 animate-spin"
                data-icon="inline-start"
              />
            ) : (
              <XCircle className="size-4" data-icon="inline-start" />
            )}
            Reject
          </Button>
        </>
      }
    >
      <div className="space-y-1.5">
        <Label htmlFor="reject-comments">
          Reason <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="reject-comments"
          rows={3}
          placeholder="e.g. Outstanding library fine of NGN 2,500 must be settled first."
          aria-invalid={!!errors.comments}
          {...register("comments")}
        />
        {errors.comments && (
          <p className="text-xs text-destructive">{errors.comments.message}</p>
        )}
      </div>
    </Modal>
  )
}
