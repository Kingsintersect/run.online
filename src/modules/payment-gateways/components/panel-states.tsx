"use client"

import { AlertCircle, Info, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function ErrorState({
  title,
  error,
  onRetry,
}: {
  title: string
  error: Error | null
  onRetry: () => void
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center dark:border-red-900 dark:bg-red-950/30"
    >
      <AlertCircle
        className="size-6 text-red-600 dark:text-red-400"
        aria-hidden="true"
      />
      <div>
        <p className="text-sm font-semibold text-red-800 dark:text-red-200">
          {title}
        </p>
        {error?.message && (
          <p className="mt-1 text-xs text-red-700 dark:text-red-300">
            {error.message}
          </p>
        )}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw data-icon="inline-start" aria-hidden="true" />
        Retry
      </Button>
    </div>
  )
}

export function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="space-y-3 rounded-2xl border border-border bg-card p-5"
        >
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

/** Honest "the backend isn't built yet" note (CLAUDE.md §14). */
export function FallbackNotice({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      role="note"
      className={cn(
        "flex gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100",
        className
      )}
    >
      <Info
        className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-300"
        aria-hidden="true"
      />
      <div>{children}</div>
    </div>
  )
}
