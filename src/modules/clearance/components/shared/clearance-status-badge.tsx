import { Clock3, CheckCircle2, XCircle, MinusCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ClearanceSummaryStatus } from "../../types"

const STATUS_STYLES: Record<
  ClearanceSummaryStatus,
  { label: string; icon: typeof Clock3; className: string }
> = {
  PENDING: {
    label: "Pending",
    icon: Clock3,
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  APPROVED: {
    label: "Approved",
    icon: CheckCircle2,
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  REJECTED: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  },
  NOT_REQUESTED: {
    label: "Not Requested",
    icon: MinusCircle,
    className: "bg-muted text-muted-foreground border-border",
  },
}

export function ClearanceStatusBadge({
  status,
}: {
  status: ClearanceSummaryStatus
}) {
  const { label, icon: Icon, className } = STATUS_STYLES[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        className
      )}
    >
      <Icon size={11} />
      {label}
    </span>
  )
}
