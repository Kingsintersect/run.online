import { Clock3, CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DocumentStatus } from "../../types"

const STATUS_STYLES: Record<
  DocumentStatus,
  { label: string; icon: typeof Clock3; className: string }
> = {
  pending: {
    label: "Pending",
    icon: Clock3,
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  verified: {
    label: "Verified",
    icon: CheckCircle2,
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  },
}

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
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
