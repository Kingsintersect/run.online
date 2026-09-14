"use client"

import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CHOICE_FIELD_TYPES,
  FIELD_TYPES,
  FIELD_TYPE_LABELS,
  FIELD_WIDTH_LABELS,
  FILE_ACCEPT_LABELS,
  OPTIONS_SOURCES,
} from "@/lib/admission-catalog"
import {
  formFieldDraftSchema,
  type FormFieldDraft,
  type FormFieldDraftInput,
} from "@/schemas/admission-dynamic.schema"
import type {
  AdmissionFormField,
  FieldWidth,
  FileAccept,
  FormFieldType,
  FormFieldValidation,
  OptionsSource,
} from "@/types/admissionConfig"
import { ConditionBuilder } from "./ConditionBuilder"
import { OptionsEditor } from "./OptionsEditor"

// One question's definition — sandbox/dynamic-admission/API_CONTRACTS.md §3.1.

interface FieldEditorProps {
  initial: FormFieldDraft
  mode: "create" | "edit"
  /** Required by the system — `isRequired` can't be turned off. */
  lockedRequired: boolean
  /** Earlier questions this one may depend on (conditions, option sources). */
  candidates: AdmissionFormField[]
  saving: boolean
  onCancel: () => void
  onSave: (draft: FormFieldDraft) => void
}

const NO_SOURCE = "__static__"
const NO_DEPENDENCY = "__none__"
const PLACEHOLDER_TYPES: FormFieldType[] = [
  "TEXT",
  "TEXTAREA",
  "EMAIL",
  "PHONE",
  "NUMBER",
  "SELECT",
]
const LENGTH_TYPES: FormFieldType[] = ["TEXT", "TEXTAREA", "EMAIL", "PHONE"]
const FILE_ACCEPTS = Object.keys(FILE_ACCEPT_LABELS) as FileAccept[]
const WIDTHS = Object.keys(FIELD_WIDTH_LABELS) as FieldWidth[]

