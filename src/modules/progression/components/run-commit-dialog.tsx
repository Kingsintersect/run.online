"use client"

import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { AlertTriangle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useCommitPromotionRun } from "../hooks/use-progression-mutations"
import { fieldError, toProgressionApiError } from "../lib/errors"
import { OUTCOME_LABELS, OUTCOME_ORDER } from "../lib/outcome"
import { commitRunFormSchema } from "../schemas"
import type { CommitRunPayload, PromotionRun } from "../types"

interface RunCommitDialogProps {
  run: PromotionRun
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Summarises the counts and requires typing the target session's name
 * (checked client-side by `commitRunFormSchema`, re-checked by the server).
 */
export function RunCommitDialog({
  run,
  open,
  onOpenChange,
}: RunCommitDialogProps) {
  const commit = useCommitPromotionRun(run.id)
  const error = commit.error ? toProgressionApiError(commit.error) : null
  const targetName = run.target_session.name
  const schema = useMemo(() => commitRunFormSchema(targetName), [targetName])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommitRunPayload>({
    resolver: zodResolver(schema),
    defaultValues: { confirm_target_session_name: "" },
  })

  const total = Object.values(run.counts).reduce((a, b) => a + b, 0)
  const rows = OUTCOME_ORDER.filter((o) => (run.counts[o] ?? 0) > 0)

  function change(next: boolean) {
    if (!next) {
      reset()
      commit.reset()
    }
    onOpenChange(next)
  }

  function submit(payload: CommitRunPayload) {
    commit.mutate(payload, {
      onSuccess: () => {
        toast.success("Commit started — standings are being written")
        change(false)
      },
    })
  }

  const nameError =
    errors.confirm_target_session_name?.message ??
    fieldError(error, "confirm_target_session_name")

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit(submit)} noValidate className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Commit promotion run</DialogTitle>
            <DialogDescription>
              This writes every student&apos;s final outcome into{" "}
              <strong className="text-foreground">{targetName}</strong> and adds
              their carryovers. It can be reversed only until students start
              registering.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm dark:bg-muted/20">
            <table className="w-full">
              <caption className="sr-only">Final outcome counts</caption>
              <tbody>
                {rows.map((o) => (
                  <tr key={o}>
                    <th
                      scope="row"
                      className="py-0.5 text-left font-normal text-muted-foreground"
                    >
                      {OUTCOME_LABELS[o]}
                    </th>
                    <td className="py-0.5 text-right tabular-nums">
                      {(run.counts[o] ?? 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-border">
                  <th scope="row" className="pt-1.5 text-left font-medium">
                    Total students
                  </th>
                  <td className="pt-1.5 text-right font-medium tabular-nums">
                    {total.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <th
                    scope="row"
                    className="py-0.5 text-left font-normal text-muted-foreground"
                  >
                    Overridden
                  </th>
                  <td className="py-0.5 text-right tabular-nums">
                    {run.override_count.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {run.exception_count > 0 && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {run.exception_count.toLocaleString()} student
              {run.exception_count === 1 ? " has" : "s have"} exceptions. Review
              them before committing.
            </p>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error.message}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="commit-confirm-name">
              Type <span className="font-semibold">{targetName}</span> to
              confirm
            </Label>
            <Input
              id="commit-confirm-name"
              autoComplete="off"
              spellCheck={false}
              aria-required="true"
              aria-invalid={!!nameError}
              aria-describedby={nameError ? "commit-confirm-error" : undefined}
              {...register("confirm_target_session_name")}
            />
            {nameError && (
              <p id="commit-confirm-error" className="text-xs text-destructive">
                {nameError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => change(false)}
              disabled={commit.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={commit.isPending}>
              {commit.isPending && (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              )}
              Commit run
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
