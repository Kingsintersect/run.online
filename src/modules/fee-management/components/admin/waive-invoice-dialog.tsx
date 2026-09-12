"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Modal from "@/components/custom/Modal"
import { CurrencyDisplay } from "../shared/currency-display"
import { WaiveInvoiceDtoSchema } from "../../schemas/invoice.schema"
import { useWaiveInvoice } from "../../hooks/use-fee-mutations"
import type { InvoiceResponse, WaiveInvoiceDto } from "../../types"

interface WaiveInvoiceDialogProps {
  invoice: InvoiceResponse
  open: boolean
  onClose: () => void
}

export function WaiveInvoiceDialog({
  invoice,
  open,
  onClose,
}: WaiveInvoiceDialogProps) {
  const waive = useWaiveInvoice()

  const balance = Math.max(
    0,
    Number(invoice.amount) - Number(invoice.amountPaid)
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WaiveInvoiceDto>({
    resolver: zodResolver(WaiveInvoiceDtoSchema),
  })

  function onSubmit({ reason }: WaiveInvoiceDto) {
    waive.mutate(
      { id: invoice.id, reason },
      {
        onSuccess: () => {
          reset()
          onClose()
        },
      }
    )
  }

  function handleClose() {
    reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Waive Invoice Balance"
      subtitle={`Invoice ${invoice.invoiceNumber} — ${invoice.feeType.name}`}
      size="sm"
      footer={
        <>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={waive.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={waive.isPending}>
            {waive.isPending && (
              <Loader2
                size={14}
                className="mr-1.5 animate-spin"
                data-icon="inline-start"
              />
            )}
            Confirm Waiver
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Amount being waived */}
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Student</span>
            <span className="font-medium">
              {invoice.student?.fullName ?? "—"}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-muted-foreground">Balance to waive</span>
            <CurrencyDisplay
              amount={balance}
              className="font-semibold text-foreground"
            />
          </div>
        </div>

        {/* Reason field */}
        <div className="space-y-1.5">
          <Label htmlFor="waive-reason">
            Reason <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="waive-reason"
            placeholder="e.g. Scholarship award, billing error, financial hardship exemption"
            rows={3}
            aria-invalid={!!errors.reason}
            {...register("reason")}
          />
          {errors.reason && (
            <p className="text-xs text-destructive">{errors.reason.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            This reason is recorded in the audit log and is visible to Bursary
            staff.
          </p>
        </div>
      </div>
    </Modal>
  )
}