const toOptionalNumber = (value: string): number | undefined => {
  if (value.trim() === "") return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export function FieldEditor({
  initial,
  mode,
  lockedRequired,
  candidates,
  saving,
  onCancel,
  onSave,
}: FieldEditorProps) {
  const form = useForm<FormFieldDraftInput, unknown, FormFieldDraft>({
    resolver: zodResolver(formFieldDraftSchema),
    defaultValues: initial,
  })
  const { errors } = form.formState
  const type = useWatch({ control: form.control, name: "type" })
  const optionsSource = useWatch({
    control: form.control,
    name: "optionsSource",
  })
  const validation = useWatch({ control: form.control, name: "validation" })
  const systemKey = initial.systemKey ?? null
  const identityLocked = mode === "edit" || !!systemKey
  const isChoice = CHOICE_FIELD_TYPES.includes(type)
  const sourceDef = OPTIONS_SOURCES.find((s) => s.source === optionsSource)
  const dependencyCandidates = sourceDef?.needs
    ? candidates.filter((c) => c.optionsSource === sourceDef.needs)
    : []

  const setValidation = (patch: Partial<FormFieldValidation>) => {
    const next: FormFieldValidation = { ...(validation ?? {}), ...patch }
    const cleaned = Object.fromEntries(
      Object.entries(next).filter(([, v]) => v !== undefined && v !== "")
    ) as FormFieldValidation
    form.setValue("validation", Object.keys(cleaned).length ? cleaned : null, {
      shouldDirty: true,
    })
  }

  const numberInput = (
    id: string,
    label: string,
    key: keyof Pick<
      FormFieldValidation,
      "min" | "max" | "minLength" | "maxLength" | "maxSizeMb" | "maxItems"
    >
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        value={validation?.[key] ?? ""}
        onChange={(e) =>
          setValidation({ [key]: toOptionalNumber(e.target.value) })
        }
      />
      {errors.validation?.[key]?.message && (
        <p className="text-xs text-destructive">
          {errors.validation[key]?.message}
        </p>
      )}
    </div>
  )

  const submit = form.handleSubmit((draft) =>
    onSave({
      ...draft,
      options: isChoice && !draft.optionsSource ? draft.options : null,
      optionsSource: isChoice ? (draft.optionsSource ?? null) : null,
      dependsOn:
        isChoice && draft.optionsSource ? (draft.dependsOn ?? null) : null,
      repeatable: draft.type === "REPEATING_GROUP",
    })
  )

  return (
    <div className="space-y-4">
      {systemKey && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
          <Lock className="mt-0.5 size-3.5 shrink-0" />
          <p>
            System field <span className="font-mono">{systemKey}</span> — its
            answer is saved to the application record, so its key and type are
            fixed and it can&apos;t be deleted.
            {lockedRequired && " It must stay required."}
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="field-label">Question</Label>
        <Input
          id="field-label"
          {...form.register("label")}
          aria-invalid={!!errors.label}
        />
        {errors.label && (
          <p className="text-xs text-destructive">{errors.label.message}</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="field-key">Key</Label>
          <Input
            id="field-key"
            className="font-mono text-xs"
            disabled={identityLocked}
            {...form.register("key")}
            aria-invalid={!!errors.key}
          />
          <p className="text-xs text-muted-foreground">
            {identityLocked
              ? "Fixed — answers are saved under it."
              : "Saved with each answer; can't be changed later."}
          </p>
          {errors.key && (
            <p className="text-xs text-destructive">{errors.key.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="field-type">Type</Label>
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(v) => {
                  const next = FIELD_TYPES.find((t) => t === v)
                  if (!next) return
                  field.onChange(next)
                  form.setValue("validation", null)
                }}
                disabled={identityLocked}
              >
                <SelectTrigger id="field-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {FIELD_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="field-help">Help text (optional)</Label>
          <Controller
            control={form.control}
            name="helpText"
            render={({ field }) => (
              <Input
                id="field-help"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
              />
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="field-width">Width</Label>
          <Controller
            control={form.control}
            name="width"
            render={({ field }) => (
              <Select
                value={field.value ?? "FULL"}
                onValueChange={(v) =>
                  field.onChange(WIDTHS.find((w) => w === v) ?? "FULL")
                }
              >
                <SelectTrigger id="field-width" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WIDTHS.map((w) => (
                    <SelectItem key={w} value={w}>
                      {FIELD_WIDTH_LABELS[w]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {PLACEHOLDER_TYPES.includes(type) && (
        <div className="space-y-1.5">
          <Label htmlFor="field-placeholder">Placeholder (optional)</Label>
          <Controller
            control={form.control}
            name="placeholder"
            render={({ field }) => (
              <Input
                id="field-placeholder"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
              />
            )}
          />
        </div>
      )}

      {isChoice && (
        <div className="space-y-3 rounded-xl border border-border p-3">
          <div className="space-y-1.5">
            <Label htmlFor="field-source">Answer choices</Label>
            <Controller
              control={form.control}
              name="optionsSource"
              render={({ field }) => (
                <Select
                  value={field.value ?? NO_SOURCE}
                  onValueChange={(v) => {
                    const next: OptionsSource | null =
                      OPTIONS_SOURCES.find((s) => s.source === v)?.source ??
                      null
                    field.onChange(next)
                    form.setValue("dependsOn", null)
                  }}
                  disabled={!!systemKey && !!initial.optionsSource}
                >
                  <SelectTrigger id="field-source" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SOURCE}>A list I type in</SelectItem>
                    {OPTIONS_SOURCES.map((s) => (
                      <SelectItem key={s.source} value={s.source}>
                        Load: {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {!optionsSource && (
            <Controller
              control={form.control}
              name="options"
              render={({ field }) => (
                <OptionsEditor
                  value={field.value ?? []}
                  onChange={field.onChange}
                  error={
                    errors.options?.message ?? errors.options?.root?.message
                  }
                />
              )}
            />
          )}

          {sourceDef?.needs && (
            <div className="space-y-1.5">
              <Label htmlFor="field-depends">Depends on</Label>
              <Controller
                control={form.control}
                name="dependsOn"
                render={({ field }) => (
                  <Select
                    value={field.value ?? NO_DEPENDENCY}
                    onValueChange={(v) =>
                      field.onChange(v === NO_DEPENDENCY ? null : v)
                    }
                  >
                    <SelectTrigger id="field-depends" className="w-full">
                      <SelectValue placeholder="Choose a question" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_DEPENDENCY}>
                        Choose a question
                      </SelectItem>
                      {dependencyCandidates.map((c) => (
                        <SelectItem key={c.key} value={c.key}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {dependencyCandidates.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Add a question that loads{" "}
                  {OPTIONS_SOURCES.find(
                    (s) => s.source === sourceDef.needs
                  )?.label.toLowerCase()}{" "}
                  earlier in this step first.
                </p>
              )}
              {errors.dependsOn && (
                <p className="text-xs text-destructive">
                  {errors.dependsOn.message}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {(LENGTH_TYPES.includes(type) ||
        type === "NUMBER" ||
        type === "YEAR" ||
        type === "DATE" ||
        type === "FILE" ||
        type === "REPEATING_GROUP") && (
        <div className="space-y-3 rounded-xl border border-border p-3">
          <p className="text-sm font-medium text-foreground">Answer rules</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {LENGTH_TYPES.includes(type) && (
              <>
                {numberInput("field-min-length", "Minimum length", "minLength")}
                {numberInput("field-max-length", "Maximum length", "maxLength")}
              </>
            )}
            {(type === "NUMBER" || type === "YEAR") && (
              <>
                {numberInput("field-min", "Minimum", "min")}
                {numberInput("field-max", "Maximum", "max")}
              </>
            )}
            {type === "DATE" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="field-min-date">Earliest date</Label>
                  <Input
                    id="field-min-date"
                    type="date"
                    value={validation?.minDate ?? ""}
                    onChange={(e) =>
                      setValidation({ minDate: e.target.value || undefined })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="field-max-date">Latest date</Label>
                  <Input
                    id="field-max-date"
                    type="date"
                    value={validation?.maxDate ?? ""}
                    onChange={(e) =>
                      setValidation({ maxDate: e.target.value || undefined })
                    }
                  />
                </div>
              </>
            )}
            {type === "FILE" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="field-accept">Accepts</Label>
                  <Select
                    value={validation?.accept ?? "DOCUMENT"}
                    onValueChange={(v) =>
                      setValidation({
                        accept: FILE_ACCEPTS.find((a) => a === v),
                      })
                    }
                  >
                    <SelectTrigger id="field-accept" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FILE_ACCEPTS.map((a) => (
                        <SelectItem key={a} value={a}>
                          {FILE_ACCEPT_LABELS[a]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {numberInput("field-max-size", "Max size (MB)", "maxSizeMb")}
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 sm:col-span-2">
                  <Label htmlFor="field-multiple">Allow several files</Label>
                  <Switch
                    id="field-multiple"
                    checked={validation?.multiple ?? false}
                    onCheckedChange={(v) =>
                      setValidation({
                        multiple: v || undefined,
                        maxItems: v ? validation?.maxItems : undefined,
                      })
                    }
                  />
                </div>
                {validation?.multiple &&
                  numberInput("field-max-items", "Most files", "maxItems")}
              </>
            )}
            {type === "REPEATING_GROUP" &&
              numberInput("field-max-items", "Most entries", "maxItems")}
            {type === "TEXT" && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="field-pattern">
                  Pattern (regular expression, optional)
                </Label>
                <Input
                  id="field-pattern"
                  className="font-mono text-xs"
                  value={validation?.pattern ?? ""}
                  onChange={(e) =>
                    setValidation({ pattern: e.target.value || undefined })
                  }
                  placeholder="^[A-Z]{3}[0-9]{4}$"
                />
                {errors.validation?.pattern?.message && (
                  <p className="text-xs text-destructive">
                    {errors.validation.pattern.message}
                  </p>
                )}
              </div>
            )}
          </div>
          {type === "REPEATING_GROUP" && (
            <p className="text-xs text-muted-foreground">
              Add the questions inside each entry with &quot;Add child
              field&quot; after saving.
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl border border-border p-3">
        <div>
          <Label htmlFor="field-required" className="text-sm font-medium">
            Required
          </Label>
          {lockedRequired && (
            <p className="text-xs text-muted-foreground">
              Required by the system.
            </p>
          )}
        </div>
        <Controller
          control={form.control}
          name="isRequired"
          render={({ field }) => (
            <Switch
              id="field-required"
              checked={lockedRequired || field.value}
              disabled={lockedRequired}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>

      <div className="rounded-xl border border-border p-3">
        <Controller
          control={form.control}
          name="visibleWhen"
          render={({ field }) => (
            <ConditionBuilder
              value={field.value ?? null}
              onChange={field.onChange}
              candidates={candidates.filter(
                (c) => c.type !== "FILE" && c.type !== "REPEATING_GROUP"
              )}
              error={
                errors.visibleWhen ? "Finish or remove each rule." : undefined
              }
            />
          )}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={saving}>
          {saving && (
            <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
          )}
          Save question
        </Button>
      </div>
    </div>
  )
}
