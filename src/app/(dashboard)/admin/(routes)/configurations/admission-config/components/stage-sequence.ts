import {
  BUILT_IN_STAGE_CONFIG_BY_KEY,
  STAGE_TYPE_CATALOG,
  STAGE_TYPES,
  resolveStageType,
} from "@/lib/admission-catalog"
import { stageConfigSchemas } from "@/schemas/admission-dynamic.schema"
import type { StageType } from "@/types/admissionConfig"
import type { ScopedStepRow } from "./step-scope"

export interface StageSequenceIssue {
  code: string
  message: string
}

// Mirrors the backend's INVALID_STAGE_SEQUENCE rules
// (sandbox/dynamic-admission/API_CONTRACTS.md §2.3) for one resolved scope,
// so the admin sees a problem before saving rather than as a 422.
export function validateStageSequence(
  rows: ScopedStepRow[]
): StageSequenceIssue[] {
  const active = rows
    .filter(({ step }) => step.enabled || step.required)
    .map(({ step }) => ({ step, type: resolveStageType(step) }))
  const issues: StageSequenceIssue[] = []

  for (const { step, type } of active) {
    if (!type) {
      issues.push({
        code: "MISSING_TYPE",
        message: `"${step.label}" has no stage type, so applicants won't see it. Edit it to pick one.`,
      })
    }
  }

  const indexesOf = (type: StageType) =>
    active.flatMap((entry, i) => (entry.type === type ? [i] : []))

  for (const type of STAGE_TYPES) {
    const { multiple, label } = STAGE_TYPE_CATALOG[type]
    const count = indexesOf(type).length
    if (!multiple && count > 1) {
      issues.push({
        code: `MULTIPLE_${type}`,
        message: `Only one "${label}" stage is allowed — there are ${count}.`,
      })
    }
  }

  const completes = indexesOf("COMPLETE")
  if (active.length > 0 && completes.length === 0) {
    issues.push({
      code: "MISSING_COMPLETE",
      message: "Add a Complete stage so applicants get a finish screen.",
    })
  } else if (completes.some((i) => i !== active.length - 1)) {
    issues.push({
      code: "COMPLETE_NOT_LAST",
      message: "The Complete stage must be the last stage.",
    })
  }

  const [firstForm] = indexesOf("FORM")
  const [firstChoice] = indexesOf("PROGRAM_CHOICE")
  if (
    firstForm !== undefined &&
    firstChoice !== undefined &&
    firstForm < firstChoice
  ) {
    issues.push({
      code: "FORM_BEFORE_PROGRAM_CHOICE",
      message: "The application form must come after the program choice.",
    })
  }

  const [firstMajorChoice] = indexesOf("MAJOR_PROGRAM_CHOICE")
  if (
    firstMajorChoice !== undefined &&
    firstChoice !== undefined &&
    firstChoice < firstMajorChoice
  ) {
    issues.push({
      code: "PROGRAM_CHOICE_BEFORE_MAJOR_PROGRAM_CHOICE",
      message:
        "The program choice must come after the major program choice, so its own picker can narrow to that major program's programs.",
    })
  }

  const [firstDecision] = indexesOf("DECISION")
  active.forEach(({ step, type }, i) => {
    if (type !== "PAYMENT") return
    const parsed = stageConfigSchemas.PAYMENT.safeParse(
      step.config ?? BUILT_IN_STAGE_CONFIG_BY_KEY[step.key]
    )
    if (!parsed.success) return
    const { feeCategory } = parsed.data
    if (
      (feeCategory === "ACCEPTANCE" || feeCategory === "TUITION") &&
      (firstDecision === undefined || i < firstDecision)
    ) {
      issues.push({
        code: `${feeCategory}_PAYMENT_BEFORE_DECISION`,
        message: `"${step.label}" charges the ${feeCategory === "ACCEPTANCE" ? "acceptance fee" : "tuition"}, so it must come after the admission decision.`,
      })
    }
  })

  return issues
}
