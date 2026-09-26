"use client"

import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertTriangle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { OUTCOME_LABELS, OUTCOME_ORDER } from "../lib/outcome"
import { fieldError, type ProgressionApiError } from "../lib/errors"
import {
  OverridableOutcomeSchema,
  OverrideRunItemPayloadSchema,
} from "../schemas"
import type { OverridableOutcome, OverrideRunItemPayload } from "../types"

const OVERRIDABLE: OverridableOutcome[] = OUTCOME_ORDER.flatMap((o) => {
  const parsed = OverridableOutcomeSchema.safeParse(o)
  return parsed.success ? [parsed.data] : []
})

interface RunOverrideFormProps {
  /** Unique prefix for field ids (single drawer vs bulk dialog). */
  idPrefix: string
  defaultOutcome?: OverridableOutcome
  submitLabel: string
  pending: boolean
  error: ProgressionApiError | null
  onSubmit: (values: OverrideRunItemPayload) => void
  onCancel: () => void
}

/**
 * New final outcome + required reason, validated with the contract's
 * `OverrideRunItemPayloadSchema`. Shared by the single-student drawer and
 * the bulk-override dialog.
 */
export function RunOverrideForm({
  idPrefix,
  defaultOutcome,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: RunOverrideFormProps) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OverrideRunItemPayload>({
    resolver: zodResolver(OverrideRunItemPayloadSchema),
    defaultValues: { final_outcome: defaultOutcome, override_reason: "" },
  })

  const outcomeId = `${idPrefix}-outcome`
  const reasonId = `${idPrefix}-reason`
  const reasonError =
    errors.override_reason?.message ?? fieldError(error, "override_reason")
  const outcomeError = errors.final_outcome
    ? "Choose an outcome"
    : fieldError(error, "final_outcome")

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            {error.message}
            {error.notAvailable && " Nothing has been changed."}
          </span>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor={outcomeId}>
          New final outcome <span className="text-destructive">*</span>
        </Label>
        <Controller
          control={control}
          name="final_outcome"
          render={({ field }) => (
            <Select value={field.value ?? ""} onValueChange={field.onChange}>
              <SelectTrigger
                id={outcomeId}
                className="w-full"
                aria-invalid={!!outcomeError}
                aria-describedby={
                  outcomeError ? `${outcomeId}-error` : undefined
                }
              >
                <SelectValue placeholder="Choose an outcome" />
              </SelectTrigger>
              <SelectContent>
                {OVERRIDABLE.map((o) => (
                  <SelectItem key={o} value={o}>
                    {OUTCOME_LABELS[o]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {outcomeError && (
          <p id={`${outcomeId}-error`} className="text-xs text-destructive">
            {outcomeError}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={reasonId}>
          Reason <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id={reasonId}
          rows={4}
          placeholder="e.g. Senate decision of 12 Sept; results corrected after appeal"
          aria-required="true"
          aria-invalid={!!reasonError}
          aria-describedby={`${reasonId}-help${reasonError ? ` ${reasonId}-error` : ""}`}
          {...register("override_reason")}
        />
        {reasonError && (
          <p id={`${reasonId}-error`} className="text-xs text-destructive">
            {reasonError}
          </p>
        )}
        <p id={`${reasonId}-help`} className="text-xs text-muted-foreground">
          Every override needs a reason. It is saved with your name and shown
          beside the system&apos;s proposed outcome.
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && (
            <Loader2 className="animate-spin" data-icon="inline-start" />
          )}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
