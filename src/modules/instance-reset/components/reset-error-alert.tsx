"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ResetError } from "../lib/reset-errors"

interface ResetErrorAlertProps {
  error: ResetError
  /** Offered for PREVIEW_EXPIRED / PREVIEW_STALE. */
  onPreviewAgain?: () => void
  /** Offered for RUN_IN_PROGRESS when the active run is known. */
  onViewActiveRun?: () => void
  className?: string
}

/** An inline error next to the step that caused it, with its next action. */
export function ResetErrorAlert({
  error,
  onPreviewAgain,
  onViewActiveRun,
  className,
}: ResetErrorAlertProps) {
  const extraFields = Object.entries(error.fieldErrors).filter(
    ([key]) => key !== "confirmation" && key !== "password"
  )
  return (
    <div
      role="alert"
      className={cn(
        "flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200",
        className
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-2">
        <p>{error.message}</p>
        {error.code === "VALIDATION" && extraFields.length > 1 && (
          <ul className="list-disc space-y-0.5 pl-4 text-xs">
            {extraFields.map(([key, msg]) => (
              <li key={key}>{msg}</li>
            ))}
          </ul>
        )}
        {(error.needsNewPreview && onPreviewAgain) ||
        (error.code === "RUN_IN_PROGRESS" && onViewActiveRun) ? (
          <div className="flex flex-wrap gap-2">
            {error.needsNewPreview && onPreviewAgain && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onPreviewAgain}
              >
                <RefreshCw data-icon="inline-start" aria-hidden="true" />
                Preview again
              </Button>
            )}
            {error.code === "RUN_IN_PROGRESS" && onViewActiveRun && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onViewActiveRun}
              >
                View the running reset
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
