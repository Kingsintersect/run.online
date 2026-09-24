import type { ReactNode } from "react"
import { Hourglass } from "lucide-react"
import { cn } from "@/lib/utils"

interface NotAvailableNoticeProps {
  title: string
  description?: string
  children?: ReactNode
  className?: string
}

// The honest "not available yet" state (CLAUDE.md §14): shown when a
// contract endpoint doesn't exist on the backend yet. Never paired with
// placeholder numbers.
export function NotAvailableNotice({
  title,
  description = "The server doesn't provide this yet. It has been flagged for the backend team and will appear here automatically once it ships.",
  children,
  className,
}: NotAvailableNoticeProps) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/5 p-5 dark:bg-amber-500/10",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Hourglass
          className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden
        />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
