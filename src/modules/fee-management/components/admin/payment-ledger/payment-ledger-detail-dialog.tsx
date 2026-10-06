"use client"

import { FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { CurrencyDisplay } from "../../shared/currency-display"
import { PaymentStatusBadge } from "../../shared/payment-status-badge"
import {
  PAYMENT_METHOD_LABEL,
  formatDateTime,
} from "../../../lib/payment-ledger"
import type { PaymentLedgerRow } from "../../../types"

interface PaymentLedgerDetailDialogProps {
  payment: PaymentLedgerRow | null
  onClose: () => void
  onOpenInvoice: (invoiceId: number) => void
  /** The invoice for this payment is being fetched. */
  openingInvoice: boolean
  /** Why the invoice couldn't be opened, if it failed. */
  invoiceError: string | null
}

function Field({
  label,
  children,
  mono,
}: {
  label: string
  children: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 border-b border-border/60 py-2 last:border-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs break-all" : "text-sm"}>
        {children}
      </dd>
    </div>
  )
}

export function PaymentLedgerDetailDialog({
  payment,
  onClose,
  onOpenInvoice,
  openingInvoice,
  invoiceError,
}: PaymentLedgerDetailDialogProps) {
  return (
    <Dialog open={payment !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {payment && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Payment{" "}
                <span className="font-mono text-sm">
                  {payment.referenceNumber}
                </span>
              </DialogTitle>
              <DialogDescription>
                {payment.student
                  ? `${payment.student.fullName ?? "Student"} · ${payment.student.matricNumber ?? "no matric number"}`
                  : "Applicant (application-fee payment, no student record yet)"}
              </DialogDescription>
            </DialogHeader>

            <dl>
              <Field label="Amount">
                <CurrencyDisplay
                  amount={payment.amount}
                  className="font-semibold"
                />
              </Field>
              <Field label="Status">
                <PaymentStatusBadge status={payment.status} />
              </Field>
              <Field label="Method">
                {PAYMENT_METHOD_LABEL[payment.method]}
              </Field>
              <Field label="Reference" mono>
                {payment.referenceNumber}
              </Field>
              <Field label="Gateway transaction" mono>
                {payment.gatewayTransactionId ?? "—"}
              </Field>
              <Field label="Paid at">{formatDateTime(payment.paidAt)}</Field>
              <Field label="Created">{formatDateTime(payment.createdAt)}</Field>
              <Field label="Verified at">
                {formatDateTime(payment.verifiedAt)}
              </Field>
              <Field label="Verified via">{payment.verifiedVia ?? "—"}</Field>
              <Field label="Webhook received">
                {formatDateTime(payment.webhookReceivedAt)}
              </Field>
              <Field label="Programme">
                {payment.student?.programName ?? "—"}
              </Field>
              <Field label="Major program">
                {payment.majorProgramName ?? "—"}
              </Field>
              <Field label="Fee type">
                {payment.invoice?.feeType?.name ?? "—"}
              </Field>
              <Field label="Session">
                {payment.invoice?.session?.name ?? "—"}
              </Field>
              <Field label="Invoice" mono>
                {payment.invoice?.invoiceNumber ?? `#${payment.invoiceId}`}
              </Field>
            </dl>

            <PermissionGate
              require={{ resource: "fee-management", action: "view" }}
            >
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={openingInvoice}
                  onClick={() => onOpenInvoice(payment.invoiceId)}
                >
                  {openingInvoice ? (
                    <Loader2
                      data-icon="inline-start"
                      className="animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <FileText data-icon="inline-start" aria-hidden="true" />
                  )}
                  Open invoice
                </Button>
                {invoiceError && (
                  <p
                    role="alert"
                    className="text-xs text-red-700 dark:text-red-300"
                  >
                    {invoiceError}
                  </p>
                )}
              </div>
            </PermissionGate>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
