"use client"

import { cn } from "@/lib/utils"
import { CurrencyDisplay } from "../../shared/currency-display"
import { PaymentStatusBadge } from "../../shared/payment-status-badge"
import {
  PAYMENT_METHOD_LABEL,
  formatDateTime,
  ledgerDate,
} from "../../../lib/payment-ledger"
import type { PaymentLedgerRow } from "../../../types"

const TH =
  "px-3 py-3 text-left font-medium whitespace-nowrap text-muted-foreground"
const TD = "px-3 py-3 align-top"

interface PaymentLedgerTableProps {
  rows: PaymentLedgerRow[]
  onSelect: (id: number) => void
  /** True while the next page is loading over the current one. */
  isFetching?: boolean
}

export function PaymentLedgerTable({
  rows,
  onSelect,
  isFetching,
}: PaymentLedgerTableProps) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-xl border border-border transition-opacity",
        isFetching && "opacity-60"
      )}
      aria-busy={isFetching}
    >
      <table className="w-full min-w-[1100px] text-sm">
        <caption className="sr-only">
          Payments. Select a reference to see the full record.
        </caption>
        <thead>
          <tr className="border-b border-border bg-muted/50 dark:bg-muted/30">
            <th scope="col" className={TH}>
              Date
            </th>
            <th scope="col" className={TH}>
              Reference
            </th>
            <th scope="col" className={TH}>
              Student
            </th>
            <th scope="col" className={TH}>
              Programme
            </th>
            <th scope="col" className={TH}>
              Fee type
            </th>
            <th scope="col" className={TH}>
              Invoice
            </th>
            <th scope="col" className={TH}>
              Session
            </th>
            <th scope="col" className={TH}>
              Method
            </th>
            <th scope="col" className={cn(TH, "text-right")}>
              Amount
            </th>
            <th scope="col" className={TH}>
              Status
            </th>
            <th scope="col" className={TH}>
              Verified via
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30 dark:hover:bg-muted/20"
            >
              <td className={cn(TD, "text-xs whitespace-nowrap")}>
                {formatDateTime(ledgerDate(row))}
              </td>
              <td className={TD}>
                <button
                  type="button"
                  onClick={() => onSelect(row.id)}
                  className="rounded font-mono text-xs text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  aria-label={`View payment ${row.referenceNumber}`}
                >
                  {row.referenceNumber}
                </button>
              </td>
              <td className={TD}>
                {row.student ? (
                  <div>
                    <p className="text-xs font-medium">
                      {row.student.fullName ?? "—"}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {row.student.matricNumber ?? "—"}
                    </p>
                  </div>
                ) : (
                  <span className="inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800 dark:bg-sky-900/30 dark:text-sky-200">
                    Applicant
                  </span>
                )}
              </td>
              <td className={cn(TD, "text-xs")}>
                {row.student?.programName ?? "—"}
                {row.majorProgramName && (
                  <p className="text-[11px] text-muted-foreground">
                    {row.majorProgramName}
                  </p>
                )}
              </td>
              <td className={cn(TD, "text-xs")}>
                {row.invoice?.feeType?.name ?? "—"}
              </td>
              <td className={cn(TD, "font-mono text-xs")}>
                {row.invoice?.invoiceNumber ?? "—"}
              </td>
              <td className={cn(TD, "text-xs whitespace-nowrap")}>
                {row.invoice?.session?.name ?? "—"}
              </td>
              <td className={cn(TD, "text-xs whitespace-nowrap")}>
                {PAYMENT_METHOD_LABEL[row.method]}
              </td>
              <td
                className={cn(TD, "text-right font-medium whitespace-nowrap")}
              >
                <CurrencyDisplay amount={row.amount} />
              </td>
              <td className={TD}>
                <PaymentStatusBadge status={row.status} />
              </td>
              <td className={cn(TD, "text-xs text-muted-foreground")}>
                {row.verifiedVia ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
