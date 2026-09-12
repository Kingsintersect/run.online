"use client"

import { useRef, useState } from "react"
import { Info, Loader2, Printer, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import Modal from "@/components/custom/Modal"
import { CurrencyDisplay } from "../shared/currency-display"
import { useInvoicePaymentHistory, usePayment } from "../../hooks/use-payment"

// Method display labels
const METHOD_LABEL: Record<string, string> = {
  GATEWAY: "Online Gateway",
  CARD: "Card",
  USSD: "USSD",
  BANK_TRANSFER: "Bank Transfer",
}

interface PaymentHistoryProps {
  invoiceId: number
  invoiceNumber: string
  feeTypeName: string
}

export function PaymentHistory({
  invoiceId,
  invoiceNumber,
  feeTypeName,
}: PaymentHistoryProps) {
  const { data, isLoading } = useInvoicePaymentHistory(invoiceId)
  const printRef = useRef<HTMLDivElement>(null)
  const payments = data?.data ?? []
  const [detailId, setDetailId] = useState<number | null>(null)

  function printReceipt(paymentId: number) {
    const payment = payments.find((p) => p.id === paymentId)
    if (!payment) return
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt — ${invoiceNumber}</title>
        <style>
          body { font-family: sans-serif; padding: 32px; max-width: 480px; margin: auto; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          .sub { color: #666; font-size: 13px; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; font-size: 14px; }
          td { padding: 8px 0; border-bottom: 1px solid #eee; }
          td:last-child { text-align: right; font-weight: 600; }
          .total td { font-size: 16px; border-bottom: none; padding-top: 16px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Payment Receipt</h1>
        <p class="sub">${feeTypeName}</p>
        <table>
          <tr><td>Invoice No.</td><td>${invoiceNumber}</td></tr>
          <tr><td>Reference</td><td>${payment.referenceNumber}</td></tr>
          <tr><td>Method</td><td>${METHOD_LABEL[payment.method] ?? payment.method}</td></tr>
          <tr><td>Date</td><td>${new Date(payment.paidAt).toLocaleDateString("en-NG", { dateStyle: "long" })}</td></tr>
          <tr><td>Status</td><td>${payment.status}</td></tr>
          <tr class="total"><td>Amount</td><td>₦${Number(payment.amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</td></tr>
        </table>
      </body>
      </html>
    `
    const win = window.open("", "_blank", "width=520,height=640")
    if (win) {
      win.document.write(content)
      win.document.close()
      win.focus()
      win.print()
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
        <Receipt size={28} className="opacity-30" />
        <p className="text-sm">No payments recorded yet.</p>
      </div>
    )
  }

  return (
    <div ref={printRef} className="space-y-3">
      {payments.map((payment) => (
        <div
          key={payment.id}
          className="flex items-start justify-between gap-3 rounded-xl border border-border p-4"
        >
          <div className="space-y-0.5">
            <p className="font-mono text-xs text-muted-foreground">
              {payment.referenceNumber}
            </p>
            <p className="text-sm font-medium text-foreground">
              <CurrencyDisplay amount={payment.amount} />
            </p>
            <p className="text-xs text-muted-foreground">
              {METHOD_LABEL[payment.method] ?? payment.method}
              {" · "}
              {new Date(payment.paidAt).toLocaleDateString("en-NG", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <span
              className={
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
                (payment.status === "COMPLETED"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                  : payment.status === "FAILED"
                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300")
              }
            >
              {payment.status.charAt(0) + payment.status.slice(1).toLowerCase()}
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => setDetailId(payment.id)}
                title="Payment details"
              >
                <Info size={11} />
                Details
              </Button>
              {payment.status === "COMPLETED" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => printReceipt(payment.id)}
                  title="Print receipt"
                >
                  <Printer size={11} />
                  Receipt
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}

      <PaymentDetailModal
        paymentId={detailId}
        onClose={() => setDetailId(null)}
      />
    </div>
  )
}

const METHOD_LABEL_FALLBACK = (m: string) => METHOD_LABEL[m] ?? m

function PaymentDetailModal({
  paymentId,
  onClose,
}: {
  paymentId: number | null
  onClose: () => void
}) {
  const { data, isLoading } = usePayment(paymentId)
  const p = data?.data

  const rows: { label: string; value: string | null | undefined }[] = p
    ? [
        { label: "Reference", value: p.referenceNumber },
        { label: "Gateway reference", value: p.gatewayReference },
        { label: "Method", value: METHOD_LABEL_FALLBACK(p.method) },
        { label: "Status", value: p.status },
        {
          label: "Paid",
          value: p.paidAt
            ? new Date(p.paidAt).toLocaleString("en-NG", { dateStyle: "long" })
            : null,
        },
        {
          label: "Verified",
          value: p.verifiedAt
            ? new Date(p.verifiedAt).toLocaleString("en-NG", {
                dateStyle: "long",
              })
            : null,
        },
        { label: "Fee type", value: p.feeTypeName },
        { label: "Invoice", value: p.invoiceNumber },
      ]
    : []

  return (
    <Modal
      open={paymentId !== null}
      onClose={onClose}
      title="Payment details"
      subtitle={p ? undefined : isLoading ? "Loading…" : undefined}
      size="md"
    >
      {isLoading && !p ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : !p ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Couldn&apos;t load this payment.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-2xl font-bold text-foreground">
            <CurrencyDisplay amount={p.amount} />
          </p>
          <div className="divide-y divide-border/60">
            {rows
              .filter((r) => r.value)
              .map((r) => (
                <div
                  key={r.label}
                  className="flex justify-between gap-4 py-2 text-sm"
                >
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="text-right font-medium text-foreground">
                    {r.value}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </Modal>
  )
}
