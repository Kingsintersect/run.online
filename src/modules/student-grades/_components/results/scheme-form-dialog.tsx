"use client"

import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { GradingSchemeFormSchema } from "../../schemas"
import {
  useCreateScheme,
  useUpdateScheme,
} from "../../hooks/use-results-mutations"
import {
  fieldError,
  toResultsApiError,
  type ResultsApiError,
} from "../../lib/results-errors"
import type { GradingSchemeForm, ResultGradingScheme } from "../../types"

const nullableNumber = {
  setValueAs: (v: string | number | null) =>
    v === "" || v == null ? null : Number(v),
}

const SCHEME_TYPES = [
  { value: "CREDIT_WEIGHTED_GPA", label: "Credit-weighted GPA" },
  { value: "SIMPLE_AVERAGE", label: "Simple average (e.g. WAEC)" },
  { value: "PASS_FAIL", label: "Pass / fail" },
] as const

interface SchemeFormDialogProps {
  open: boolean
  onClose: () => void
  /** Editing an existing scheme; null creates one. */
  scheme: ResultGradingScheme | null
  majorPrograms: { id: number; name: string }[]
  defaultMajorProgramId: number | null
}

export function SchemeFormDialog(props: SchemeFormDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={(o) => !o && props.onClose()}>
      <DialogContent>
        <SchemeForm key={props.scheme?.id ?? "new"} {...props} />
      </DialogContent>
    </Dialog>
  )
}

// Mounted fresh on every opening (DialogContent unmounts when closed), so
// the defaults are computed once here instead of reset in an effect.
function SchemeForm({
  onClose,
  scheme,
  majorPrograms,
  defaultMajorProgramId,
}: SchemeFormDialogProps) {
  const create = useCreateScheme()
  const update = useUpdateScheme()
  const [serverError, setServerError] = useState<ResultsApiError | null>(null)
  const form = useForm<GradingSchemeForm>({
    resolver: zodResolver(GradingSchemeFormSchema),
    defaultValues: {
      name: scheme?.name ?? "",
      schemeType: scheme?.schemeType ?? "CREDIT_WEIGHTED_GPA",
      passMark: scheme?.passMark ?? null,
      caWeightPercent: scheme?.caWeightPercent ?? 40,
      examWeightPercent: scheme?.examWeightPercent ?? 60,
      isActive: scheme?.isActive ?? true,
      majorProgramId: scheme
        ? (scheme.majorProgramId ?? null)
        : defaultMajorProgramId,
    },
  })

  const schemeType = useWatch({ control: form.control, name: "schemeType" })
  const pending = create.isPending || update.isPending
  const errors = form.formState.errors
  const err = (f: keyof GradingSchemeForm) =>
    errors[f]?.message ?? fieldError(serverError, f)

  const submit = form.handleSubmit(async (body) => {
    setServerError(null)
    try {
      if (scheme) await update.mutateAsync({ id: scheme.id, body })
      else await create.mutateAsync(body)
      toast.success(scheme ? "Scheme updated." : "Scheme created.")
      onClose()
    } catch (error) {
      if (error instanceof Error) setServerError(toResultsApiError(error))
    }
  })

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>
          {scheme ? `Edit ${scheme.name}` : "New grading scheme"}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-1.5">
        <Label htmlFor="scheme-name">Name</Label>
        <Input
          id="scheme-name"
          aria-invalid={!!errors.name}
          {...form.register("name")}
        />
        <p className="text-xs text-destructive">{err("name")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="scheme-type">Type</Label>
          <select
            id="scheme-type"
            {...form.register("schemeType")}
            className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm dark:bg-muted/20"
          >
            {SCHEME_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          {/* The owner is fixed once created (PATCH doesn't accept it). */}
          {scheme ? (
            <>
              <p className="text-sm font-medium">Owner</p>
              <p className="flex h-9 items-center text-sm text-muted-foreground">
                {scheme.majorProgramId == null
                  ? "Institution template"
                  : (majorPrograms.find((m) => m.id === scheme.majorProgramId)
                      ?.name ?? `Major program #${scheme.majorProgramId}`)}
              </p>
            </>
          ) : (
            <>
              <Label htmlFor="scheme-major-program">Owner</Label>
              <select
                id="scheme-major-program"
                {...form.register("majorProgramId", nullableNumber)}
                className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm dark:bg-muted/20"
              >
                <option value="">Institution template (super admin)</option>
                {majorPrograms.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {schemeType === "PASS_FAIL" ? (
        <div className="space-y-1.5">
          <Label htmlFor="scheme-pass">Pass mark</Label>
          <Input
            id="scheme-pass"
            type="number"
            step="0.01"
            {...form.register("passMark", nullableNumber)}
          />
          <p className="text-xs text-destructive">{err("passMark")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="scheme-ca">CA weight %</Label>
            <Input
              id="scheme-ca"
              type="number"
              {...form.register("caWeightPercent", nullableNumber)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="scheme-exam">Exam weight %</Label>
            <Input
              id="scheme-exam"
              type="number"
              {...form.register("examWeightPercent", nullableNumber)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="scheme-pass-opt">Pass mark</Label>
            <Input
              id="scheme-pass-opt"
              type="number"
              step="0.01"
              {...form.register("passMark", nullableNumber)}
            />
          </div>
          <p className="col-span-3 -mt-2 text-xs text-destructive">
            {err("caWeightPercent") ?? err("examWeightPercent")}
          </p>
        </div>
      )}

      <Controller
        control={form.control}
        name="isActive"
        render={({ field }) => (
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={field.value} onCheckedChange={field.onChange} />
            Active
          </label>
        )}
      />

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
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {scheme ? "Save" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  )
}
