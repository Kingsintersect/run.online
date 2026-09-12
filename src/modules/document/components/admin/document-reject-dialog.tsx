"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, XCircle } from "lucide-react"
import { toast } from "sonner"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RejectDocumentDtoSchema } from "../../schemas/document.schema"
import { useRejectDocument } from "../../hooks/use-document-mutations"
import type { RejectDocumentDto } from "../../types"

interface DocumentRejectDialogProps {
  documentId: number | null
  onClose: () => void
}

export function DocumentRejectDialog({
  documentId,
  onClose,
}: DocumentRejectDialogProps) {
  const reject = useRejectDocument()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RejectDocumentDto>({
    resolver: zodResolver(RejectDocumentDtoSchema),
    defaultValues: { reason: "" },
  })

  const submit = handleSubmit(async (values) => {
    if (!documentId) return
    try {
      await reject.mutateAsync({ id: documentId, dto: values })
      toast.success("Document rejected")
      reset()
      onClose()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reject document"
      )
    }
  })

  return (
    <Modal
      open={documentId !== null}
      onClose={onClose}
      title="Reject Document"
      subtitle="The student will be notified and asked to re-upload."
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
        <Label htmlFor="reject-reason">
          Reason <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="reject-reason"
          rows={3}
          placeholder="e.g. Document image is blurry and illegible — please re-upload."
          aria-invalid={!!errors.reason}
          {...register("reason")}
        />
        {errors.reason && (
          <p className="text-xs text-destructive">{errors.reason.message}</p>
        )}
      </div>
    </Modal>
  )
}
