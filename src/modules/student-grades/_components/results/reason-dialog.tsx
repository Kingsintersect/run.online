"use client"

import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toResultsApiError } from "../../lib/results-errors"

interface ReasonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  label: string
  confirmLabel: string
  /** 0 = optional; otherwise the minimum number of characters required. */
  minLength: number
  destructive?: boolean
  onConfirm: (text: string) => Promise<void>
}

// Shared comment/reason prompt for reject, reopen, revert and the approval
// queue's approve/reject. The server's own message (409 state conflict,
// 422 validation) is shown inline; the typed text is kept on failure.
// The form lives in DialogContent, which unmounts on close, so every
// opening starts clean without a reset effect.
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  ...formProps
}: ReasonDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <ReasonForm {...formProps} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function ReasonForm({
  label,
  confirmLabel,
  minLength,
  destructive,
  onConfirm,
  onDone,
}: Pick<
  ReasonDialogProps,
  "label" | "confirmLabel" | "minLength" | "destructive" | "onConfirm"
> & { onDone: () => void }) {
  const schema = useMemo(
    () =>
      z.object({
        text:
          minLength > 0
            ? z
                .string()
                .trim()
                .min(
                  minLength,
                  minLength === 1
                    ? "This is required."
                    : `Write at least ${minLength} characters.`
                )
            : z.string().trim().max(500),
      }),
    [minLength]
  )
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { text: "" },
  })
  const [serverError, setServerError] = useState<string | null>(null)

  const submit = form.handleSubmit(async ({ text }) => {
    setServerError(null)
    try {
      await onConfirm(text)
      onDone()
    } catch (error) {
      if (error instanceof Error) {
        const e = toResultsApiError(error)
        const field = Object.values(e.fieldErrors)[0]?.[0]
        setServerError(field ?? e.message)
      }
    }
  })

  const fieldId = "reason-dialog-text"
  const errorText = form.formState.errors.text?.message

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor={fieldId}>
          {label}
          {minLength === 0 && (
            <span className="font-normal text-muted-foreground">
              {" "}
              (optional)
            </span>
          )}
        </Label>
        <Textarea
          id={fieldId}
          rows={4}
          aria-invalid={!!errorText}
          aria-describedby={errorText ? `${fieldId}-error` : undefined}
          {...form.register("text")}
        />
        {errorText && (
          <p id={`${fieldId}-error`} className="text-xs text-destructive">
            {errorText}
          </p>
        )}
      </div>
      {serverError && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
        >
          {serverError}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant={destructive ? "destructive" : "default"}
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting && (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          )}
          {confirmLabel}
        </Button>
      </DialogFooter>
    </form>
  )
}
