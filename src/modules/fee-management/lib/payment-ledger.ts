import { ApiClientError } from "@/lib/clients/apiClient"
import { OutOfScopeErrorBodySchema } from "../schemas/payment-ledger.schema"
import type {
  OutOfScopeErrorBody,
  PaymentLedgerRow,
  PaymentStatus,
  RecordedPaymentMethod,
} from "../types"

export const PAYMENT_METHOD_LABEL: Record<RecordedPaymentMethod, string> = {
  GATEWAY: "Online Gateway",
  GATEWAY_TRANSFER: "Online Gateway (transfer)",
  GATEWAY_CARD: "Online Gateway (card)",
  CARD: "Card",
  USSD: "USSD",
  BANK_TRANSFER: "Bank Transfer",
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  COMPLETED: "Completed",
  FAILED: "Failed",
  REFUNDED: "Refunded",
}

export const PAYMENT_STATUSES: PaymentStatus[] = [
  "COMPLETED",
  "PENDING",
  "FAILED",
  "REFUNDED",
]

/** paidAt, else createdAt — the same instant the server's date filter uses. */
export function ledgerDate(row: PaymentLedgerRow): string | null {
  return row.paidAt ?? row.createdAt
}

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
})

export const formatNaira = (amount: number): string =>
  nairaFormatter.format(amount)

export function formatDateTime(value: string | null): string {
  if (!value) return "—"
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })
}

export interface StatusSummary {
  status: PaymentStatus
  count: number
  total: number
}

/** Count and amount per status for the rows currently loaded (one page). */
export function summarizeByStatus(rows: PaymentLedgerRow[]): StatusSummary[] {
  return PAYMENT_STATUSES.map((status) => {
    const matching = rows.filter((r) => r.status === status)
    return {
      status,
      count: matching.length,
      total: matching.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    }
  }).filter((s) => s.count > 0)
}

/** The 403 OUT_OF_SCOPE body, or null for any other error. */
export function getOutOfScopeError(
  error: Error | null
): OutOfScopeErrorBody | null {
  if (!(error instanceof ApiClientError) || error.status !== 403) return null
  const parsed = OutOfScopeErrorBodySchema.safeParse(error.data)
  if (parsed.success) return parsed.data
  // Older flat body: { message: "OUT_OF_SCOPE: …" } (see src/lib/errors.ts).
  return error.message.startsWith("OUT_OF_SCOPE")
    ? { error: "OUT_OF_SCOPE", message: error.message }
    : null
}

// ── CSV export (current page only, built from the loaded rows) ─────────────

function csvCell(value: string | number | null): string {
  const text = value === null ? "" : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const CSV_HEADER = [
  "Date",
  "Reference",
  "Student",
  "Matric number",
  "Programme",
  "Major program",
  "Fee type",
  "Invoice number",
  "Session",
  "Method",
  "Amount",
  "Status",
  "Verified via",
  "Gateway transaction id",
  "Verified at",
]

export function paymentLedgerToCsv(rows: PaymentLedgerRow[]): string {
  const lines = rows.map((r) =>
    [
      ledgerDate(r),
      r.referenceNumber,
      r.student ? r.student.fullName : "Applicant",
      r.student?.matricNumber ?? null,
      r.student?.programName ?? null,
      r.majorProgramName,
      r.invoice?.feeType?.name ?? null,
      r.invoice?.invoiceNumber ?? null,
      r.invoice?.session?.name ?? null,
      PAYMENT_METHOD_LABEL[r.method],
      r.amount,
      PAYMENT_STATUS_LABEL[r.status],
      r.verifiedVia,
      r.gatewayTransactionId,
      r.verifiedAt,
    ]
      .map(csvCell)
      .join(",")
  )
  return [CSV_HEADER.map(csvCell).join(","), ...lines].join("\r\n")
}

/** Triggers a browser download of `csv` (BOM so Excel reads ₦ / UTF-8). */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
