"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useReversePromotionRun } from "../hooks/use-progression-mutations"
import { fieldError, toProgressionApiError } from "../lib/errors"
import { ReversePayloadSchema } from "../schemas"
import type { PromotionRun, ReversePayload } from "../types"

interface RunReverseDialogProps {
  run: PromotionRun
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Undo a committed run while it is still reversible (reason required). */
export function RunReverseDialog({
  run,
  open,
  onOpenChange,
}: RunReverseDialogProps) {
  const reverse = useReversePromotionRun(run.id)
  const error = reverse.error ? toProgressionApiError(reverse.error) : null

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReversePayload>({
    resolver: zodResolver(ReversePayloadSchema),
    defaultValues: { reason: "" },
  })

  function change(next: boolean) {
    if (!next) {
      reset()
      reverse.reset()
    }
    onOpenChange(next)
  }

  function submit(payload: ReversePayload) {
    reverse.mutate(payload, {
      onSuccess: () => {
        toast.success("Run reversed")
        change(false)
      },
    })
  }

  const reasonError = errors.reason?.message ?? fieldError(error, "reason")

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit(submit)} noValidate className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Reverse this run?</DialogTitle>
            <DialogDescription>
              Students&apos; standings in {run.target_session.name} are voided
              and they return to where they were before the commit. This is only
              possible until students start registering.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error.message}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="reverse-reason">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reverse-reason"
              rows={3}
              aria-required="true"
              aria-invalid={!!reasonError}
              aria-describedby={
                reasonError ? "reverse-reason-error" : undefined
              }
              placeholder="e.g. Committed against the wrong target session"
              {...register("reason")}
            />
            {reasonError && (
              <p id="reverse-reason-error" className="text-xs text-destructive">
                {reasonError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => change(false)}
              disabled={reverse.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={reverse.isPending}
            >
              {reverse.isPending && (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              )}
              Reverse run
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
