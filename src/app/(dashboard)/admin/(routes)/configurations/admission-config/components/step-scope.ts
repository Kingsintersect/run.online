import type { AdmissionStepDefinition } from "@/types/admissionConfig"
import type { MajorProgram, Program, ProgramCategory } from "@/types/school"

// Scope layering for the Admission Configuration page. Category/Program
// resolution mirrors the backend's original GET /admissions/config/steps/
// effective inheritance (sandbox/multi-program-platform/API_CONTRACTS.md
// §A) — a program's own step wins over its category's, which wins over the
// institution default, matched by step key. Major Program does NOT work
// this way — see the note above resolveScope below.
//
// Major Program is the primary scoping axis for admission configuration —
// an admin picks one major program and its process/form steps (and, via
// each FORM step, its own fields) apply to every applicant who chose it via
// the MAJOR_PROGRAM_CHOICE stage. Category and Program stay real (existing
// data keeps working, resolution still honors them) but are no longer
// reachable from this page's own tabs — Major Program replaces "Specific
// program" as the way to scope something narrower than the institution
// default.

export type StepScope =
  | { kind: "default" }
  | { kind: "category"; category: ProgramCategory }
  | { kind: "majorProgram"; majorProgram: MajorProgram }
  | { kind: "program"; program: Program }

export type StepOrigin = StepScope["kind"]

// Tabs use a plain string `value` (shadcn Tabs). Category tab values are
// already the bare ProgramCategory string (e.g. "DEGREE") — a Major Program
// tab value needs a distinct namespace so a category and a major program
// can never collide even if a future one happens to share a name/code.
export const MAJOR_PROGRAM_TAB_PREFIX = "mp:"
export const majorProgramTabValue = (majorProgramId: number) =>
  `${MAJOR_PROGRAM_TAB_PREFIX}${majorProgramId}`
export const majorProgramIdFromTabValue = (value: string): number | null =>
  value.startsWith(MAJOR_PROGRAM_TAB_PREFIX)
    ? Number(value.slice(MAJOR_PROGRAM_TAB_PREFIX.length))
    : null

