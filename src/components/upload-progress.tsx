"use client"

import { AlertCircle, CheckCircle2, Loader2, UploadCloud } from "lucide-react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import type { UploadStage } from "@/lib/uploads"

export interface UploadProgressProps {
  stage: UploadStage
  /** Bytes-sent percentage, 0–100. Only read during the `uploading` stage. */
  percent: number
  /** Overrides the default copy for the current stage. */
  message?: string
  className?: string
}

const DEFAULT_MESSAGES: Record<Exclude<UploadStage, "idle">, string> = {
  preparing: "Preparing your submission…",
  uploading: "Uploading your documents…",
  processing: "Upload complete — finalising your submission…",
  done: "Submitted successfully",
  error: "Submission failed",
}

/**
 * Progress readout for any multipart submission — the admission application,
 * a document upload, or anything else that ships files to the API.
 *
 * Renders nothing while `stage` is `"idle"`, so callers can mount it
 * unconditionally. The live region announces stage changes to screen readers
 * without announcing every percentage tick.
 */
export function UploadProgress({
  stage,
  percent,
  message,
  className,
}: UploadProgressProps) {
  if (stage === "idle") return null

  const text = message ?? DEFAULT_MESSAGES[stage]
  const isUploading = stage === "uploading"
  const isError = stage === "error"
  const isDone = stage === "done"

  return (
    <div
      className={cn(
        "space-y-2 rounded-lg border p-4",
        isError
          ? "border-destructive/40 bg-destructive/5"
          : isDone
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-border bg-muted/30",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {isError ? (
          <AlertCircle className="size-4 shrink-0 text-destructive" />
        ) : isDone ? (
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ) : isUploading ? (
          <UploadCloud className="size-4 shrink-0 text-primary" />
        ) : (
          <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
        )}

        <p
          aria-live="polite"
          className={cn(
            "flex-1 text-sm font-medium",
            isError
              ? "text-destructive"
              : isDone
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-foreground"
          )}
        >
          {text}
        </p>

        {isUploading && (
          <span className="text-sm font-semibold text-muted-foreground tabular-nums">
            {Math.round(percent)}%
          </span>
        )}
      </div>

      {!isError && (
        <Progress
          label="Submission progress"
          value={isUploading ? percent : isDone ? 100 : null}
          indicatorClassName={cn(isDone && "bg-emerald-500")}
        />
      )}

      {stage === "processing" && (
        <p className="text-xs text-muted-foreground">
          Please keep this page open — this can take a moment on a slow
          connection.
        </p>
      )}
    </div>
  )
}
