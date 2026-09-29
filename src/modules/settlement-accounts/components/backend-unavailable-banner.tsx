import { Info } from "lucide-react"
import { cn } from "@/lib/utils"

export const SAVE_DISABLED_REASON =
  "Saving is disabled until the backend ships sandbox/payment-routing."

export function BackendUnavailableBanner({
  className,
}: {
  className?: string
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex gap-3 rounded-xl border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200",
        className
      )}
    >
      <Info size={16} className="mt-0.5 shrink-0" aria-hidden />
      <p>
        Settlement accounts and splits aren&apos;t available on the server yet;
        you can prepare and preview, but saving is disabled until the backend
        ships <code className="font-mono text-xs">sandbox/payment-routing</code>
        .
      </p>
    </div>
  )
}
