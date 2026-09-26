"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertTriangle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Modal from "@/components/custom/Modal"
import { CurrencyDisplay } from "../shared/currency-display"
import { WaiveInvoiceDtoSchema } from "../../schemas/invoice.schema"
import {
  useWaiveInvoice,
  WAIVE_NOT_AVAILABLE_MESSAGE,
} from "../../hooks/use-fee-mutations"
import { isEndpointMissing } from "@/modules/student-grades/lib/results-errors"
import type { InvoiceResponse, WaiveInvoiceDto } from "../../types"

interface WaiveInvoiceDialogProps {
  invoice: InvoiceResponse
  open: boolean
  onClose: () => void
  /** Called after a successful waive, after the dialog closes. */
  onWaived?: () => void
}

export function WaiveInvoiceDialog({
  invoice,
  open,
  onClose,
  onWaived,
}: WaiveInvoiceDialogProps) {
  const waive = useWaiveInvoice()
  // The button stays enabled when the route is missing (CLAUDE.md §14):
  // the admin can retry once the backend ships it, and meanwhile is told
  // plainly why nothing happened.
  const notAvailable = waive.error ? isEndpointMissing(waive.error) : false

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
    defaultValues: { reason: "" },
  })

  function onSubmit(dto: WaiveInvoiceDto) {
    waive.mutate(
      { id: invoice.id, dto },
      {
        onSuccess: () => {
          reset()
          onClose()
          onWaived?.()
        },
      }
    )
  }

  function handleClose() {
    reset()
    waive.reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Waive invoice"
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
            Waive invoice
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {notAvailable && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300"
          >
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            {WAIVE_NOT_AVAILABLE_MESSAGE} The invoice has not been changed.
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          The invoice will be marked Waived and the student will no longer owe
          its remaining balance. This is recorded against your name.
        </p>

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
            aria-required="true"
            aria-describedby={
              errors.reason
                ? "waive-reason-error waive-reason-help"
                : "waive-reason-help"
            }
            {...register("reason")}
          />
          {errors.reason && (
            <p id="waive-reason-error" className="text-xs text-destructive">
              {errors.reason.message}
            </p>
          )}
          <p id="waive-reason-help" className="text-xs text-muted-foreground">
            Saved on the invoice with your name and the date, and shown to
            anyone who opens it later.
          </p>
        </div>
      </div>
    </Modal>
  )
}
