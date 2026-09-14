"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm, Controller, useWatch } from "react-hook-form"
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
import { STAGE_TYPES, STAGE_TYPE_CATALOG } from "@/lib/admission-catalog"
import type {
  AdmissionStepDefinition,
  AdmissionStepGroup,
  StageType,
} from "@/types/admissionConfig"
import { StageConfigEditor } from "./StageConfigEditor"
import {
  makeStageDraft,
  stageDraftForBuiltInKey,
  stageDraftForStep,
  validateStageDraft,
  type StageDraft,
} from "./stage-draft"

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
})

export type StepFormValues = z.infer<typeof stepFormSchema>

interface StepFormModalProps {
  open: boolean
  onClose: () => void
  groupLabel: string
  group: AdmissionStepGroup
  /** Keys already used in this scope — built-in types already taken are excluded from the picker. */
  existingKeys: string[]
  /** Stage types already active in this scope (excluding the step being edited). */
  stageTypesInUse: StageType[]
  /** The scope this step belongs to, e.g. "Certificate programs". Set by the page tab. */
  scopeName: string
  editing: AdmissionStepDefinition | null
  /** `stage` is null for FORM steps. */
  onSubmit: (
    values: StepFormValues,
    stage: StageDraft | null
  ) => Promise<void> | void
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
  }
}

function initialStage(
  group: AdmissionStepGroup,
  editing: AdmissionStepDefinition | null
): StageDraft | null {
  if (group !== "PROCESS") return null
  return (editing && stageDraftForStep(editing)) ?? makeStageDraft("CONTENT")
}

export default function StepFormModal({
  open,
  onClose,
  groupLabel,
  group,
  existingKeys,
  stageTypesInUse,
  scopeName,
  editing,
  onSubmit,
  isSubmitting,
}: StepFormModalProps) {
  const form = useForm<StepFormValues>({
    resolver: zodResolver(stepFormSchema),
    defaultValues: toDefaults(editing),
  })
  const [stage, setStage] = useState<StageDraft | null>(() =>
    initialStage(group, editing)
  )
  const [stageErrors, setStageErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    form.reset(toDefaults(editing))
    setStage(initialStage(group, editing))
    setStageErrors({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, group])

  const required = useWatch({ control: form.control, name: "required" })
  const stepType = useWatch({ control: form.control, name: "stepType" })
  const isProcess = group === "PROCESS"
  // An existing step's type never changes; a built-in step's type is fixed by its key.
  const stageTypeLocked = !!editing || stepType !== CUSTOM_STEP_TYPE
  // The step being edited was only just marked "untyped" if it had no type.
  const editingUntyped = !!editing && isProcess && !stageDraftForStep(editing)

  const knownOptions = useMemo(
    () =>
      DEFAULT_ADMISSION_STEPS.filter(
        (s) => s.group === group && !existingKeys.includes(s.key)
      ),
    [group, existingKeys]
  )

  const handleStepTypeChange = (value: string) => {
    form.setValue("stepType", value)
    if (isProcess) {
      setStage(stageDraftForBuiltInKey(value) ?? makeStageDraft("CONTENT"))
      setStageErrors({})
    }
    if (value === CUSTOM_STEP_TYPE) return
    const known = knownOptions.find((s) => s.key === value)
    if (!known) return
    // Pre-fill from the catalog — still fully editable afterward. The key
    // is what's fixed, not the label, so customizing wording here is safe.
    form.setValue("label", known.label)
    form.setValue("description", known.description)
    form.setValue("icon", known.icon)
  }

  const handleStageTypeChange = (value: string) => {
    const type = STAGE_TYPES.find((t) => t === value)
    if (!type) return
    setStage(makeStageDraft(type))
    setStageErrors({})
    if (!editing) form.setValue("icon", STAGE_TYPE_CATALOG[type].icon)
  }

  const submit = form.handleSubmit(async (values) => {
    if (isProcess) {
      if (!stage) return
      const errors = validateStageDraft(stage)
      setStageErrors(errors)
      if (Object.keys(errors).length > 0) return
    }
    await onSubmit(
      required ? { ...values, enabled: true } : values,
      isProcess ? stage : null
    )
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit Step" : `Add Step — ${groupLabel}`}
      subtitle={
        editing
          ? `Key: ${editing.key} (fixed)`
          : isProcess
            ? "A stage's type decides what the applicant does at that point in the admission process."
            : "A form step asks the questions you add to it with Manage fields."
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
        <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">Applies to</p>
          <p className="text-sm font-medium text-foreground">{scopeName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {editing
              ? "A step's scope can't be changed after it's created."
              : "Set by the tab you're on. Switch tabs to add a step somewhere else."}
          </p>
        </div>

        {!editing && (
          <div className="space-y-1.5">
            <Label htmlFor="step-type">Step</Label>
            <Select value={stepType} onValueChange={handleStepTypeChange}>
              <SelectTrigger id="step-type" className="w-full">
                <SelectValue placeholder="Choose a step" />
              </SelectTrigger>
              <SelectContent>
                {knownOptions.map((opt) => (
                  <SelectItem key={opt.key} value={opt.key}>
                    {opt.label}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_STEP_TYPE}>
                  {isProcess ? "New stage" : "New form step"}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {stepType === CUSTOM_STEP_TYPE
                ? isProcess
                  ? "Pick its stage type below."
                  : "Add its questions afterwards with Manage fields."
                : "A built-in step — its key is fixed, so you can freely edit the label below."}
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

        {isProcess && stage && (
          <div className="space-y-3 rounded-xl border border-border p-3">
            <div className="space-y-1.5">
              <Label htmlFor="stage-type">Stage type</Label>
              {stageTypeLocked && !editingUntyped ? (
                <p
                  id="stage-type"
                  className="text-sm font-medium text-foreground"
                >
                  {STAGE_TYPE_CATALOG[stage.type].label}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {editing
                      ? "can't be changed after creation"
                      : "set by the built-in step"}
                  </span>
                </p>
              ) : (
                <Select
                  value={stage.type}
                  onValueChange={handleStageTypeChange}
                >
                  <SelectTrigger id="stage-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGE_TYPES.map((type) => {
                      const def = STAGE_TYPE_CATALOG[type]
                      const taken =
                        !def.multiple && stageTypesInUse.includes(type)
                      return (
                        <SelectItem
                          key={type}
                          value={type}
                          disabled={taken || def.pendingBackend}
                        >
                          {def.label}
                          {taken
                            ? " (already in use)"
                            : def.pendingBackend
                              ? " (pending backend support)"
                              : ""}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                {STAGE_TYPE_CATALOG[stage.type].description}
              </p>
            </div>
            <StageConfigEditor
              draft={stage}
              onChange={(next) => {
                setStage(next)
                if (Object.keys(stageErrors).length) {
                  setStageErrors(validateStageDraft(next))
                }
              }}
              errors={stageErrors}
              disabled={isSubmitting}
            />
          </div>
        )}

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
                      aria-label={name}
                      aria-pressed={selected}
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
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-label="Required"
              />
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
                aria-label="Enabled"
              />
            )}
          />
        </div>
      </div>
    </Modal>
  )
}
