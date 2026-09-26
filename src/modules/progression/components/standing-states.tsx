import type { ReactNode } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

// Shared heading / loading / error states for the standing and academic
// history panels.

export function SectionHeading({
  id,
  icon,
  children,
}: {
  id: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <h3
      id={id}
      className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"
    >
      {icon}
      {children}
    </h3>
  )
}

export function QueryError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"
    >
      <span className="flex items-center gap-2">
        <AlertTriangle size={14} aria-hidden />
        {message}
      </span>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

export function LoadingBlock({ rows = 2 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  )
}