export interface ScopedStepRow {
  step: AdmissionStepDefinition
  origin: StepOrigin
  /** Belongs to the scope being edited, so it's editable; otherwise inherited. */
  own: boolean
  /** An own row that replaces a broader row with the same key. */
  overrides: boolean
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

export function scopePayload(scope: StepScope): {
  programCategory: ProgramCategory | null
  programId: number | null
  majorProgramId: number | null
} {
  switch (scope.kind) {
    case "default":
      return { programCategory: null, programId: null, majorProgramId: null }
    case "category":
      return {
        programCategory: scope.category,
        programId: null,
        majorProgramId: null,
      }
    case "majorProgram":
      return {
        programCategory: null,
        programId: null,
        majorProgramId: scope.majorProgram.id,
      }
    case "program":
      return {
        programCategory: null,
        programId: scope.program.id,
        majorProgramId: null,
      }
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
        name: "the Major Programs Catalog",
        description:
          'The catalog — step templates every major program can add from ("Add from Catalog" on its own tab). Not served to any applicant directly. Still shared, inheritance-style, by category/program scoping if this deployment uses that older axis.',
      }
    case "category": {
      const label = CATEGORY_LABELS[scope.category]
      return {
        name: `${label} programs`,
        description: `Applies to every ${label} program. Inherited steps come from the default — customise one to change it for ${label} programs only.`,
      }
    }
    case "majorProgram": {
      const name = scope.majorProgram.name
      return {
        name,
        description: `${name} is fully independent — nothing here is inherited from the Major Programs Catalog. Add steps from the catalog below, then order and configure them however ${name} needs, with no effect on any other major program.`,
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

const isDefaultStep = (s: AdmissionStepDefinition) =>
  !s.programId && !s.programCategory && !s.majorProgramId

// This is the admin's own management view. Two different resolution models
// live here side by side:
//
// - "majorProgram" scope: full decoupling (BACKEND_DEVIATIONS A23,
//   sandbox/dynamic-admission/SCHEMA_CHANGES.md §2c). A major program's rows
//   are the *entire* story — nothing is layered in from "All major
//   programs," a category, or any other major program. Every row returned
//   is `own`; there is no more "Inherited" case for this scope kind. "All
//   major programs" becomes a pure catalog (see catalogStepsNotAdopted
//   below) — its rows are never mixed into a major program's resolved list,
//   only offered as templates to copy from via the "Add from Catalog" flow.
// - "default"/"category"/"program" scope: unchanged, original
//   most-specific-wins-with-fallback inheritance (still real — Category
//   tabs still use it; "program" isn't reachable from this page's own tabs
//   anymore, kept only for backward compatibility with any pre-existing
//   program-scoped rows).
export function resolveScope(
  steps: AdmissionStepDefinition[],
  scope: StepScope,
  canEditDefault: boolean
): ScopedStepRow[] {
  if (scope.kind === "majorProgram") {
    return steps
      .filter((s) => !s.programId && s.majorProgramId === scope.majorProgram.id)
      .sort((a, b) => a.order - b.order)
      .map((step) => ({
        step,
        origin: "majorProgram",
        own: true,
        overrides: false,
      }))
  }

  const layers: { origin: StepOrigin; rows: AdmissionStepDefinition[] }[] = [
    { origin: "default", rows: steps.filter(isDefaultStep) },
  ]
  // Category doesn't naturally nest under a major program (a category can
  // span several major programs) — only layer it in for a "category" tab
  // itself, or for a "program" tab inheriting through its own program's
  // category, same as before Major Program existed.
  if (scope.kind === "category" || scope.kind === "program") {
    const category =
      scope.kind === "category" ? scope.category : scope.program.programCategory
    layers.push({
      origin: "category",
      rows: steps.filter((s) => !s.programId && s.programCategory === category),
    })
  }
  if (scope.kind === "program" && scope.program.majorProgramId != null) {
    layers.push({
      origin: "majorProgram",
      rows: steps.filter(
        (s) => !s.programId && s.majorProgramId === scope.program.majorProgramId
      ),
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
    }
  >()
  for (const { origin, rows } of layers) {
    for (const step of rows) {
      const prev = byKey.get(step.key)
      byKey.set(step.key, {
        step,
        origin,
        hasBroader: prev !== undefined,
      })
    }
  }

  return [...byKey.values()]
    .sort((a, b) => a.step.order - b.step.order)
    .map(({ step, origin, hasBroader }) => {
      const own =
        origin === scope.kind && (origin !== "default" || canEditDefault)
      return {
        step,
        origin,
        own,
        overrides: own && hasBroader,
      }
    })
}

/**
 * The catalog picker's source list for "Add from Catalog" — every
 * institution-default (catalog) step of this group that this major program
 * hasn't already adopted (matched by `key`, since an adopted copy keeps its
 * source's key). Excludes MAJOR_PROGRAM_CHOICE — it can only ever be
 * institution-default (BACKEND_DEVIATIONS A22's `MAJOR_PROGRAM_CHOICE_SCOPED`
 * rule), so it's never something a major program adopts.
 */
export function catalogStepsNotAdopted(
  allSteps: AdmissionStepDefinition[],
  majorProgramId: number
): AdmissionStepDefinition[] {
  const adoptedKeys = new Set(
    allSteps
      .filter((s) => s.majorProgramId === majorProgramId)
      .map((s) => s.key)
  )
  return allSteps
    .filter(
      (s) =>
        isDefaultStep(s) &&
        s.key !== "MAJOR_PROGRAM_CHOICE" &&
        !adoptedKeys.has(s.key)
    )
    .sort((a, b) => a.order - b.order)
}
