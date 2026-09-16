import {
  BUILT_IN_STAGE_CONFIG_BY_KEY,
  STAGE_TYPE_CATALOG,
  STAGE_TYPES,
  resolveStageType,
  type PrecedenceRuleCode,
} from "@/lib/admission-catalog"
import { stageConfigSchemas } from "@/schemas/admission-dynamic.schema"
import type { StageType } from "@/types/admissionConfig"
import type { ScopedStepRow } from "./step-scope"

export interface StageSequenceIssue {
  code: string
  message: string
}

/** Resolved rule state for one scope (sandbox/dynamic-sequence-rules/) —
 *  `undefined` for a code, or the whole map itself, means "enabled", so
 *  passing nothing at all reproduces today's exact all-on behavior. */
export type ResolvedSequenceRuleSettings = Partial<
  Record<PrecedenceRuleCode, boolean>
>

const isRuleEnabled = (
  settings: ResolvedSequenceRuleSettings | undefined,
  code: PrecedenceRuleCode
): boolean => settings?.[code] !== false

// Mirrors the backend's INVALID_STAGE_SEQUENCE rules
// (sandbox/dynamic-admission/API_CONTRACTS.md §2.3) for one resolved scope,
// so the admin sees a problem before saving rather than as a 422. The 3
// Integrity checks below (MISSING_TYPE, MULTIPLE_{TYPE}, MISSING_COMPLETE)
// always run — sandbox/dynamic-sequence-rules/README.md §4 keeps them
// permanently locked. The 6 Precedence checks each respect `ruleSettings`
// (sandbox/dynamic-sequence-rules/) once the caller resolves it for this
// scope; omitting it (or the backend not shipping the setting yet) means
// every rule stays exactly as strict as it's always been.
export function validateStageSequence(
  rows: ScopedStepRow[],
  ruleSettings?: ResolvedSequenceRuleSettings
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
  } else if (
    completes.some((i) => i !== active.length - 1) &&
    isRuleEnabled(ruleSettings, "COMPLETE_MUST_BE_LAST")
  ) {
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
    firstForm < firstChoice &&
    isRuleEnabled(ruleSettings, "FORM_AFTER_PROGRAM_CHOICE")
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
    firstChoice < firstMajorChoice &&
    isRuleEnabled(ruleSettings, "PROGRAM_CHOICE_AFTER_MAJOR_PROGRAM_CHOICE")
  ) {
    issues.push({
      code: "PROGRAM_CHOICE_BEFORE_MAJOR_PROGRAM_CHOICE",
      message:
        "The program choice must come after the major program choice, so its own picker can narrow to that major program's programs.",
    })
  }
  // The whole point of Major Program Choice is deciding which major
  // program's own steps apply — nothing can meaningfully come before it,
  // including a CONTENT/DOCUMENT_UPLOAD stage that happens to be scoped
  // to "all major programs" too.
  if (
    firstMajorChoice !== undefined &&
    firstMajorChoice !== 0 &&
    isRuleEnabled(ruleSettings, "MAJOR_PROGRAM_CHOICE_MUST_BE_FIRST")
  ) {
    issues.push({
      code: "MAJOR_PROGRAM_CHOICE_NOT_FIRST",
      message:
        "The Major Program Choice stage must be the very first stage — every later stage depends on knowing which major program applies.",
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
    const precedenceCode: PrecedenceRuleCode | null =
      feeCategory === "ACCEPTANCE"
        ? "ACCEPTANCE_PAYMENT_AFTER_DECISION"
        : feeCategory === "TUITION"
          ? "TUITION_PAYMENT_AFTER_DECISION"
          : null
    if (
      (feeCategory === "ACCEPTANCE" || feeCategory === "TUITION") &&
      (firstDecision === undefined || i < firstDecision) &&
      (precedenceCode === null || isRuleEnabled(ruleSettings, precedenceCode))
    ) {
      issues.push({
        code: `${feeCategory}_PAYMENT_BEFORE_DECISION`,
        message: `"${step.label}" charges the ${feeCategory === "ACCEPTANCE" ? "acceptance fee" : "tuition"}, so it must come after the admission decision.`,
      })
    }
  })

  return issues
}
