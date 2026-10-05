"use client"

import { useEffect, useMemo } from "react"
import { ArrowRight, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useResetAvailability,
  useResetGroups,
} from "../hooks/use-instance-reset"
import {
  usePreviewReset,
  useStartResetRun,
} from "../hooks/use-instance-reset-mutations"
import { usePreviewCountdown } from "../hooks/use-preview-countdown"
import { parseResetError } from "../lib/reset-errors"
import { useInstanceResetUiStore } from "../store/instance-reset-ui.store"
import type { PreviewPayload, ResetTarget } from "../types"
import { CountText } from "./reset-badges"
import { ResetErrorAlert } from "./reset-error-alert"
import { PreviewCountdown, ResetPreviewStep } from "./reset-preview-step"
import { ResetRunProgress } from "./reset-run-progress"
import { TypedConfirmationForm } from "./typed-confirmation-form"

function payloadFor(target: ResetTarget): PreviewPayload {
  return { groups: target.kind === "all" ? "all" : [target.key] }
}

/**
 * The reset flow in one focus-trapped dialog:
 * 1. POST /preview → what will go (with an expiry countdown);
 * 2. type the institution name + password → POST /runs;
 * 3. watch GET /runs/{id} until it finishes.
 * Also opens straight at step 3 to watch an active or past run.
 */
export function ResetFlowDialog() {
  const flow = useInstanceResetUiStore((s) => s.flow)
  const goToStep = useInstanceResetUiStore((s) => s.goToStep)
  const watchRun = useInstanceResetUiStore((s) => s.watchRun)
  const closeFlow = useInstanceResetUiStore((s) => s.closeFlow)
  const { labelFor } = useResetGroups()
  const { canReset, resetBlockedReason, status, refetchStatus } =
    useResetAvailability()

  const preview = usePreviewReset()
  const run = useStartResetRun()

  const target = flow?.target ?? null
  const step = flow?.step ?? null
  const { mutate: requestPreview, isIdle: previewIdle } = preview

  // Opening the flow fetches its preview once; closing resets the mutation.
  useEffect(() => {
    if (step === "preview" && target && previewIdle && canReset)
      requestPreview(payloadFor(target))
  }, [step, target, previewIdle, canReset, requestPreview])

  const previewData = preview.data ?? null
  const secondsLeft = usePreviewCountdown(previewData?.expiresAt ?? null)
  const expired = previewData !== null && secondsLeft === 0

  // Memoised so the form doesn't re-apply a field error on every tick.
  const previewError = useMemo(
    () => (preview.error ? parseResetError(preview.error) : null),
    [preview.error]
  )
  const runError = useMemo(
    () => (run.error ? parseResetError(run.error) : null),
    [run.error]
  )

  const close = () => {
    if (run.isPending) return
    closeFlow()
    preview.reset()
    run.reset()
  }

  // Back to step 1 with an idle mutation: the effect above fetches it again.
  const previewAgain = () => {
    if (!target) return
    run.reset()
    preview.reset()
    goToStep("preview")
  }

  const activeRunId = status?.activeRun?.id ?? null
  const viewActiveRun = activeRunId
    ? () => {
        preview.reset()
        run.reset()
        watchRun(activeRunId)
      }
    : undefined

  const targetLabel = !target
    ? "Reset run"
    : target.kind === "all"
      ? "Everything (factory reset)"
      : labelFor(target.key)

  const title =
    step === "progress"
      ? "Reset progress"
      : step === "confirm"
        ? `Confirm: clear ${targetLabel}`
        : `Preview: clear ${targetLabel}`

  return (
    <Dialog open={flow !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"
        onEscapeKeyDown={(e) => run.isPending && e.preventDefault()}
        onInteractOutside={(e) => run.isPending && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {step === "progress"
              ? "Live progress from the server, refreshed every couple of seconds."
              : "Deleted rows can't be recovered from the portal. The server takes a database backup first."}
          </DialogDescription>
        </DialogHeader>

        {step === "progress" && flow?.runId ? (
          <>
            <ResetRunProgress runId={flow.runId} labelFor={labelFor} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                Close
              </Button>
            </DialogFooter>
          </>
        ) : !canReset ? (
          <>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              {resetBlockedReason}
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                Close
              </Button>
            </DialogFooter>
          </>
        ) : step === "preview" ? (
          <>
            {preview.isPending ? (
              <div
                className="space-y-3"
                aria-busy="true"
                aria-label="Preparing preview"
              >
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            ) : previewError ? (
              <ResetErrorAlert
                error={previewError}
                onPreviewAgain={previewAgain}
                onViewActiveRun={viewActiveRun}
              />
            ) : previewData ? (
              <ResetPreviewStep
                preview={previewData}
                labelFor={labelFor}
                secondsLeft={secondsLeft}
              />
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>
              {(previewError || expired) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={previewAgain}
                  disabled={preview.isPending}
                >
                  {preview.isPending && (
                    <Loader2
                      className="animate-spin"
                      data-icon="inline-start"
                      aria-hidden="true"
                    />
                  )}
                  Preview again
                </Button>
              )}
              <Button
                type="button"
                variant="destructive"
                disabled={!previewData || expired || preview.isPending}
                onClick={() => {
                  // The name to type can change (a full reset may set it to a
                  // default), so read it fresh rather than from cache.
                  refetchStatus()
                  goToStep("confirm")
                }}
              >
                Continue
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
            </DialogFooter>
          </>
        ) : step === "confirm" && previewData && status ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100">
              <span>
                <CountText
                  value={previewData.totalRows}
                  className="font-semibold"
                />{" "}
                rows across {previewData.resolvedGroups.length} group
                {previewData.resolvedGroups.length === 1 ? "" : "s"} will be
                deleted.
              </span>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-red-900 dark:text-red-100"
                disabled={run.isPending}
                onClick={() => goToStep("preview")}
              >
                Back to preview
              </Button>
            </div>
            <PreviewCountdown secondsLeft={secondsLeft} />
            {runError && !runError.field && (
              <ResetErrorAlert
                error={runError}
                onPreviewAgain={previewAgain}
                onViewActiveRun={viewActiveRun}
              />
            )}
            <TypedConfirmationForm
              institutionName={status.institutionName}
              submitLabel="Delete permanently"
              isPending={run.isPending}
              serverError={runError}
              blockedReason={
                expired
                  ? "The preview has expired. Preview again before confirming."
                  : null
              }
              onCancel={close}
              onSubmit={(values) =>
                run.start(
                  { previewId: previewData.previewId, ...values },
                  {
                    onSuccess: (summary) => {
                      toast.success("Reset started")
                      preview.reset()
                      watchRun(summary.id, target)
                    },
                  }
                )
              }
            />
          </div>
        ) : (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Close
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
