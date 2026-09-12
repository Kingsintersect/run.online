"use client"

/* ------------------------------------------------------------------ */
/*  Dynamic Application Form Step — Multi-Program Platform             */
/*                                                                     */
/*  Renders every AdmissionFormField a resolved FORM-group step        */
/*  carries (sandbox/multi-program-platform/API_CONTRACTS.md §A/§B),   */
/*  sorted by `order`. Pure/controlled, same as DynamicFormField — the  */
/*  wizard integration (FRONTEND_IMPLEMENTATION_PLAN.md phase B3) owns  */
/*  the actual value storage (a Controller-per-field into RHF, or a     */
/*  local reducer merged into `custom_fields` at submit time); this     */
/*  component doesn't assume either.                                   */
/* ------------------------------------------------------------------ */

import { useMemo } from "react"
import EmptyState from "@/components/custom/EmptyState"
import { FileQuestion } from "lucide-react"
import {
  DynamicFormField,
  type DynamicFieldValue,
} from "./DynamicFormField"
import type { AdmissionFormField } from "@/types/admissionConfig"

interface DynamicFormStepProps {
  fields: AdmissionFormField[]
  values: Record<string, DynamicFieldValue>
  onChange: (key: string, value: DynamicFieldValue) => void
  errors?: Record<string, string>
  disabled?: boolean
}

export function DynamicFormStep({
  fields,
  values,
  onChange,
  errors,
  disabled,
}: DynamicFormStepProps) {
  const ordered = useMemo(
    () => [...fields].sort((a, b) => a.order - b.order),
    [fields]
  )

  if (ordered.length === 0) {
    return (
      <EmptyState
        icon={FileQuestion}
        title="No questions configured"
        description="This step has no fields set up yet — nothing to fill in."
      />
    )
  }

  return (
    <div className="space-y-5">
      {ordered.map((field) => (
        <DynamicFormField
          key={field.id}
          field={field}
          value={values[field.key]}
          onChange={(v) => onChange(field.key, v)}
          error={errors?.[field.key]}
          disabled={disabled}
        />
      ))}
    </div>
  )
}
