"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { VerifyDocumentDtoSchema } from "../../schemas/document.schema"
import { useVerifyDocument } from "../../hooks/use-document-mutations"
import type { VerifyDocumentDto } from "../../types"

interface DocumentVerifyDialogProps {
  documentId: number | null
  onClose: () => void
}

export function DocumentVerifyDialog({
  documentId,
  onClose,
}: DocumentVerifyDialogProps) {
  const verify = useVerifyDocument()
  const { register, handleSubmit, reset } = useForm<VerifyDocumentDto>({
    resolver: zodResolver(VerifyDocumentDtoSchema),
    defaultValues: { remarks: "" },
  })

  const submit = handleSubmit(async (values) => {
    if (!documentId) return
    try {
      await verify.mutateAsync({ id: documentId, dto: values })
      toast.success("Document verified")
      reset()
      onClose()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to verify document"
      )
    }
  })

  return (
    <Modal
      open={documentId !== null}
      onClose={onClose}
      title="Verify Document"
      subtitle="Confirm this document matches the student's record."
      size="sm"
      footer={
        <>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={verify.isPending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={verify.isPending}>
            {verify.isPending ? (
              <Loader2
                className="size-4 animate-spin"
                data-icon="inline-start"
              />
            ) : (
              <CheckCircle2 className="size-4" data-icon="inline-start" />
            )}
            Verify
          </Button>
        </>
      }
    >
      <div className="space-y-1.5">
        <Label htmlFor="verify-remarks">Remarks (optional)</Label>
        <Textarea
          id="verify-remarks"
          rows={3}
          placeholder="e.g. All details match the admission record."
          {...register("remarks")}
        />
      </div>
    </Modal>
  )
}
