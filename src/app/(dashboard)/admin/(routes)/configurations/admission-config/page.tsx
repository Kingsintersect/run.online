"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles,
  Loader2,
  GraduationCap,
  FileText,
  ListChecks,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react"
import { toast } from "sonner"
import EmptyState from "@/components/custom/EmptyState"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMajorProgramScope } from "@/hooks/use-major-program-scope"
import { useAllPrograms, useMajorPrograms } from "@/hooks/useCourseStructure"
import {
  admissionStepsApi,
  admissionStepsKeys,
  admissionStepsQueryOptions,
  admissionStepsMutationOptions,
} from "@/services/admissionStepsApi"
import {
  admissionFormFieldsApi,
  admissionFormFieldsKeys,
} from "@/app/(admission)/(routes)/admission-application-form/services/admission-form-fields.service"
import {
  KNOWN_PROCESS_STEP_KEYS,
  KNOWN_FORM_STEP_KEYS,
} from "@/lib/admissionConfig"
import { STAGE_TYPE_CATALOG, resolveStageType } from "@/lib/admission-catalog"
import type {
  AdmissionStepDefinition,
  AdmissionStepGroup,
  StageType,
} from "@/types/admissionConfig"
import type { MajorProgram, ProgramCategory } from "@/types/school"
import StepConfigPanel from "./components/StepConfigPanel"
import StepFormModal, {
  CUSTOM_STEP_TYPE,
  type StepFormValues,
} from "./components/StepFormModal"
import StepFieldsModal from "./components/StepFieldsModal"
import {
  validateStageSequence,
  type ResolvedSequenceRuleSettings,
} from "./components/stage-sequence"
import SequenceRulesPanel from "./components/SequenceRulesPanel"
import type { StageDraft } from "./components/stage-draft"
import {
  CATEGORY_LABELS,
  catalogStepsNotAdopted,
  describeScope,
  majorProgramIdFromTabValue,
  majorProgramTabValue,
  resolveScope,
  scopePayload,
  type ScopedStepRow,
  type StepOrigin,
  type StepScope,
} from "./components/step-scope"
import AddFromCatalogDialog from "./components/AddFromCatalogDialog"

// Shared by customiseMutation (category/program tabs, still inheritance-
// based) and adoptMutation (major-program tabs, "Add from Catalog") — a
// FORM step's dynamic fields are copied onto its new row, so the copy
// starts out asking the same questions. Child fields may come nested or
// flat; parents are copied first so each child can point at its parent's
// new id.
async function copyFormFieldsToStep(
  sourceStepId: number,
  newStepId: number
): Promise<number> {
  const listed = await admissionFormFieldsApi.list(sourceStepId)
  const flat = listed.flatMap((field) => [
    field,
    ...(field.children ?? []).map((child) => ({
      ...child,
      parentFieldId: child.parentFieldId ?? field.id,
    })),
  ])
  const unique = [...new Map(flat.map((f) => [f.id, f])).values()]
  const ordered = [
    ...unique.filter((f) => !f.parentFieldId),
    ...unique.filter((f) => f.parentFieldId),
  ]
  const newIdByOldId = new Map<number, number>()
  for (const field of ordered) {
    const copy = await admissionFormFieldsApi.create(newStepId, {
      key: field.key,
      label: field.label,
      type: field.type,
      order: field.order,
      isRequired: field.isRequired,
      helpText: field.helpText,
      options: field.options,
      validation: field.validation,
      repeatable: field.repeatable,
      systemKey: field.systemKey ?? null,
      placeholder: field.placeholder ?? null,
      width: field.width ?? "FULL",
      defaultValue: field.defaultValue ?? null,
      visibleWhen: field.visibleWhen ?? null,
      optionsSource: field.optionsSource ?? null,
      dependsOn: field.dependsOn ?? null,
      parentFieldId: field.parentFieldId
        ? (newIdByOldId.get(field.parentFieldId) ?? null)
        : null,
    })
    newIdByOldId.set(field.id, copy.id)
  }
  return ordered.length
}

const DEFAULT_TAB = "default"
const NO_SELECTION = "__none__"

// PROGRAM_SELECTION is superseded by the "Choice Program" PROCESS step
// (program/entry-mode/study-mode choice now happens before the application
// fee, not inside the form — see getActiveFormSteps in
// admission-application-form/types/form-types.ts) and is never rendered in
// the live form anymore, so it's hidden here too rather than left as a
// toggle that does nothing.
const HIDDEN_FORM_KEY = "PROGRAM_SELECTION"

type MoveDirection = "up" | "down"

function slugifyKey(label: string, existingKeys: string[]): string {
  const base =
    label
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "STEP"
  let key = base
  let i = 2
  while (existingKeys.includes(key)) key = `${base}_${i++}`
  return key
}

