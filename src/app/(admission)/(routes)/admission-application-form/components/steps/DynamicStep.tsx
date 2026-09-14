"use client"

/* ------------------------------------------------------------------ */
/*  One form step rendered from its field definitions —                */
/*  sandbox/dynamic-admission/. Used for whole dynamic steps, and       */
/*  (without a header) for admin-added questions under a hand-built     */
/*  step.                                                                */
/* ------------------------------------------------------------------ */

import { motion } from "framer-motion"
import { useFormContext } from "react-hook-form"
import type { AdmissionFormField } from "@/types/admissionConfig"
import { DynamicFormStep } from "../DynamicFormStep"
import {
  fieldPath,
  isFieldVisible,
  makeLookup,
  readFieldValue,
  writeFieldValue,
  type DynamicFieldValue,
  type FieldIndexEntry,
} from "../../lib/dynamic-form"
import { errorMessageAt, type FormDefaultValues } from "../../types/form-types"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" as const },
}

interface DynamicStepProps {
  stepId: string
  fields: AdmissionFormField[]
  /** Every field across the form, for conditions and dependencies. */
  fieldIndex: Map<string, FieldIndexEntry>
  /** Omit both to render just the questions (e.g. under a hand-built step). */
  title?: string
  description?: string
}

export default function DynamicStep({
  stepId,
  fields,
  fieldIndex,
  title,
  description,
}: DynamicStepProps) {
  const form = useFormContext<FormDefaultValues>()
  const values = form.watch()
  const lookup = makeLookup(values, fieldIndex)

  // When an answer changes, answers that loaded their choices from it (the
  // state for a country, the LGA for a state) no longer apply.
  const clearDependents = (key: string, seen = new Set<string>()) => {
    for (const entry of fieldIndex.values()) {
      if (entry.field.dependsOn !== key || seen.has(entry.field.key)) continue
      seen.add(entry.field.key)
      writeFieldValue(form, entry.stepId, entry.field, "")
      clearDependents(entry.field.key, seen)
    }
  }

  const handleChange = (
    field: AdmissionFormField,
    value: DynamicFieldValue
  ) => {
    writeFieldValue(form, stepId, field, value)
    form.clearErrors(fieldPath(stepId, field) as never)
    clearDependents(field.key)
  }

  const errors = Object.fromEntries(
    fields.map((f) => [
      f.key,
      errorMessageAt(form.formState.errors, fieldPath(stepId, f)),
    ])
  )

  const body = (
    <DynamicFormStep
      fields={fields}
      getValue={(field) => readFieldValue(values, stepId, field)}
      onChange={handleChange}
      errors={errors}
      isVisible={(field) => isFieldVisible(field, lookup)}
      lookup={lookup}
      findField={(key) => fieldIndex.get(key)?.field}
    />
  )

  if (!title) return body

  return (
    <motion.div {...fadeInUp} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {body}
    </motion.div>
  )
}
