"use client"

import { useMemo, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Check, Eye, Info, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AdjustmentCreateSchema } from "../../schemas"
import {
  useCreateAdjustment,
  usePreviewAdjustment,
} from "../../hooks/use-results-mutations"
import {
  fieldError,
  toResultsApiError,
  type ResultsApiError,
} from "../../lib/results-errors"
import { AdjustmentPreviewCard } from "./adjustment-preview-card"
import { NotAvailableNotice } from "./not-available-notice"
import type {
  AdjustmentCreateBody,
  AdjustmentPreview,
  ResultSheetRow,
} from "../../types"

const TARGETS = [
  { value: "ALL", label: "Every student" },
  { value: "BELOW_TOTAL", label: "Students whose total is below…" },
  { value: "MISSING_ONLY", label: "Only students missing this component" },
  { value: "SELECTED", label: "Selected students" },
] as const

const DEFAULTS: AdjustmentCreateBody = {
  type: "ADD_MARKS",
  component: "EXAM",
  value: 0,
  target: "ALL",
  targetParams: undefined,
  reason: "",
}

// Keep only the target params the chosen target uses, so the preview and
// the apply request are built from the same canonical payload.
function canonical(values: AdjustmentCreateBody): AdjustmentCreateBody {
  const { targetParams, ...rest } = values
  if (values.target === "BELOW_TOTAL")
    return { ...rest, targetParams: { belowTotal: targetParams?.belowTotal } }
  if (values.target === "SELECTED")
    return { ...rest, targetParams: { studentIds: targetParams?.studentIds } }
  return rest
}

interface NormalizationPanelProps {
  offeringId: number
  rows: ResultSheetRow[]
}

