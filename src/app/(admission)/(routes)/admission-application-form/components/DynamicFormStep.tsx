"use client"

/* ------------------------------------------------------------------ */
/*  Dynamic Application Form Step — sandbox/dynamic-admission/         */
/*                                                                     */
/*  Lays out a step's questions (by `width`), hides the ones whose     */
/*  `visibleWhen` isn't met, and feeds dependent option sources their  */
/*  parent answers. Pure/controlled — the caller owns the values.      */
/* ------------------------------------------------------------------ */

import EmptyState from "@/components/custom/EmptyState"
import { FileQuestion } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AdmissionFormField } from "@/types/admissionConfig"
import { DynamicFormField } from "./DynamicFormField"
import type { DynamicFieldValue, ValueLookup } from "../lib/dynamic-form"

interface DynamicFormStepProps {
  /** The step's fields, flat (children carry `parentFieldId`). */
  fields: AdmissionFormField[]
  getValue: (field: AdmissionFormField) => DynamicFieldValue
  onChange: (field: AdmissionFormField, value: DynamicFieldValue) => void
  /** Error messages by field key. */
  errors: Record<string, string | undefined>
  isVisible: (field: AdmissionFormField) => boolean
  lookup: ValueLookup
  /** Any field in the form by key — for option-source dependencies across steps. */
  findField: (key: string) => AdmissionFormField | undefined
  disabled?: boolean
}

const asOptionalText = (value: DynamicFieldValue): string | undefined =>
  typeof value === "string"
    ? value || undefined
    : value == null
      ? undefined
      : String(value)

export function DynamicFormStep({
  fields,
  getValue,
  onChange,
  errors,
  isVisible,
  lookup,
  findField,
  disabled,
}: DynamicFormStepProps) {
  const topLevel = fields
    .filter((f) => !f.parentFieldId)
    .sort((a, b) => a.order - b.order)

  if (topLevel.length === 0) {
    return (
      <EmptyState
        icon={FileQuestion}
        title="No questions configured"
        description="This step has no questions set up yet — nothing to fill in."
      />
    )
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {topLevel.filter(isVisible).map((field) => {
        const dependency = field.dependsOn
          ? findField(field.dependsOn)
          : undefined
        return (
          <div
            key={field.id}
            className={cn(
              field.width === "HALF" ? "sm:col-span-1" : "sm:col-span-2"
            )}
          >
            <DynamicFormField
              field={field}
              value={getValue(field)}
              onChange={(value) => onChange(field, value)}
              error={errors[field.key]}
              disabled={disabled}
              childFields={fields.filter((c) => c.parentFieldId === field.id)}
              dependsOnValue={
                field.dependsOn
                  ? asOptionalText(lookup(field.dependsOn))
                  : undefined
              }
              parentDependsOnValue={
                dependency?.dependsOn
                  ? asOptionalText(lookup(dependency.dependsOn))
                  : undefined
              }
            />
          </div>
        )
      })}
    </div>
  )
}
