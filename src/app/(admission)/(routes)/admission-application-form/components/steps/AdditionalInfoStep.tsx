"use client"

/* ------------------------------------------------------------------ */
/*  Additional Information step — Multi-Program Platform §B            */
/*                                                                     */
/*  Renders every custom FORM-group field resolved for the applicant's */
/*  program (sandbox/multi-program-platform/). Only ever mounted when  */
/*  useAdmissionForm's activeSteps includes FormStep.ADDITIONAL_INFO,  */
/*  which only happens once there's at least one such field — an       */
/*  institution/program with none never renders this at all.           */
/* ------------------------------------------------------------------ */

import { motion } from "framer-motion"
import { useFormContext } from "react-hook-form"
import { DynamicFormStep } from "../DynamicFormStep"
import type { DynamicFieldValue } from "../DynamicFormField"
import type { FormDefaultValues } from "../../types/form-types"
import type { AdmissionFormField } from "@/types/admissionConfig"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" as const },
}

interface AdditionalInfoStepProps {
  fields: AdmissionFormField[]
}

export default function AdditionalInfoStep({
  fields,
}: AdditionalInfoStepProps) {
  const { watch, setValue, formState } = useFormContext<FormDefaultValues>()
  const values = watch("customFields") ?? {}
  const errors = formState.errors.customFields as
    | Record<string, { message?: string }>
    | undefined

  const handleChange = (key: string, value: DynamicFieldValue) => {
    setValue(
      "customFields",
      { ...values, [key]: value },
      { shouldDirty: true, shouldTouch: true }
    )
  }

  return (
    <motion.div {...fadeInUp} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          Additional Information
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A few more questions specific to the program you selected.
        </p>
      </div>

      <DynamicFormStep
        fields={fields}
        values={values as Record<string, DynamicFieldValue>}
        onChange={handleChange}
        errors={Object.fromEntries(
          Object.entries(errors ?? {})
            .filter(([, v]) => v?.message)
            .map(([k, v]) => [k, v.message as string])
        )}
      />
    </motion.div>
  )
}
