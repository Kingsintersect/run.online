import { cn } from "@/lib/utils"
import { PAYMENT_STATUS_LABEL } from "../../lib/payment-ledger"
import type { PaymentStatus } from "../../types"

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, string> = {
  COMPLETED:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  PENDING:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  FAILED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  REFUNDED: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
}

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: PaymentStatus
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        PAYMENT_STATUS_TONE[status],
        className
      )}
    >
      {PAYMENT_STATUS_LABEL[status]}
    </span>
  )
}
