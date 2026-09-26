"use client"

import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useDiscardPromotionRun } from "../hooks/use-progression-mutations"
import { toProgressionApiError } from "../lib/errors"
import type { PromotionRun } from "../types"

interface RunDiscardDialogProps {
  run: PromotionRun
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Confirm, then throw away an uncommitted run (overrides are lost). */
export function RunDiscardDialog({
  run,
  open,
  onOpenChange,
}: RunDiscardDialogProps) {
  const discard = useDiscardPromotionRun(run.id)
  const error = discard.error ? toProgressionApiError(discard.error) : null

  function change(next: boolean) {
    if (!next) discard.reset()
    onOpenChange(next)
  }

  return (
    <AlertDialog open={open} onOpenChange={change}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard this run?</AlertDialogTitle>
          <AlertDialogDescription>
            The preview for {run.source_session.name} →{" "}
            {run.target_session.name} and all {run.override_count} override
            {run.override_count === 1 ? "" : "s"} made on it will be thrown
            away. No student&apos;s standing changes. You can start a new run
            later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={discard.isPending}>
            Keep run
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={discard.isPending}
            onClick={(e) => {
              e.preventDefault()
              discard.mutate(undefined, {
                onSuccess: () => {
                  toast.success("Run discarded")
                  change(false)
                },
              })
            }}
          >
            {discard.isPending && (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            )}
            Discard run
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
