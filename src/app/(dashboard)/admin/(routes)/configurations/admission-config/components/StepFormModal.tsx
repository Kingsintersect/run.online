"use client"

import { useEffect, useMemo } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  ADMISSION_STEP_ICON_NAMES,
  getStepIcon,
} from "@/lib/admissionStepIcons"
import { DEFAULT_ADMISSION_STEPS } from "@/lib/admissionConfig"
import { useAllPrograms } from "@/hooks/useCourseStructure"
import type {
  AdmissionStepDefinition,
  AdmissionStepGroup,
} from "@/types/admissionConfig"
import type { ProgramCategory } from "@/types/school"

// Multi-Program Platform scoping — sandbox/multi-program-platform/
// API_CONTRACTS.md §A. Not yet shipped by the backend; the form collects it
// and the service passes it through (toRawPayload spreads it verbatim), so
// it starts working the moment the backend accepts the fields.
const PROGRAM_CATEGORIES: ProgramCategory[] = [
  "DEGREE",
  "POSTGRADUATE",
  "CERTIFICATE",
  "DIPLOMA",
  "SECONDARY_SCHOOL",
  "FOUNDATIONAL",
  "PART_TIME",
]
export const NONE_SENTINEL = "__none__"

/** Sentinel `stepType` value meaning "not one of the built-in types — free-text label/key". */
export const CUSTOM_STEP_TYPE = "CUSTOM"

const stepFormSchema = z.object({
  // Which built-in type (its canonical `key`) to create, or CUSTOM_STEP_TYPE.
  // Only read on create — editing never changes a step's key. Keeping the
  // key decoupled from the label like this is the whole point: picking a
  // built-in type fixes the exact key its real gating/screen logic expects,
  // so a label typo can no longer silently break it the way free-text
  // label-to-key slugifying did before.
  stepType: z.string().min(1),
  label: z.string().min(2, "Label must be at least 2 characters").max(100),
  description: z.string().max(300).optional(),
  icon: z.string().min(1, "Pick an icon"),
  required: z.boolean(),
  enabled: z.boolean(),
  // "" (NONE_SENTINEL) = institution-wide default. Independent of each
  // other — both may be set; programId always wins at resolution time, see
  // sandbox/multi-program-platform/API_CONTRACTS.md §A.
  programCategory: z.string(),
  programId: z.string(),
})

export type StepFormValues = z.infer<typeof stepFormSchema>

interface StepFormModalProps {
  open: boolean
  onClose: () => void
  groupLabel: string
  group: AdmissionStepGroup
  /** Keys already used in this group — built-in types already taken are excluded from the picker. */
  existingKeys: string[]
  editing: AdmissionStepDefinition | null
  onSubmit: (values: StepFormValues) => Promise<void> | void
  isSubmitting: boolean
}

function toDefaults(step: AdmissionStepDefinition | null): StepFormValues {
  return {
    stepType: CUSTOM_STEP_TYPE,
    label: step?.label ?? "",
    description: step?.description ?? "",
    icon: step?.icon ?? "ListChecks",
    required: step?.required ?? false,
    enabled: step?.enabled ?? true,
    programCategory: step?.programCategory ?? NONE_SENTINEL,
    programId: step?.programId ? String(step.programId) : NONE_SENTINEL,
  }
}

