"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ApproveClearanceDtoSchema } from "../../schemas/clearance.schema"
import { useApproveClearance } from "../../hooks/use-clearance-mutations"
import type { ApproveClearanceDto } from "../../types"

interface ClearanceApproveDialogProps {
  clearanceId: number | null
  onClose: () => void
}

export function ClearanceApproveDialog({
  clearanceId,
  onClose,
}: ClearanceApproveDialogProps) {
  const approve = useApproveClearance()
  const { register, handleSubmit, reset } = useForm<ApproveClearanceDto>({
    resolver: zodResolver(ApproveClearanceDtoSchema),
    defaultValues: { comments: "" },
  })

  const submit = handleSubmit(async (values) => {
    if (!clearanceId) return
    try {
      await approve.mutateAsync({ id: clearanceId, dto: values })
      toast.success("Clearance approved")
      reset()
      onClose()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to approve clearance"
      )
    }
  })

  return (
    <Modal
      open={clearanceId !== null}
      onClose={onClose}
      title="Approve Clearance"
      subtitle="The student will be notified once this checkpoint is cleared."
      size="sm"
      footer={
        <>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={approve.isPending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={approve.isPending}>
            {approve.isPending ? (
              <Loader2
                className="size-4 animate-spin"
                data-icon="inline-start"
              />
            ) : (
              <CheckCircle2 className="size-4" data-icon="inline-start" />
            )}
            Approve
          </Button>
        </>
      }
    >
      <div className="space-y-1.5">
        <Label htmlFor="approve-comments">
          Comments <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="approve-comments"
          rows={3}
          placeholder="e.g. Library records clear — no outstanding items."
          {...register("comments")}
        />
      </div>
    </Modal>
  )
}
