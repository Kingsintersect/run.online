"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
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
import { GradeScaleFormSchema, GradeScaleSetSchema } from "../../schemas"
import { useSaveSchemeScale } from "../../hooks/use-results-mutations"
import {
  fieldError,
  toResultsApiError,
  type ResultsApiError,
} from "../../lib/results-errors"
import type {
  GradeScaleForm,
  ResultGradingScheme,
  SchemeGradeScale,
} from "../../types"

interface ScaleFormDialogProps {
  scheme: ResultGradingScheme | null
  /** Band being edited; null adds a new band to `scheme`. */
  scale: SchemeGradeScale | null
  onClose: () => void
}

// Adds or edits one grade band. Before saving, the whole band set (with this
// change applied) is checked for 0–100 coverage and overlap (C4); the server
// re-validates it.
export function ScaleFormDialog({
  scheme,
  scale,
  onClose,
}: ScaleFormDialogProps) {
  return (
    <Dialog open={scheme != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {scheme && (
          <ScaleForm
            key={scale?.id ?? "new"}
            scheme={scheme}
            scale={scale}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ScaleForm({
  scheme,
  scale,
  onClose,
}: ScaleFormDialogProps & { scheme: ResultGradingScheme }) {
  const save = useSaveSchemeScale()
  const [serverError, setServerError] = useState<ResultsApiError | null>(null)
  const [setWarning, setSetWarning] = useState<string | null>(null)
  const form = useForm<GradeScaleForm>({
    resolver: zodResolver(GradeScaleFormSchema),
    defaultValues: {
      grade: scale?.grade ?? "",
      minScore: scale?.minScore ?? 0,
      maxScore: scale?.maxScore ?? 0,
      gradePoint: scale?.gradePoint ?? null,
      description: scale?.description ?? "",
    },
  })

  const submit = form.handleSubmit(async (body) => {
    const others = (scheme.gradeScales ?? []).filter((s) => s.id !== scale?.id)
    const check = GradeScaleSetSchema.safeParse([
      ...others.map((s) => ({
        grade: s.grade,
        minScore: s.minScore,
        maxScore: s.maxScore,
      })),
      { grade: body.grade, minScore: body.minScore, maxScore: body.maxScore },
    ])
    // Overlaps always block. Gaps/coverage only block once the set is meant
    // to be complete — while bands are being added one by one they're
    // expected, so they're shown as a warning instead.
    const overlap = check.success
      ? undefined
      : check.error.issues.find((i) => i.message.includes("overlap"))
    if (overlap) {
      setSetWarning(overlap.message)
      return
    }
    setServerError(null)
    try {
      await save.mutateAsync({
        schemeId: scheme.id,
        scaleId: scale?.id ?? null,
        body: { ...body, description: body.description || undefined },
      })
      toast.success(scale ? "Band updated." : "Band added.")
      onClose()
    } catch (error) {
      if (error instanceof Error) setServerError(toResultsApiError(error))
    }
  })

  const errors = form.formState.errors
  const err = (f: keyof GradeScaleForm) =>
    errors[f]?.message ?? fieldError(serverError, f)

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>
          {scale ? `Edit band ${scale.grade}` : "Add grade band"}
        </DialogTitle>
        <DialogDescription>{scheme.name}</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="scale-grade">Grade</Label>
          <Input id="scale-grade" maxLength={2} {...form.register("grade")} />
          <p className="text-xs text-destructive">{err("grade")}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="scale-point">Grade point</Label>
          <Input
            id="scale-point"
            type="number"
            step="0.01"
            placeholder="None"
            {...form.register("gradePoint", {
              setValueAs: (v: string | number | null) =>
                v === "" || v == null ? null : Number(v),
            })}
          />
          <p className="text-xs text-destructive">{err("gradePoint")}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="scale-min">Min score</Label>
          <Input
            id="scale-min"
            type="number"
            step="0.01"
            {...form.register("minScore", { valueAsNumber: true })}
          />
          <p className="text-xs text-destructive">{err("minScore")}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="scale-max">Max score</Label>
          <Input
            id="scale-max"
            type="number"
            step="0.01"
            {...form.register("maxScore", { valueAsNumber: true })}
          />
          <p className="text-xs text-destructive">{err("maxScore")}</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="scale-desc">Description</Label>
        <Input
          id="scale-desc"
          maxLength={50}
          {...form.register("description")}
        />
      </div>
      {(setWarning ||
        (serverError && Object.keys(serverError.fieldErrors).length === 0)) && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
        >
          {setWarning ?? serverError?.message}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          )}
          Save band
        </Button>
      </DialogFooter>
    </form>
  )
}
