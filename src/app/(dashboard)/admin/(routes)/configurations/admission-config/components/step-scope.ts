import type { AdmissionStepDefinition } from "@/types/admissionConfig"
import type { Program, ProgramCategory } from "@/types/school"

// Scope layering for the Admission Configuration page. Mirrors the backend's
// GET /admissions/config/steps/effective resolution — a program's own step
// wins over its category's, which wins over the institution default, matched
// by step key (sandbox/multi-program-platform/API_CONTRACTS.md §A) — so each
// tab shows a scope the way its applicants experience it.

export type StepScope =
  | { kind: "default" }
  | { kind: "category"; category: ProgramCategory }
  | { kind: "program"; program: Program }

export type StepOrigin = StepScope["kind"]

export interface ScopedStepRow {
  step: AdmissionStepDefinition
  origin: StepOrigin
  /** Belongs to the scope being edited, so it's editable; otherwise inherited. */
  own: boolean
  /** An own row that replaces a broader row with the same key. */
  overrides: boolean
  /**
   * Off in this scope while a broader version is on. The backend only layers
   * active rows, so switching off an override doesn't hide the inherited step.
   */
  offButStillShown: boolean
}

export const CATEGORY_ORDER: ProgramCategory[] = [
  "DEGREE",
  "PART_TIME",
  "POSTGRADUATE",
  "DIPLOMA",
  "FOUNDATIONAL",
  "CERTIFICATE",
  "SECONDARY_SCHOOL",
]

export const CATEGORY_LABELS: Record<ProgramCategory, string> = {
  DEGREE: "Degree",
  PART_TIME: "Part-time",
  POSTGRADUATE: "Postgraduate",
  DIPLOMA: "Diploma",
  FOUNDATIONAL: "Foundational / JUPEB",
  CERTIFICATE: "Certificate",
  SECONDARY_SCHOOL: "Secondary school",
}

const isOn = (step: AdmissionStepDefinition) => step.enabled || step.required

export function scopePayload(scope: StepScope): {
  programCategory: ProgramCategory | null
  programId: number | null
} {
  switch (scope.kind) {
    case "default":
      return { programCategory: null, programId: null }
    case "category":
      return { programCategory: scope.category, programId: null }
    case "program":
      return { programCategory: null, programId: scope.program.id }
  }
}

/** Categories that have programs, or already have steps scoped to them. */
export function categoriesInUse(
  programs: Program[],
  steps: AdmissionStepDefinition[]
): ProgramCategory[] {
  const used = new Set<ProgramCategory>()
  for (const program of programs) used.add(program.programCategory)
  for (const step of steps) {
    if (step.programCategory) used.add(step.programCategory)
  }
  return CATEGORY_ORDER.filter((category) => used.has(category))
}

export function describeScope(scope: StepScope): {
  name: string
  description: string
} {
  switch (scope.kind) {
    case "default":
      return {
        name: "all programs",
        description:
          "Shared by every program, unless a category or a program customises a step.",
      }
    case "category": {
      const label = CATEGORY_LABELS[scope.category]
      return {
        name: `${label} programs`,
        description: `Applies to every ${label} program. Inherited steps come from the default — customise one to change it for ${label} programs only.`,
      }
    }
    case "program": {
      const label = CATEGORY_LABELS[scope.program.programCategory]
      return {
        name: scope.program.name,
        description: `Applies to ${scope.program.name} only. Inherits from ${label} programs and the default.`,
      }
    }
  }
}

export function resolveScope(
  steps: AdmissionStepDefinition[],
  scope: StepScope,
  canEditDefault: boolean
): ScopedStepRow[] {
  const layers: { origin: StepOrigin; rows: AdmissionStepDefinition[] }[] = [
    {
      origin: "default",
      rows: steps.filter((s) => !s.programId && !s.programCategory),
    },
  ]
  if (scope.kind !== "default") {
    const category =
      scope.kind === "category" ? scope.category : scope.program.programCategory
    layers.push({
      origin: "category",
      rows: steps.filter((s) => !s.programId && s.programCategory === category),
    })
  }
  if (scope.kind === "program") {
    layers.push({
      origin: "program",
      rows: steps.filter((s) => s.programId === scope.program.id),
    })
  }

  const byKey = new Map<
    string,
    {
      step: AdmissionStepDefinition
      origin: StepOrigin
      hasBroader: boolean
      broaderOn: boolean
    }
  >()
  for (const { origin, rows } of layers) {
    for (const step of rows) {
      const prev = byKey.get(step.key)
      byKey.set(step.key, {
        step,
        origin,
        hasBroader: prev !== undefined,
        broaderOn: prev ? prev.broaderOn || isOn(prev.step) : false,
      })
    }
  }

  return [...byKey.values()]
    .sort((a, b) => a.step.order - b.step.order)
    .map(({ step, origin, hasBroader, broaderOn }) => {
      const own =
        origin === scope.kind && (origin !== "default" || canEditDefault)
      return {
        step,
        origin,
        own,
        overrides: own && hasBroader,
        offButStillShown: !isOn(step) && broaderOn,
      }
    })
}