export default function StepFormModal({
  open,
  onClose,
  groupLabel,
  group,
  existingKeys,
  editing,
  onSubmit,
  isSubmitting,
}: StepFormModalProps) {
  const form = useForm<StepFormValues>({
    resolver: zodResolver(stepFormSchema),
    defaultValues: toDefaults(editing),
  })

  useEffect(() => {
    if (open) form.reset(toDefaults(editing))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing])

  const required = form.watch("required")
  const stepType = form.watch("stepType")
  const { data: programsRes } = useAllPrograms()
  const programs = programsRes?.data ?? []

  const knownOptions = useMemo(
    () =>
      DEFAULT_ADMISSION_STEPS.filter(
        (s) => s.group === group && !existingKeys.includes(s.key)
      ),
    [group, existingKeys]
  )

  const handleStepTypeChange = (value: string) => {
    form.setValue("stepType", value)
    if (value === CUSTOM_STEP_TYPE) return
    const known = knownOptions.find((s) => s.key === value)
    if (!known) return
    // Pre-fill from the catalog — still fully editable afterward. The key
    // is what's fixed, not the label, so customizing wording here is safe.
    form.setValue("label", known.label)
    form.setValue("description", known.description)
    form.setValue("icon", known.icon)
  }

  const submit = form.handleSubmit(async (values) => {
    await onSubmit(required ? { ...values, enabled: true } : values)
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit Step" : `Add Step — ${groupLabel}`}
      subtitle={
        editing
          ? `Key: ${editing.key} (fixed)`
          : "Custom steps are saved and visible here, but only show on the live student pages once matching UI exists — see the workflow doc."
      }
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isSubmitting}>
            {isSubmitting && (
              <Loader2
                className="size-4 animate-spin"
                data-icon="inline-start"
              />
            )}
            {editing ? "Save Changes" : "Create Step"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!editing && (
          <div className="space-y-1.5">
            <Label>Step Type</Label>
            <Select value={stepType} onValueChange={handleStepTypeChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a step type" />
              </SelectTrigger>
              <SelectContent>
                {knownOptions.map((opt) => (
                  <SelectItem key={opt.key} value={opt.key}>
                    {opt.label}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_STEP_TYPE}>
                  Custom (no matching page yet)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {stepType === CUSTOM_STEP_TYPE
                ? "A custom step is saved and shown here, but has no real page/behavior on the student side yet."
                : "This type has real behavior already built — its key is fixed, so you can freely edit the label below without breaking it."}
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="step-label">Label</Label>
          <Input
            id="step-label"
            placeholder="e.g. Health Declaration"
            {...form.register("label")}
          />
          {form.formState.errors.label && (
            <p className="text-xs text-destructive">
              {form.formState.errors.label.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="step-description">Description</Label>
          <Textarea
            id="step-description"
            placeholder="Shown to the admin under the step title."
            rows={2}
            {...form.register("description")}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Icon</Label>
          <Controller
            control={form.control}
            name="icon"
            render={({ field }) => (
              <div className="grid grid-cols-7 gap-2 rounded-xl border border-border p-2 sm:grid-cols-10">
                {ADMISSION_STEP_ICON_NAMES.map((name) => {
                  const Icon = getStepIcon(name)
                  const selected = field.value === name
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => field.onChange(name)}
                      title={name}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-lg border transition-colors",
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-transparent text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <Icon size={15} />
                    </button>
                  )
                })}
              </div>
            )}
          />
        </div>

        <div className="space-y-2 rounded-xl border border-border p-3">
          <p className="text-sm font-medium text-foreground">Scope</p>
          <p className="text-xs text-muted-foreground">
            Who sees this version of the step. Leave both as &quot;Institution
            default&quot; for every program to share it. A specific program
            always wins over a category, which wins over the institution
            default.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Program category</Label>
              <Controller
                control={form.control}
                name="programCategory"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_SENTINEL}>
                        Institution default
                      </SelectItem>
                      {PROGRAM_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Specific program</Label>
              <Controller
                control={form.control}
                name="programId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_SENTINEL}>
                        No specific program
                      </SelectItem>
                      {programs.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name} ({p.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <div>
            <p className="text-sm font-medium text-foreground">Required</p>
            <p className="text-xs text-muted-foreground">
              Applicants can&apos;t skip this step — forces it enabled.
            </p>
          </div>
          <Controller
            control={form.control}
            name="required"
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <div>
            <p className="text-sm font-medium text-foreground">Enabled</p>
            <p className="text-xs text-muted-foreground">
              {required
                ? "Locked on because this step is required."
                : "Whether applicants see this step right now."}
            </p>
          </div>
          <Controller
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <Switch
                checked={required ? true : field.value}
                disabled={required}
                onCheckedChange={field.onChange}
                className="data-checked:bg-success"
              />
            )}
          />
        </div>
      </div>
    </Modal>
  )
}