// Screen B normalization (gate results.adjust + sheet DRAFT at the call
// site). Form → server PREVIEW → Apply. Apply is only enabled while a
// preview of the exact same payload is on screen: change anything and the
// preview goes stale until it's re-run. Nothing is applied client-side.
export function NormalizationPanel({
  offeringId,
  rows,
}: NormalizationPanelProps) {
  const form = useForm<AdjustmentCreateBody>({
    resolver: zodResolver(AdjustmentCreateSchema),
    defaultValues: DEFAULTS,
  })
  const previewMutation = usePreviewAdjustment(offeringId)
  const apply = useCreateAdjustment(offeringId)
  const [preview, setPreview] = useState<{
    key: string
    data: AdjustmentPreview
  } | null>(null)
  const [serverError, setServerError] = useState<ResultsApiError | null>(null)
  const [studentQuery, setStudentQuery] = useState("")

  const watched = useWatch({ control: form.control })
  const currentKey = JSON.stringify(
    canonical({ ...DEFAULTS, ...watched } as AdjustmentCreateBody)
  )
  const previewIsFresh = preview?.key === currentKey
  const target = watched.target
  const type = watched.type

  const candidates = useMemo(() => {
    const q = studentQuery.trim().toLowerCase()
    return rows.filter(
      (r) =>
        !q ||
        r.matricNumber.toLowerCase().includes(q) ||
        r.studentName.toLowerCase().includes(q)
    )
  }, [rows, studentQuery])

  const handleError = (error: Error) => {
    const e = toResultsApiError(error)
    setServerError(e)
    if (!e.notAvailable && Object.keys(e.fieldErrors).length === 0)
      toast.error(e.message)
  }

  const runPreview = form.handleSubmit(async (values) => {
    setServerError(null)
    const body = canonical(values)
    try {
      const data = await previewMutation.mutateAsync(body)
      setPreview({ key: JSON.stringify(body), data })
    } catch (error) {
      setPreview(null)
      if (error instanceof Error) handleError(error)
    }
  })

  const runApply = form.handleSubmit(async (values) => {
    const body = canonical(values)
    if (!preview || preview.key !== JSON.stringify(body)) {
      toast.error("Preview this exact change before applying it.")
      return
    }
    setServerError(null)
    try {
      const batch = await apply.mutateAsync(body)
      toast.success(
        batch.status === "PENDING_APPROVAL"
          ? `Adjustment submitted for approval (${batch.affected} students).`
          : `Adjustment applied to ${batch.affected} students.`
      )
      setPreview(null)
      form.reset(DEFAULTS)
    } catch (error) {
      if (error instanceof Error) handleError(error)
    }
  })

  const errors = form.formState.errors
  const err = (field: string, local?: string) =>
    local ?? fieldError(serverError, field)

  if (serverError?.notAvailable)
    return (
      <NotAvailableNotice title="Normalization isn't available on the server yet">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setServerError(null)}
        >
          Back to the form
        </Button>
      </NotAvailableNotice>
    )

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
      <form
        onSubmit={runPreview}
        noValidate
        className="space-y-4 rounded-2xl border border-border bg-card p-4"
        aria-label="Normalize scores"
      >
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Normalize scores
          </h3>
          <p className="text-xs text-muted-foreground">
            Adjustments sit on top of the Moodle marks. They never overwrite
            them, and each one can be reverted while the sheet is in draft.
          </p>
        </div>

        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">What to do</legend>
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <div className="grid gap-1.5 text-sm">
                <label className="flex items-start gap-2">
                  <input
                    type="radio"
                    className="mt-1 accent-primary"
                    checked={field.value === "ADD_MARKS"}
                    onChange={() => field.onChange("ADD_MARKS")}
                  />
                  <span>
                    Add marks
                    <span className="block text-xs text-muted-foreground">
                      e.g. when most of the class did poorly
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="radio"
                    className="mt-1 accent-primary"
                    checked={field.value === "SET_MISSING"}
                    onChange={() => field.onChange("SET_MISSING")}
                  />
                  <span>
                    Fill in a missing score
                    <span className="block text-xs text-muted-foreground">
                      only touches students with no mark for the component
                    </span>
                  </span>
                </label>
              </div>
            )}
          />
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="norm-component">Component</Label>
            <select
              id="norm-component"
              {...form.register("component")}
              className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm dark:bg-muted/20"
            >
              <option value="CA">CA</option>
              <option value="EXAM">Exam</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="norm-value">
              {type === "SET_MISSING" ? "Score to fill" : "Marks to add"}
            </Label>
            <Input
              id="norm-value"
              type="number"
              step="0.01"
              aria-invalid={!!errors.value}
              {...form.register("value", { valueAsNumber: true })}
            />
            <p className="text-xs text-destructive">
              {err("value", errors.value?.message)}
            </p>
          </div>
        </div>
        {type === "ADD_MARKS" && (
          <p className="-mt-2 text-[11px] text-muted-foreground">
            A negative number removes marks. Only admins may do that.
          </p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="norm-target">Apply to</Label>
          <select
            id="norm-target"
            {...form.register("target")}
            className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm dark:bg-muted/20"
          >
            {TARGETS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {target === "BELOW_TOTAL" && (
          <div className="space-y-1.5">
            <Label htmlFor="norm-below">Total below</Label>
            <Input
              id="norm-below"
              type="number"
              step="0.01"
              {...form.register("targetParams.belowTotal", {
                setValueAs: (v: string) => (v === "" ? undefined : Number(v)),
              })}
            />
            <p className="text-xs text-destructive">
              {err(
                "targetParams.belowTotal",
                errors.targetParams?.belowTotal?.message
              )}
            </p>
          </div>
        )}

        {target === "SELECTED" && (
          <Controller
            control={form.control}
            name="targetParams.studentIds"
            render={({ field }) => {
              const selected = field.value ?? []
              return (
                <fieldset className="space-y-1.5">
                  <legend className="text-sm font-medium">
                    Students ({selected.length} selected)
                  </legend>
                  {/* Sends each row's `studentId` (portal students.id), as
                      the contract names it. Awaiting backend confirmation
                      (BACKEND_DEVIATIONS A45 CR6) — never switch to grade or
                      Moodle user ids on a guess. */}
                  <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                    <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
                    The selection is sent as portal student IDs (not grade or
                    Moodle IDs).
                  </p>
                  <Input
                    aria-label="Filter students"
                    placeholder="Filter by matric or name"
                    value={studentQuery}
                    onChange={(e) => setStudentQuery(e.target.value)}
                    className="h-8"
                  />
                  <div className="max-h-48 space-y-0.5 overflow-auto rounded-lg border border-border p-1.5">
                    {candidates.map((r) => (
                      <label
                        key={r.studentId}
                        className="flex items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-muted/40"
                      >
                        <input
                          type="checkbox"
                          className="accent-primary"
                          checked={selected.includes(r.studentId)}
                          onChange={() =>
                            field.onChange(
                              selected.includes(r.studentId)
                                ? selected.filter((id) => id !== r.studentId)
                                : [...selected, r.studentId]
                            )
                          }
                        />
                        <span className="font-mono">{r.matricNumber}</span>
                        <span className="truncate text-muted-foreground">
                          {r.studentName}
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-destructive">
                    {err(
                      "targetParams.studentIds",
                      errors.targetParams?.studentIds?.message
                    )}
                  </p>
                </fieldset>
              )
            }}
          />
        )}

        <div className="space-y-1.5">
          <Label htmlFor="norm-reason">
            Reason (recorded in the audit log)
          </Label>
          <Textarea
            id="norm-reason"
            rows={3}
            placeholder="e.g. Exam paper had an ambiguous question 4; 5 marks added to all."
            aria-invalid={!!errors.reason}
            {...form.register("reason")}
          />
          <p className="text-xs text-destructive">
            {err("reason", errors.reason?.message)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            variant="outline"
            disabled={previewMutation.isPending}
          >
            {previewMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
            Preview
          </Button>
          <Button
            type="button"
            onClick={runApply}
            disabled={!previewIsFresh || apply.isPending}
          >
            {apply.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Check className="size-4" aria-hidden />
            )}
            Apply
          </Button>
        </div>
        {preview && !previewIsFresh && (
          <p
            className="text-xs text-amber-700 dark:text-amber-300"
            role="status"
          >
            The form changed since the preview. Preview again to apply.
          </p>
        )}
      </form>

      <div aria-live="polite">
        {preview ? (
          <AdjustmentPreviewCard preview={preview.data} />
        ) : (
          <div className="flex h-full min-h-40 items-center justify-center rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Run a preview to see the before/after average, pass rate, grade
            distribution and who would be capped.
          </div>
        )}
      </div>
    </div>
  )
}
