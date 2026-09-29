"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Account number shown as ••••••1234 with a reveal toggle. It isn't a secret
 * (it's printed on invoices), so revealing needs no extra protection.
 */
export function MaskedAccountNumber({
  value,
  className,
}: {
  value: string
  className?: string
}) {
  const [revealed, setRevealed] = useState(false)
  const masked = `${"•".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="font-mono text-sm tracking-wider text-foreground tabular-nums">
        {revealed ? value : masked}
      </span>
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        aria-label={revealed ? "Hide account number" : "Show account number"}
        aria-pressed={revealed}
        className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {revealed ? (
          <EyeOff size={13} aria-hidden />
        ) : (
          <Eye size={13} aria-hidden />
        )}
      </button>
    </span>
  )
}
