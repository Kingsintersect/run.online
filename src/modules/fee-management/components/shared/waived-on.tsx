import { BadgeCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { getInvoiceWaiver } from "../../lib/invoice-waiver"
import type { InvoiceResponse } from "../../types"

/** "Waived on 28 Sep 2026" for a WAIVED invoice; nothing otherwise. */
export function WaivedOn({
  invoice,
  className,
}: {
  invoice: InvoiceResponse
  className?: string
}) {
  const waiver = getInvoiceWaiver(invoice)
  if (!waiver) return null
  const at = waiver.at ? new Date(waiver.at) : null
  const date =
    at && !Number.isNaN(at.getTime())
      ? at.toLocaleDateString("en-NG", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : null
  return (
    <p
      className={cn(
        "flex items-center gap-1.5 text-xs text-teal-700 dark:text-teal-300",
        className
      )}
    >
      <BadgeCheck size={12} aria-hidden="true" />
      {date ? `Waived on ${date}` : "Waived"}
      {waiver.reason ? ` · ${waiver.reason}` : ""}
    </p>
  )
}