export default function AdmissionConfigPage() {
  const queryClient = useQueryClient()
  const processQuery = useQuery(admissionStepsQueryOptions.list("PROCESS"))
  const formQuery = useQuery(admissionStepsQueryOptions.list("FORM"))
  const { data: programsRes } = useAllPrograms()
  const { data: majorProgramsRes } = useMajorPrograms()
  const { isUnscoped, scopedPrograms } = useMajorProgramScope()

  const createMutation = useMutation(admissionStepsMutationOptions.create())
  const updateMutation = useMutation(admissionStepsMutationOptions.update())
  const removeMutation = useMutation(admissionStepsMutationOptions.remove())
  const reorderMutation = useMutation(admissionStepsMutationOptions.reorder())
  // Copies an inherited step into the scope being edited. A FORM step's
  // dynamic fields are copied too, so the customised version starts out
  // asking the same questions.
  const customiseMutation = useMutation({
    mutationFn: async ({
      step,
      target,
      order,
    }: {
      step: AdmissionStepDefinition
      target: StepScope
      /** Position for the copy — defaults to the inherited step's own. */
      order?: number
    }) => {
      const created = await admissionStepsApi.create({
        group: step.group,
        key: step.key,
        order: order ?? step.order,
        label: step.label,
        description: step.description,
        icon: step.icon,
        required: step.required,
        enabled: step.enabled,
        ...scopePayload(target),
        // A PROCESS-group step's type is required and immutable — omitting
        // it here (the bug, found 2026-09-15) made every customise of a
        // PROCESS step 422 with "The type field is required when group is
        // PROCESS", including the implicit customise the create flow below
        // does to bump COMPLETE out of the way for a brand new step. FORM
        // rows never carry a type, so this stays a no-op for them.
        ...(step.group === "PROCESS"
          ? { type: step.type, config: step.config }
          : {}),
      })
      if (step.group !== "FORM") return 0
      return copyFormFieldsToStep(step.id, created.id)
    },
  })

  // Major-Program Scoping — moves an owned step from its current major
  // program to a different one, preserving its key (so it's still the same
  // logical step, resolved against the new scope) and FORM fields (a
  // PATCH, not a delete+recreate). Blocks up front on a real conflict the
  // destination already has (same key, or a singleton stage type already
  // in use there) rather than letting the backend reject it opaquely.
  // Bumps the destination's own Complete stage out of the way first, same
  // reasoning as a brand-new step's create flow below.
  const moveMutation = useMutation({
    mutationFn: async ({
      step,
      destination,
    }: {
      step: AdmissionStepDefinition
      destination: MajorProgram
    }) => {
      const destinationScope: StepScope = {
        kind: "majorProgram",
        majorProgram: destination,
      }
      const destinationRows = resolveScope(
        step.group === "PROCESS" ? allProcess : allForm,
        destinationScope,
        canEditDefault
      )
      const destinationOwn = destinationRows.filter((row) => row.own)
      const keyCollision = destinationOwn.find(
        (row) => row.step.key === step.key
      )
      if (keyCollision) {
        throw new Error(
          `${destination.name} already has its own "${keyCollision.step.label}" step — remove or rename it there first.`
        )
      }
      if (step.group === "PROCESS") {
        const type = resolveStageType(step)
        if (type && !STAGE_TYPE_CATALOG[type].multiple) {
          const typeCollision = destinationOwn.find(
            (row) =>
              (row.step.enabled || row.step.required) &&
              resolveStageType(row.step) === type
          )
          if (typeCollision) {
            throw new Error(
              `${destination.name} already has its own "${STAGE_TYPE_CATALOG[type].label}" stage — only one is allowed.`
            )
          }
        }
      }

      const completeRow = destinationRows.find(
        (row) => resolveStageType(row.step) === "COMPLETE"
      )
      let order =
        destinationOwn.reduce((max, row) => Math.max(max, row.step.order), 0) +
        1
      if (completeRow) {
        order = completeRow.step.order
        const nextOrder = order + 1
        if (completeRow.own) {
          await updateMutation.mutateAsync({
            id: completeRow.step.id,
            payload: { order: nextOrder },
          })
        } else {
          await customiseMutation.mutateAsync({
            step: completeRow.step,
            target: destinationScope,
            order: nextOrder,
          })
        }
      }

      return updateMutation.mutateAsync({
        id: step.id,
        payload: { majorProgramId: destination.id, order },
      })
    },
  })

  // Major-Program Scoping — full decoupling (BACKEND_DEVIATIONS A23,
  // sandbox/dynamic-admission/SCHEMA_CHANGES.md §2c). "Add from Catalog":
  // the admin picks specific institution-default steps to adopt into one
  // major program — each becomes a brand-new, fully independent row there
  // (same underlying create() as customise, just for many steps at once,
  // and framed as opt-in rather than override).
  //
  // Simply appending imports after everything this major program already
  // owns is wrong whenever an imported step must come *before* an
  // already-owned one — e.g. importing Decision when Acceptance Payment
  // was already adopted earlier violates ACCEPTANCE_PAYMENT_BEFORE_DECISION
  // immediately (found in review 2026-09-15). So for PROCESS, every
  // existing-plus-incoming step is merged by a coarse "phase" derived from
  // its stage type (and, for PAYMENT, its fee category) that mirrors
  // stage-sequence.ts's own rules — Program Choice, then Application
  // Payment, then Form, then Decision, then Acceptance/Tuition Payment,
  // then Complete last, with everything else (Content, Document Upload,
  // custom/untyped) in a flexible middle phase that keeps its catalog
  // order relative to same-phase peers. This one merge subsumes the old
  // Complete-specific bump entirely — Complete is just phase 99.
  //
  // Existing rows that need to move are updated highest-target-position
  // first (so a freed slot is never occupied by two rows at once — the
  // same "never send a call representing an invalid intermediate state"
  // reasoning as COMPLETE_NOT_LAST/MAJOR_PROGRAM_CHOICE_NOT_FIRST, just
  // generalized to N reinsertions instead of one), then the new steps are
  // created at their own now-vacated integer positions, ascending.
  //
  // FORM has no cross-step sequence rule (stage-sequence.ts only validates
  // PROCESS), so it keeps the simple "append after what's already there."
  const stagePhase = (step: AdmissionStepDefinition): number => {
    const type = resolveStageType(step)
    if (!type) return 3.5
    if (type === "PAYMENT") {
      const category = (step.config as { feeCategory?: string } | null)
        ?.feeCategory
      if (category === "APPLICATION") return 2
      if (category === "ACCEPTANCE" || category === "TUITION") return 5
      return 3.5
    }
    const phases: Partial<Record<StageType, number>> = {
      PROGRAM_CHOICE: 1,
      FORM: 3,
      DECISION: 4,
      COMPLETE: 99,
    }
    return phases[type] ?? 3.5
  }

  const adoptMutation = useMutation({
    mutationFn: async ({
      catalogSteps,
      destination,
      group,
    }: {
      catalogSteps: AdmissionStepDefinition[]
      destination: MajorProgram
      group: AdmissionStepGroup
    }) => {
      const target: StepScope = {
        kind: "majorProgram",
        majorProgram: destination,
      }
      const existingOwn = resolveScope(
        group === "PROCESS" ? allProcess : allForm,
        target,
        canEditDefault
      )

      const createOne = async (
        source: AdmissionStepDefinition,
        order: number
      ) => {
        const created = await admissionStepsApi.create({
          group: source.group,
          key: source.key,
          order,
          label: source.label,
          description: source.description,
          icon: source.icon,
          required: source.required,
          enabled: source.enabled,
          ...scopePayload(target),
          ...(source.group === "PROCESS"
            ? { type: source.type, config: source.config }
            : {}),
        })
        if (source.group === "FORM") {
          await copyFormFieldsToStep(source.id, created.id)
        }
      }

      if (group === "FORM") {
        let order =
          existingOwn.reduce((max, row) => Math.max(max, row.step.order), 0) + 1
        for (const source of catalogSteps) await createOne(source, order++)
        return catalogSteps.length
      }

      type MergedItem =
        | { kind: "existing"; row: ScopedStepRow }
        | { kind: "new"; step: AdmissionStepDefinition }
      const merged: (MergedItem & { phase: number })[] = [
        ...existingOwn.map((row) => ({
          kind: "existing" as const,
          row,
          phase: stagePhase(row.step),
        })),
        ...catalogSteps.map((step) => ({
          kind: "new" as const,
          step,
          phase: stagePhase(step),
        })),
      ]
      // Stable sort by phase — same-phase items keep their relative order
      // (existing rows already sorted by current order, new ones by
      // catalog order, and Array.prototype.sort is stable).
      merged.sort((a, b) => a.phase - b.phase)

      const existingMoves = merged
        .map((item, i) => ({ item, targetOrder: i + 1 }))
        .filter(
          (
            x
          ): x is {
            item: { kind: "existing"; row: ScopedStepRow; phase: number }
            targetOrder: number
          } =>
            x.item.kind === "existing" &&
            x.item.row.step.order !== x.targetOrder
        )
        .sort((a, b) => b.targetOrder - a.targetOrder)
      for (const { item, targetOrder } of existingMoves) {
        await updateMutation.mutateAsync({
          id: item.row.step.id,
          payload: { order: targetOrder },
        })
      }

      let imported = 0
      for (const [i, item] of merged.entries()) {
        if (item.kind !== "new") continue
        await createOne(item.step, i + 1)
        imported++
      }
      return imported
    },
  })

  // Two navigation states: "catalog" (default on load — template CRUD only,
  // nothing served to an applicant) and "programs" ("Program Configurations"
  // — the major-program/category tabs, where steps are actually adopted,
  // reordered, customised and removed per major program).
  const [view, setView] = useState<"catalog" | "programs">("catalog")
  const [tab, setTab] = useState<string>(DEFAULT_TAB)
  const [previewProgramId, setPreviewProgramId] = useState<number | null>(null)
  const [previewMajorProgramId, setPreviewMajorProgramId] = useState<
    number | null
  >(null)
  const [formModal, setFormModal] = useState<{
    group: AdmissionStepGroup
    editing: AdmissionStepDefinition | null
  } | null>(null)
  const [deleting, setDeleting] = useState<AdmissionStepDefinition | null>(null)
  const [fieldsStep, setFieldsStep] = useState<AdmissionStepDefinition | null>(
    null
  )
  // A move in a category/program tab that passes an inherited step — that
  // step has to be customised here first, so it's confirmed before it happens.
  const [pendingMove, setPendingMove] = useState<{
    moving: ScopedStepRow
    other: ScopedStepRow
    direction: MoveDirection
  } | null>(null)
  // Major-Program Scoping — moving an owned step to a different major
  // program (distinct from `pendingMove` above, which is about reordering).
  const [movingStep, setMovingStep] = useState<AdmissionStepDefinition | null>(
    null
  )
  const [moveDestinationId, setMoveDestinationId] = useState<number | null>(
    null
  )
  // "Add from Catalog" — which group's picker is open, if any.
  const [catalogModalGroup, setCatalogModalGroup] =
    useState<AdmissionStepGroup | null>(null)
  // Sequence Rules — sandbox/dynamic-sequence-rules/ (A24, approved,
  // backend not live yet).
  const [sequenceRulesOpen, setSequenceRulesOpen] = useState(false)

  const previewProcess = useQuery({
    ...admissionStepsQueryOptions.effective(
      "PROCESS",
      previewProgramId,
      previewMajorProgramId
    ),
    // The Live Preview panel that consumes this is hidden in catalog view —
    // no point fetching it until Program Configurations is actually open.
    enabled: view === "programs",
  })
  const previewForm = useQuery({
    ...admissionStepsQueryOptions.effective(
      "FORM",
      previewProgramId,
      previewMajorProgramId
    ),
    enabled: view === "programs",
  })

  // A scoped admin only works within their own major programs, and can't
  // change the institution-wide default that every program inherits. The
  // backend is the real boundary (major-program-scoping API_CONTRACTS §2);
  // this only keeps the page consistent with it.
  const scopedIds = new Set(scopedPrograms.map((mp) => mp.id))
  const programs = (programsRes?.data ?? []).filter(
    (p) =>
      isUnscoped ||
      (p.majorProgramId != null && scopedIds.has(p.majorProgramId))
  )
  const majorPrograms = (majorProgramsRes?.data ?? []).filter(
    (mp) => isUnscoped || scopedIds.has(mp.id)
  )
  const canEditDefault = isUnscoped

  const allProcess = processQuery.data ?? []
  const allForm = (formQuery.data ?? []).filter(
    (s) => s.key !== HIDDEN_FORM_KEY
  )

  const majorProgramIdFromTab = majorProgramIdFromTabValue(tab)
  const selectedMajorProgram =
    majorProgramIdFromTab !== null
      ? (majorPrograms.find((mp) => mp.id === majorProgramIdFromTab) ?? null)
      : null
  const scope: StepScope | null =
    view === "catalog"
      ? { kind: "default" }
      : majorProgramIdFromTab !== null
        ? selectedMajorProgram
          ? { kind: "majorProgram", majorProgram: selectedMajorProgram }
          : null
        : tab === DEFAULT_TAB
          ? null
          : { kind: "category", category: tab as ProgramCategory }
  const scopeInfo = scope ? describeScope(scope) : null
  const scopeCategory = scope?.kind === "category" ? scope.category : null
  const originLabels: Record<StepOrigin, string> = {
    default: "All programs",
    category: scopeCategory ? CATEGORY_LABELS[scopeCategory] : "Category",
    majorProgram: selectedMajorProgram?.name ?? "Major program",
    // Program-level scoping isn't reachable from this page's own tabs
    // anymore (Major Program replaced it — see step-scope.ts), but the
    // origin still exists on any pre-existing program-scoped step, which
    // stays fully functional — just not editable from here.
    program: "Program",
  }

  const processRows = scope
    ? resolveScope(allProcess, scope, canEditDefault)
    : []
  const formRows = scope ? resolveScope(allForm, scope, canEditDefault) : []
  const canEditScope =
    scope !== null && (scope.kind !== "default" || canEditDefault)

  // Sequence Rules (sandbox/dynamic-sequence-rules/, A24) — only a major
  // program scope has its own row; every other scope (catalog, category)
  // edits/reads the institution default (majorProgramId: null).
  const sequenceRulesMajorProgramId =
    scope?.kind === "majorProgram" ? scope.majorProgram.id : null
  const sequenceRulesScopeName =
    scope?.kind === "majorProgram"
      ? scope.majorProgram.name
      : "Institution Default"
  const sequenceRulesQuery = useQuery(
    admissionStepsQueryOptions.sequenceRules(sequenceRulesMajorProgramId)
  )
  const resolvedRuleSettings: ResolvedSequenceRuleSettings = Object.fromEntries(
    (sequenceRulesQuery.data ?? []).map((r) => [r.ruleCode, r.enabled])
  )
  // Moving only makes sense between major programs, and only when there's
  // more than one to move to.
  const canMoveSteps =
    scope?.kind === "majorProgram" && majorPrograms.length > 1
  // "Add from Catalog" source lists — every institution-default step of
  // each group this major program hasn't already adopted.
  const catalogOptions: Record<AdmissionStepGroup, AdmissionStepDefinition[]> =
    scope?.kind === "majorProgram"
      ? {
          PROCESS: catalogStepsNotAdopted(allProcess, scope.majorProgram.id),
          FORM: catalogStepsNotAdopted(allForm, scope.majorProgram.id),
        }
      : { PROCESS: [], FORM: [] }
  const rowsFor = (group: AdmissionStepGroup) =>
    group === "PROCESS" ? processRows : formRows
  const stageIssues = scope
    ? validateStageSequence(processRows, resolvedRuleSettings)
    : []
  // Stage types already active in this scope, for the step modal's type
  // picker (types allowing one stage are disabled once taken).
  const stageTypesInUse: StageType[] = processRows
    .filter(
      ({ step }) =>
        step.id !== formModal?.editing?.id && (step.enabled || step.required)
    )
    .flatMap(({ step }) => {
      const type = resolveStageType(step)
      return type ? [type] : []
    })

  // "Preview as" options for the Default/Category tabs — every real
  // program, each carrying its own major program so picking one resolves
  // exactly as that applicant would experience it (programId wins, but the
  // preview should reflect the whole chain, not just the leaf).
  const previewOptions =
    scope?.kind === "category"
      ? programs.filter((p) => p.programCategory === scope.category)
      : programs

  const isLoading = processQuery.isLoading || formQuery.isLoading
  const isError = processQuery.isError || formQuery.isError
  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    removeMutation.isPending ||
    reorderMutation.isPending ||
    customiseMutation.isPending

  const invalidateAll = () =>
    queryClient.invalidateQueries({ queryKey: admissionStepsKeys.all })

  // "Program Configurations" — switches into the major-program/category
  // tabs. Remembers the last-viewed tab; only auto-picks one the first time
  // (or if nothing valid is selected, e.g. every program tab disappeared).
  const handleEnterProgramsView = () => {
    setView("programs")
    const stillValid =
      tab !== DEFAULT_TAB &&
      majorPrograms.some((mp) => majorProgramTabValue(mp.id) === tab)
    if (!stillValid) {
      const firstTab =
        majorPrograms[0] != null
          ? majorProgramTabValue(majorPrograms[0].id)
          : null
      if (firstTab) handleTabChange(firstTab)
    }
  }
  const handleBackToCatalog = () => setView("catalog")

  const handleTabChange = (value: string) => {
    setTab(value)
    const tabMajorProgramId = majorProgramIdFromTabValue(value)
    if (value === DEFAULT_TAB) {
      setPreviewProgramId(null)
      setPreviewMajorProgramId(null)
    } else if (tabMajorProgramId !== null) {
      // Selecting a Major Program tab previews exactly that major program,
      // before any specific program is chosen — the same "Previewing X"
      // static display a Category tab used to reserve for "Specific
      // program". Use the "Preview as" picker inside a Default/Category tab
      // to go narrower (a specific program under this major program).
      setPreviewProgramId(null)
      setPreviewMajorProgramId(tabMajorProgramId)
    } else {
      const representative = programs.find((p) => p.programCategory === value)
      setPreviewProgramId(representative?.id ?? null)
      setPreviewMajorProgramId(representative?.majorProgramId ?? null)
    }
  }

  // The "Preview as" picker (Default/Category tabs) encodes each option's
  // value the same way a Major Program tab does, plus plain program ids —
  // see the SelectContent below for exactly what's offered.
  const handlePreviewAsChange = (value: string) => {
    if (value === NO_SELECTION) {
      setPreviewProgramId(null)
      setPreviewMajorProgramId(null)
      return
    }
    const asMajorProgramId = majorProgramIdFromTabValue(value)
    if (asMajorProgramId !== null) {
      setPreviewProgramId(null)
      setPreviewMajorProgramId(asMajorProgramId)
      return
    }
    const program = programs.find((p) => p.id === Number(value))
    setPreviewProgramId(program?.id ?? null)
    setPreviewMajorProgramId(program?.majorProgramId ?? null)
  }

  const handleToggle = async (step: AdmissionStepDefinition, next: boolean) => {
    try {
      await updateMutation.mutateAsync({
        id: step.id,
        payload: { enabled: next },
      })
      invalidateAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update step")
    }
  }

  // Swaps two neighbouring steps' positions within a category/program tab.
  // The backend's reorder route renumbers whatever ids it's given from 1, so
  // it can only be used for the default set; here each side's `order` is
  // set directly. An inherited side is customised into this scope with the
  // swapped position, since its own position belongs to the broader scope.
  const swapInScope = async (
    moving: ScopedStepRow,
    other: ScopedStepRow,
    direction: MoveDirection
  ) => {
    if (!scope || scope.kind === "default") return
    let movingOrder = other.step.order
    let otherOrder = moving.step.order
    if (movingOrder === otherOrder) {
      movingOrder =
        direction === "up"
          ? Math.max(1, other.step.order - 1)
          : other.step.order + 1
      otherOrder = other.step.order
    }
    const updates: [ScopedStepRow, number][] = [
      [moving, movingOrder],
      [other, otherOrder],
    ]
    try {
      for (const [row, order] of updates) {
        if (row.own) {
          await updateMutation.mutateAsync({
            id: row.step.id,
            payload: { order },
          })
        } else {
          await customiseMutation.mutateAsync({
            step: row.step,
            target: scope,
            order,
          })
        }
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reorder steps"
      )
    } finally {
      invalidateAll()
      queryClient.invalidateQueries({ queryKey: admissionFormFieldsKeys.all })
    }
  }

  const handleReorder = async (
    group: AdmissionStepGroup,
    step: AdmissionStepDefinition,
    direction: MoveDirection
  ) => {
    if (!scope) return
    const rows = rowsFor(group)
    const idx = rows.findIndex((row) => row.step.id === step.id)
    const swapWith = direction === "up" ? idx - 1 : idx + 1
    if (idx < 0 || swapWith < 0 || swapWith >= rows.length) return

    if (scope.kind !== "default") {
      const moving = rows[idx]
      const other = rows[swapWith]
      if (!moving.own || !other.own) {
        setPendingMove({ moving, other, direction })
        return
      }
      await swapInScope(moving, other, direction)
      return
    }

    const orderedIds = rows.map((row) => row.step.id)
    ;[orderedIds[idx], orderedIds[swapWith]] = [
      orderedIds[swapWith],
      orderedIds[idx],
    ]
    try {
      await reorderMutation.mutateAsync({ group, orderedIds })
      invalidateAll()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reorder steps"
      )
    }
  }

  const handleConfirmMove = async () => {
    if (!pendingMove) return
    const { moving, other, direction } = pendingMove
    setPendingMove(null)
    await swapInScope(moving, other, direction)
  }

  // One-click fix for MAJOR_PROGRAM_CHOICE_NOT_FIRST /
  // PROGRAM_CHOICE_BEFORE_MAJOR_PROGRAM_CHOICE. Moving it to the front via
  // the up-arrow one hop at a time doesn't work: the backend validates the
  // *entire* resolved sequence on every single reorder call, so every
  // intermediate position short of first still 422s — the exact same
  // atomic-validation trap COMPLETE_NOT_LAST hit earlier. The fix there was
  // "never send a call that represents an invalid intermediate state"; here
  // that means moving it to the front in one reorder call carrying the
  // *entire* final order, not N one-hop swaps. Always operates on the
  // default (Major Programs Catalog) PROCESS sequence — MAJOR_PROGRAM_CHOICE
  // can only ever live there — regardless of which tab is currently open.
  const handleFixMajorProgramChoiceOrder = async () => {
    const defaultRows = resolveScope(
      allProcess,
      { kind: "default" },
      canEditDefault
    )
      .filter((row) => row.own && (row.step.enabled || row.step.required))
      .sort((a, b) => a.step.order - b.step.order)
    const mpcIndex = defaultRows.findIndex(
      (row) => resolveStageType(row.step) === "MAJOR_PROGRAM_CHOICE"
    )
    if (mpcIndex <= 0) return
    const [mpc] = defaultRows.splice(mpcIndex, 1)
    defaultRows.unshift(mpc)
    try {
      await reorderMutation.mutateAsync({
        group: "PROCESS",
        orderedIds: defaultRows.map((row) => row.step.id),
      })
      toast.success("Major Program Choice moved to the front")
      invalidateAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't fix the order")
    }
  }

  const handleCustomise = async (step: AdmissionStepDefinition) => {
    if (!scope || scope.kind === "default") return
    const target = describeScope(scope).name
    try {
      const copiedFields = await customiseMutation.mutateAsync({
        step,
        target: scope,
      })
      toast.success(
        copiedFields > 0
          ? `"${step.label}" customised for ${target}, with ${copiedFields} field(s) copied`
          : `"${step.label}" customised for ${target}`
      )
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't customise this step"
      )
    } finally {
      invalidateAll()
      queryClient.invalidateQueries({ queryKey: admissionFormFieldsKeys.all })
    }
  }

  const handleMoveClick = (step: AdmissionStepDefinition) => {
    setMovingStep(step)
    setMoveDestinationId(null)
  }

  const handleMoveConfirm = async () => {
    if (!movingStep || moveDestinationId === null) return
    const destination = majorPrograms.find((mp) => mp.id === moveDestinationId)
    if (!destination) return
    const step = movingStep
    try {
      const result = await moveMutation.mutateAsync({ step, destination })
      // A22 is confirmed shipped, so this should always match now — kept as
      // a defensive check (not a live workaround) rather than blindly
      // trusting a 200: a PATCH silently not applying one field would
      // otherwise look identical to a real "moved!" success.
      if (result.majorProgramId === destination.id) {
        toast.success(`"${step.label}" moved to ${destination.name}`)
      } else {
        toast.error(
          `The request succeeded, but "${step.label}" is still under its original major program — the backend didn't apply the move. Worth reporting.`
        )
      }
      setMovingStep(null)
      setMoveDestinationId(null)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't move this step"
      )
    } finally {
      invalidateAll()
      queryClient.invalidateQueries({ queryKey: admissionFormFieldsKeys.all })
    }
  }

  const handleImportFromCatalog = async (
    selected: AdmissionStepDefinition[]
  ) => {
    if (scope?.kind !== "majorProgram" || selected.length === 0) return
    const destination = scope.majorProgram
    const group = catalogModalGroup ?? "PROCESS"
    try {
      const imported = await adoptMutation.mutateAsync({
        catalogSteps: selected,
        destination,
        group,
      })
      toast.success(
        `${imported} step${imported === 1 ? "" : "s"} added to ${destination.name}`
      )
      setCatalogModalGroup(null)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't add these steps"
      )
    } finally {
      invalidateAll()
      queryClient.invalidateQueries({ queryKey: admissionFormFieldsKeys.all })
    }
  }

  const handleFormSubmit = async (
    values: StepFormValues,
    stage: StageDraft | null
  ) => {
    if (!formModal || !scope) return
    // `stepType` only drives the create-time key picker in StepFormModal —
    // it's never part of the step payload. Scope comes from the tab, and is
    // never sent on edit (the backend fixes it at creation).
    const { stepType, ...stepValues } = values
    try {
      if (formModal.editing) {
        await updateMutation.mutateAsync({
          id: formModal.editing.id,
          payload: {
            ...stepValues,
            // A stage's type is fixed at creation; its config stays editable.
            ...(stage ? { config: stage.config } : {}),
          },
        })
        toast.success("Step updated")
      } else if (stage?.type === "MAJOR_PROGRAM_CHOICE") {
        // Must land at order 1, ahead of every other default-scope step —
        // nothing may precede it (INVALID_STAGE_SEQUENCE:
        // MAJOR_PROGRAM_CHOICE_NOT_FIRST). Appending it like any other new
        // step (the bug this fixes) creates it out of position, and — same
        // atomic-validation trap as COMPLETE_NOT_LAST — it can't then be
        // walked to the front one reorder-hop at a time, since the backend
        // validates the *entire* resolved sequence on every single call and
        // every position short of first still fails. So: bump every
        // existing active default step's order by +1 first, one at a time,
        // highest order first (never ties, never invalid mid-way — no
        // MAJOR_PROGRAM_CHOICE exists yet during this phase, so that rule
        // can't fire), which frees order 1 with zero risk, then create it
        // there directly.
        const defaultRows = rowsFor("PROCESS")
          .filter((row) => row.step.enabled || row.step.required)
          .map((row) => row.step)
          .sort((a, b) => b.order - a.order)
        for (const step of defaultRows) {
          await updateMutation.mutateAsync({
            id: step.id,
            payload: { order: step.order + 1 },
          })
        }
        await createMutation.mutateAsync({
          ...stepValues,
          description: stepValues.description ?? "",
          group: "PROCESS",
          key: stepType,
          order: 1,
          ...scopePayload(scope),
          type: stage.type,
          config: stage.config,
        })
        toast.success("Step created")
      } else {
        const groupItems = rowsFor(formModal.group).map((row) => row.step)
        // A built-in type's key is exactly what its gating/screen logic
        // expects, chosen from the picker — no slugifying, no typo risk.
        // Only a genuinely custom type still derives its key from the label.
        const key =
          stepType === CUSTOM_STEP_TYPE
            ? slugifyKey(
                stepValues.label,
                groupItems.map((s) => s.key)
              )
            : stepType
        // A COMPLETE stage must stay last (the backend rejects
        // INVALID_STAGE_SEQUENCE: COMPLETE_NOT_LAST otherwise) — appending
        // every new step at the very end, unconditionally, broke that as
        // soon as a scope already had one. Bump COMPLETE out of the way
        // *first*, then create the new step in the vacated slot — creating
        // it first and bumping COMPLETE after (the initial fix) still sent
        // a create payload with the same order as COMPLETE, which the
        // backend's own atomic sequence check rejects as a tie before the
        // follow-up bump ever runs. Scopes without a COMPLETE stage yet
        // keep the plain append-at-end behavior.
        const completeRow = rowsFor(formModal.group).find(
          (row) => resolveStageType(row.step) === "COMPLETE"
        )
        let order = groupItems.reduce((max, s) => Math.max(max, s.order), 0) + 1
        if (completeRow) {
          order = completeRow.step.order
          const nextOrder = order + 1
          // COMPLETE might still be inherited from a broader scope in this
          // tab — pushing it forward then means customising it into this
          // scope (at the new position), not editing the shared default row
          // every other scope also inherits.
          if (completeRow.own) {
            await updateMutation.mutateAsync({
              id: completeRow.step.id,
              payload: { order: nextOrder },
            })
          } else {
            await customiseMutation.mutateAsync({
              step: completeRow.step,
              target: scope,
              order: nextOrder,
            })
          }
        }
        await createMutation.mutateAsync({
          ...stepValues,
          description: stepValues.description ?? "",
          group: formModal.group,
          key,
          order,
          ...scopePayload(scope),
          ...(stage ? { type: stage.type, config: stage.config } : {}),
        })
        toast.success("Step created")
      }
      invalidateAll()
      setFormModal(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save step")
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleting) return
    try {
      await removeMutation.mutateAsync(deleting.id)
      toast.success(`"${deleting.label}" deleted`)
      invalidateAll()
      setDeleting(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete step")
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <EmptyState
          icon={Sparkles}
          title="Couldn't load admission configuration"
          description="Something went wrong. Please try again."
        />
      </div>
    )
  }

  const previewSteps = previewProcess.data ?? []
  const previewFormCount = (previewForm.data ?? []).filter(
    (s) => s.key !== HIDDEN_FORM_KEY
  ).length
  const pendingCopies = pendingMove
    ? [pendingMove.moving, pendingMove.other]
        .filter((row) => !row.own)
        .map((row) => `"${row.step.label}"`)
    : []

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Admission Configuration
            </h1>
            <p className="text-sm text-muted-foreground">
              {view === "catalog" ? (
                <>
                  The <strong>catalog</strong> holds step templates only —
                  nothing here reaches an applicant. Manage the templates below,
                  then open <strong>Program Configurations</strong> to add
                  exactly what each major program needs.
                </>
              ) : (
                <>
                  Every major program is fully independent: its own steps, its
                  own order, its own form — nothing shared, nothing inherited.
                  Add steps with &quot;Add from Catalog,&quot; then order and
                  customise them however this program needs.
                </>
              )}
            </p>
          </div>
        </div>
        {view === "catalog" ? (
          <Button onClick={handleEnterProgramsView} className="shrink-0">
            Program Configurations
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={handleBackToCatalog}
            className="shrink-0"
          >
            ← Back to Catalog
          </Button>
        )}
      </motion.div>

      {/* Scope tabs — only shown in "Program Configurations", and only for
          Major Program, the sole scoping axis reachable from this page's own
          tabs: an admin picks one major program and configures its own
          process/form steps (and, via each FORM step's fields, its own form)
          for every applicant who chooses it at the Major Program Choice
          stage. Category tabs used to render here too, alongside Major
          Program tabs in the same row — since Major Program replaced
          Category as the scoping axis (see the file-level comment on
          step-scope.ts), that duplicated the same concept side by side and
          was removed here per product direction, reacting to a live
          screenshot of the confusion (2026-09-16): "only the major program
          should appear in that screen." Category's own resolution machinery
          is untouched — any pre-existing category-scoped step still resolves
          correctly wherever it's read (step-scope.ts's resolveScope /
          describeScope) — it's just not reachable from a tab on this page
          anymore. "Specific program" is gone the same way, for the same
          reason, predating this change. The catalog itself has no tab here
          anymore — it's its own view (see `view` state above), reached via
          "Back to Catalog". */}
      {view === "programs" && majorPrograms.length > 0 && (
        <Tabs value={tab} onValueChange={handleTabChange} className="mb-4">
          <div className="overflow-x-auto pb-1">
            <TabsList>
              {majorPrograms.map((mp) => (
                <TabsTrigger key={mp.id} value={majorProgramTabValue(mp.id)}>
                  {mp.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
      )}

      {scopeInfo && (
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {scopeInfo.description}
            {scope?.kind === "default" &&
              !canEditDefault &&
              " Only a super admin can change the default."}
          </p>
          {scope !== null && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 shrink-0 text-xs"
              onClick={() => setSequenceRulesOpen(true)}
            >
              <ShieldAlert className="size-3.5" data-icon="inline-start" />
              Sequence Rules
            </Button>
          )}
        </div>
      )}

      {/* The "backend doesn't recognize major-program scoping yet" advisory
          that used to live here is gone — BACKEND_DEVIATIONS A22 (both the
          `majorProgramId` column and its place in the create/update
          uniqueness constraint) is confirmed shipped 2026-09-15, per
          bruno/admission/Steps - Create.bru. Customise/create/move all work
          against the live backend now. */}

      {/* Live preview — only meaningful in Program Configurations; the
          catalog is never served to an applicant, so there's nothing to
          preview while looking at it. */}
      {view === "programs" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 rounded-2xl border border-primary/20 bg-primary/4 p-4"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ListChecks className="size-4 text-primary" />
              <p className="text-xs font-semibold tracking-wide text-primary uppercase">
                Live preview — what applicants see
              </p>
            </div>
            {selectedMajorProgram ? (
              <p className="text-xs text-muted-foreground">
                Previewing {selectedMajorProgram.name}
              </p>
            ) : (
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="preview-as"
                  className="text-xs text-muted-foreground"
                >
                  Preview as
                </Label>
                <Select
                  value={
                    previewProgramId !== null
                      ? String(previewProgramId)
                      : previewMajorProgramId !== null
                        ? majorProgramTabValue(previewMajorProgramId)
                        : NO_SELECTION
                  }
                  onValueChange={handlePreviewAsChange}
                >
                  <SelectTrigger id="preview-as" className="h-8 w-72 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SELECTION}>
                      Before a major program is chosen
                    </SelectItem>
                    {majorPrograms.map((mp) => (
                      <SelectItem
                        key={majorProgramTabValue(mp.id)}
                        value={majorProgramTabValue(mp.id)}
                      >
                        {mp.name} (before a program is chosen)
                      </SelectItem>
                    ))}
                    {previewOptions.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {previewProcess.isLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Loading preview…
            </div>
          ) : previewProcess.isError ? (
            <p className="text-xs text-destructive">
              Couldn&apos;t load the preview.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <AnimatePresence mode="popLayout">
                {previewSteps.map((step, idx) => (
                  <motion.div
                    key={step.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.25 }}
                    className="flex items-center gap-1.5 rounded-full border border-success/30 bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-xs"
                  >
                    <span className="flex size-4 items-center justify-center rounded-full bg-success text-[10px] text-success-foreground">
                      {idx + 1}
                    </span>
                    {step.label}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            {previewForm.isSuccess
              ? `${previewFormCount} application form step${previewFormCount === 1 ? "" : "s"} for this applicant.`
              : " "}
          </p>
        </motion.div>
      )}

      {stageIssues.length > 0 && (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4"
        >
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
            <AlertTriangle className="size-4" />
            Check the admission process for {scopeInfo?.name ?? "this scope"}
          </div>
          <ul className="list-disc space-y-1 pl-5 text-xs text-foreground">
            {stageIssues.map((issue) => (
              <li key={`${issue.code}-${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
          {stageIssues.some(
            (issue) =>
              issue.code === "MAJOR_PROGRAM_CHOICE_NOT_FIRST" ||
              issue.code === "PROGRAM_CHOICE_BEFORE_MAJOR_PROGRAM_CHOICE"
          ) && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3 h-7 text-xs"
              onClick={handleFixMajorProgramChoiceOrder}
              disabled={reorderMutation.isPending}
            >
              {reorderMutation.isPending && (
                <Loader2
                  className="size-3.5 animate-spin"
                  data-icon="inline-start"
                />
              )}
              Move Major Program Choice to the front
            </Button>
          )}
        </div>
      )}

      {/* Panels */}
      {scope === null && view === "programs" && majorPrograms.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No major programs yet"
          description="Create a major program in Academic Structure first, then come back here to add and configure its admission steps from the catalog."
          action={
            <Button variant="outline" onClick={handleBackToCatalog}>
              Back to Catalog
            </Button>
          }
        />
      ) : scope === null ? (
        <EmptyState
          icon={GraduationCap}
          title="Major program not found"
          description="This major program isn't in your scope, or hasn't loaded yet. Pick a tab above to see its steps and customise them for that major program only."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <StepConfigPanel
              title="Admission Process Steps"
              description="The end-to-end journey shown on the student's admission dashboard."
              icon={GraduationCap}
              rows={processRows}
              knownKeys={KNOWN_PROCESS_STEP_KEYS}
              showStageType
              originLabels={originLabels}
              reorderable={canEditScope}
              canAdd={canEditScope}
              onToggle={handleToggle}
              onEdit={(step) =>
                setFormModal({ group: "PROCESS", editing: step })
              }
              onDelete={setDeleting}
              onAdd={() => setFormModal({ group: "PROCESS", editing: null })}
              onReorder={(step, direction) =>
                handleReorder("PROCESS", step, direction)
              }
              onCustomise={handleCustomise}
              onMove={canMoveSteps ? handleMoveClick : undefined}
              onAddFromCatalog={
                scope?.kind === "majorProgram"
                  ? () => setCatalogModalGroup("PROCESS")
                  : undefined
              }
              disabled={isMutating}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <StepConfigPanel
              title="Application Form Steps"
              description="Steps inside the multi-step admission application form."
              icon={FileText}
              rows={formRows}
              knownKeys={KNOWN_FORM_STEP_KEYS}
              originLabels={originLabels}
              reorderable={canEditScope}
              canAdd={canEditScope}
              onToggle={handleToggle}
              onEdit={(step) => setFormModal({ group: "FORM", editing: step })}
              onDelete={setDeleting}
              onAdd={() => setFormModal({ group: "FORM", editing: null })}
              onReorder={(step, direction) =>
                handleReorder("FORM", step, direction)
              }
              onCustomise={handleCustomise}
              onMove={canMoveSteps ? handleMoveClick : undefined}
              onAddFromCatalog={
                scope?.kind === "majorProgram"
                  ? () => setCatalogModalGroup("FORM")
                  : undefined
              }
              onManageFields={setFieldsStep}
              disabled={isMutating}
            />
          </motion.div>
        </div>
      )}

      <StepFieldsModal step={fieldsStep} onClose={() => setFieldsStep(null)} />

      <SequenceRulesPanel
        open={sequenceRulesOpen}
        onClose={() => setSequenceRulesOpen(false)}
        majorProgramId={sequenceRulesMajorProgramId}
        scopeName={sequenceRulesScopeName}
      />

      <StepFormModal
        open={!!formModal}
        onClose={() => setFormModal(null)}
        groupLabel={
          formModal?.group === "PROCESS"
            ? "Admission Process"
            : "Application Form"
        }
        group={formModal?.group ?? "PROCESS"}
        existingKeys={rowsFor(formModal?.group ?? "PROCESS").map(
          (row) => row.step.key
        )}
        stageTypesInUse={stageTypesInUse}
        scopeName={
          scopeInfo
            ? scopeInfo.name.charAt(0).toUpperCase() + scopeInfo.name.slice(1)
            : ""
        }
        isDefaultScope={scope?.kind === "default"}
        editing={formModal?.editing ?? null}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <Modal
        open={!!pendingMove}
        onClose={() => setPendingMove(null)}
        title="Customise to reorder"
        subtitle={
          pendingMove
            ? `Move "${pendingMove.moving.step.label}" ${pendingMove.direction} in ${scopeInfo?.name ?? "this scope"}`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setPendingMove(null)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmMove}>Customise and move</Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          {pendingCopies.join(" and ")}{" "}
          {pendingCopies.length === 1 ? "is" : "are"} inherited, so moving here
          customises {pendingCopies.length === 1 ? "it" : "them"} for{" "}
          {scopeInfo?.name ?? "this scope"}. A customised step stops following
          later changes to the version it came from.
        </p>
      </Modal>

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete step"
        subtitle={
          deleting
            ? `Remove "${deleting.label}" from ${scopeInfo?.name ?? "this scope"}?`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setDeleting(null)}
              disabled={removeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending && (
                <Loader2
                  className="size-4 animate-spin"
                  data-icon="inline-start"
                />
              )}
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          This can&apos;t be undone.{" "}
          {scope?.kind === "default"
            ? "Applicants will no longer see this step, unless a category or program has its own version."
            : "If this step is inherited elsewhere, applicants here get the inherited version back."}
        </p>
      </Modal>

      <Modal
        open={!!movingStep}
        onClose={() => setMovingStep(null)}
        title="Move to another major program"
        subtitle={
          movingStep
            ? `Move "${movingStep.label}" out of ${scopeInfo?.name ?? "this major program"}`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setMovingStep(null)}
              disabled={moveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMoveConfirm}
              disabled={moveMutation.isPending || moveDestinationId === null}
            >
              {moveMutation.isPending && (
                <Loader2
                  className="size-4 animate-spin"
                  data-icon="inline-start"
                />
              )}
              Move
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="move-destination">Move to</Label>
            <Select
              value={
                moveDestinationId === null ? "" : String(moveDestinationId)
              }
              onValueChange={(value) => setMoveDestinationId(Number(value))}
            >
              <SelectTrigger id="move-destination" className="w-full">
                <SelectValue placeholder="Choose a major program" />
              </SelectTrigger>
              <SelectContent>
                {majorPrograms
                  .filter((mp) => mp.id !== selectedMajorProgram?.id)
                  .map((mp) => (
                    <SelectItem key={mp.id} value={String(mp.id)}>
                      {mp.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Its key, form fields, and settings move with it. Blocked if the
            destination already has its own step with the same key, or (for a
            singleton stage type) one already active there.
          </p>
        </div>
      </Modal>

      <AddFromCatalogDialog
        open={catalogModalGroup !== null}
        onClose={() => setCatalogModalGroup(null)}
        group={catalogModalGroup ?? "PROCESS"}
        groupLabel={
          catalogModalGroup === "FORM"
            ? "Application Form"
            : "Admission Process"
        }
        destinationName={
          scope?.kind === "majorProgram" ? scope.majorProgram.name : ""
        }
        catalogSteps={catalogOptions[catalogModalGroup ?? "PROCESS"]}
        onImport={handleImportFromCatalog}
        isImporting={adoptMutation.isPending}
      />
    </div>
  )
}
