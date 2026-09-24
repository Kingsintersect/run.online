"use client"

import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SingleAdjustSchema } from "../../schemas"
import { useAdjustGrade } from "../../hooks/use-results-mutations"
import { fieldError, toResultsApiError } from "../../lib/results-errors"
import type { ResultsApiError } from "../../lib/results-errors"
import { fmtScore } from "./format"
import type { ResultSheetRow, SingleAdjustBody } from "../../types"

interface RowAdjustDialogProps {
  offeringId: number
  row: ResultSheetRow | null
  onClose: () => void
}

const DEFAULTS: SingleAdjustBody = {
  component: "CA",
  mode: "ADD",
  value: 0,
  reason: "",
}

// Single-row adjustment (PATCH /results/grades/:id/adjust). ADD shifts the
// component by N marks; SET fills a missing component. The server clamps to
// the component's weight and recomputes — nothing is applied locally.
export function RowAdjustDialog({
  offeringId,
  row,
  onClose,
}: RowAdjustDialogProps) {
  return (
    <Dialog open={row != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {row && (
          <RowAdjustForm
            key={row.gradeId}
            offeringId={offeringId}
            row={row}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

// Keyed by grade, so each opening starts from DEFAULTS without a reset effect.
function RowAdjustForm({
  offeringId,
  row,
  onClose,
}: RowAdjustDialogProps & { row: ResultSheetRow }) {
  const adjust = useAdjustGrade(offeringId)
  const [serverError, setServerError] = useState<ResultsApiError | null>(null)
  const form = useForm<SingleAdjustBody>({
    resolver: zodResolver(SingleAdjustSchema),
    defaultValues: DEFAULTS,
  })

  const submit = form.handleSubmit(async (body) => {
    setServerError(null)
    try {
      await adjust.mutateAsync({ gradeId: row.gradeId, body })
      toast.success(`Adjustment saved for ${row.matricNumber}.`)
      onClose()
    } catch (error) {
      if (error instanceof Error) setServerError(toResultsApiError(error))
    }
  })

  const errors = form.formState.errors
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>Adjust one student</DialogTitle>
        <DialogDescription>
          {row.studentName} ({row.matricNumber}) · raw CA {fmtScore(row.rawCa)},
          raw exam {fmtScore(row.rawExam)}
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-3">
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">Component</legend>
          <Controller
            control={form.control}
            name="component"
            render={({ field }) => (
              <div className="flex gap-3 text-sm">
                {(["CA", "EXAM"] as const).map((c) => (
                  <label key={c} className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      checked={field.value === c}
                      onChange={() => field.onChange(c)}
                      className="accent-primary"
                    />
                    {c === "CA" ? "CA" : "Exam"}
                  </label>
                ))}
              </div>
            )}
          />
        </fieldset>
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">Mode</legend>
          <Controller
            control={form.control}
            name="mode"
            render={({ field }) => (
              <div className="flex gap-3 text-sm">
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    checked={field.value === "ADD"}
                    onChange={() => field.onChange("ADD")}
                    className="accent-primary"
                  />
                  Add marks
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    checked={field.value === "SET"}
                    onChange={() => field.onChange("SET")}
                    className="accent-primary"
                  />
                  Set score
                </label>
              </div>
            )}
          />
        </fieldset>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="row-adjust-value">Marks</Label>
        <Input
          id="row-adjust-value"
          type="number"
          step="0.01"
          aria-invalid={!!errors.value}
          {...form.register("value", { valueAsNumber: true })}
        />
        <p className="text-xs text-destructive">
          {errors.value?.message ?? fieldError(serverError, "value")}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="row-adjust-reason">Reason</Label>
        <Textarea
          id="row-adjust-reason"
          rows={3}
          aria-invalid={!!errors.reason}
          {...form.register("reason")}
        />
        <p className="text-xs text-destructive">
          {errors.reason?.message ?? fieldError(serverError, "reason")}
        </p>
      </div>

      {serverError && Object.keys(serverError.fieldErrors).length === 0 && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
        >
          {serverError.message}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={adjust.isPending}>
          {adjust.isPending && (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          )}
          Save adjustment
        </Button>
      </DialogFooter>
    </form>
  )
}
