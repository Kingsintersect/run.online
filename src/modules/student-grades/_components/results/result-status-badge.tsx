import {
  CheckCircle2,
  CircleDashed,
  Send,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { SheetStatus } from "../../types"

const STATUS_META: Record<
  SheetStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  DRAFT: {
    label: "Draft",
    icon: CircleDashed,
    className:
      "bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
  },
  SUBMITTED: {
    label: "Submitted",
    icon: Send,
    className:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
  APPROVED: {
    label: "Approved",
    icon: ShieldCheck,
    className:
      "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  },
  PUBLISHED: {
    label: "Published",
    icon: CheckCircle2,
    className:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
}

// Icon + text, so status never relies on colour alone.
export function ResultStatusBadge({
  status,
  className,
}: {
  status: SheetStatus
  className?: string
}) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        meta.className,
        className
      )}
    >
      <Icon className="size-3" aria-hidden />
      {meta.label}
    </span>
  )
}
