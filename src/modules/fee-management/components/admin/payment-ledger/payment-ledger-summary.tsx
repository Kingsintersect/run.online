import { cn } from "@/lib/utils"
import {
  PAYMENT_STATUS_LABEL,
  formatNaira,
  summarizeByStatus,
} from "../../../lib/payment-ledger"
import { PAYMENT_STATUS_TONE } from "../../shared/payment-status-badge"
import type { PaymentLedgerRow } from "../../../types"

/**
 * Count and amount per status for the rows on screen. Labelled "this page"
 * because the endpoint has no aggregate: these are not ledger-wide totals.
 */
export function PaymentLedgerSummary({ rows }: { rows: PaymentLedgerRow[] }) {
  const summary = summarizeByStatus(rows)
  if (summary.length === 0) return null

  return (
    <section
      aria-label="Totals for this page"
      className="flex flex-wrap items-center gap-2"
    >
      <span className="text-xs font-medium text-muted-foreground">
        This page:
      </span>
      {summary.map((s) => (
        <span
          key={s.status}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs",
            PAYMENT_STATUS_TONE[s.status]
          )}
        >
          <span className="font-semibold">
            {PAYMENT_STATUS_LABEL[s.status]}
          </span>
          <span>
            {s.count} ·{" "}
            <span className="tabular-nums">{formatNaira(s.total)}</span>
          </span>
        </span>
      ))}
    </section>
  )
}
