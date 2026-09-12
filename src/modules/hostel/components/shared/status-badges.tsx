import { cn } from "@/lib/utils"
import type { AllocationStatus } from "../../types"

export function ActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        isActive
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "border-border bg-muted text-muted-foreground"
      )}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  )
}

export function AllocationStatusBadge({
  status,
}: {
  status: AllocationStatus
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        status === "active"
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400"
      )}
    >
      {status === "active" ? "Active" : "Vacated"}
    </span>
  )
}
