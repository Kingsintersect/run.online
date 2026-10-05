"use client"

import { AlertCircle, Clock, RefreshCw, ShieldOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ApiClientError } from "@/lib/clients/apiClient"
import { cn } from "@/lib/utils"

// Shared "the request failed" states for read screens, so a refused or
// unbuilt endpoint is never rendered as an honest-looking empty state
// ("No invoices found.", "All caught up.") — testers read those as real data.
// Only a successful empty response should ever show a screen's "no data" copy.

export type QueryErrorKind = "forbidden" | "unavailable" | "failed"

/**
 * 403 → the account isn't permitted; 404/405 → the endpoint isn't built yet
 * (meant for list/report endpoints, where there is no single record to be
 * "not found"); anything else → a plain load failure.
 */
export function classifyQueryError(error: Error | null): QueryErrorKind {
  if (error instanceof ApiClientError) {
    if (error.status === 403) return "forbidden"
    if (error.status === 404 || error.status === 405) return "unavailable"
  }
  return "failed"
}

function copyFor(kind: QueryErrorKind, subject: string) {
  switch (kind) {
    case "forbidden":
      return {
        title: `Your account isn't permitted to view ${subject}.`,
        detail:
          "The server refused this request for your role. Ask an administrator if you need access.",
      }
    case "unavailable":
      return {
        title: `${subject.charAt(0).toUpperCase()}${subject.slice(1)} isn't available yet.`,
        detail:
          "This feature hasn't been switched on on the server yet — it has been flagged for the backend team.",
      }
    default:
      return {
        title: `Couldn't load ${subject}.`,
        detail: null,
      }
  }
}

const TONE: Record<QueryErrorKind, string> = {
  forbidden:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100",
  unavailable:
    "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100",
  failed:
    "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200",
}

const ICON: Record<QueryErrorKind, typeof AlertCircle> = {
  forbidden: ShieldOff,
  unavailable: Clock,
  failed: AlertCircle,
}

interface QueryErrorProps {
  error: Error | null
  /** Plural noun phrase, e.g. "invoices", "the overdue report". */
  subject: string
  /** Shown only for plain failures — retrying a 403/404 can't change the answer. */
  onRetry?: () => void
  className?: string
}

/** Full-block replacement for a list/report body that failed to load. */
export function QueryErrorState({
  error,
  subject,
  onRetry,
  className,
}: QueryErrorProps) {
  const kind = classifyQueryError(error)
  const { title, detail } = copyFor(kind, subject)
  const Icon = ICON[kind]
  return (
    <div
      role={kind === "failed" ? "alert" : "status"}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border px-6 py-10 text-center",
        TONE[kind],
        className
      )}
    >
      <Icon className="size-6 opacity-80" aria-hidden="true" />
      <div className="max-w-md">
        <p className="text-sm font-semibold">{title}</p>
        {(detail ?? error?.message) && (
          <p className="mt-1 text-xs opacity-80">{detail ?? error?.message}</p>
        )}
      </div>
      {kind === "failed" && onRetry && (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw data-icon="inline-start" aria-hidden="true" />
          Retry
        </Button>
      )}
    </div>
  )
}

/** One-line banner for a page whose figures partly failed (cards show "—"). */
export function QueryErrorNotice({
  error,
  subject,
  onRetry,
  className,
}: QueryErrorProps) {
  const kind = classifyQueryError(error)
  const { title, detail } = copyFor(kind, subject)
  const Icon = ICON[kind]
  return (
    <div
      role={kind === "failed" ? "alert" : "status"}
      className={cn(
        "flex flex-wrap items-start gap-3 rounded-xl border px-4 py-3 text-sm",
        TONE[kind],
        className
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        {detail && <p className="mt-0.5 text-xs opacity-80">{detail}</p>}
      </div>
      {kind === "failed" && onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={onRetry}
        >
          <RefreshCw data-icon="inline-start" aria-hidden="true" />
          Retry
        </Button>
      )}
    </div>
  )
}
