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
import { resolveStageType } from "@/lib/admission-catalog"
import type {
  AdmissionStepDefinition,
  AdmissionStepGroup,
  StageType,
} from "@/types/admissionConfig"
import type { ProgramCategory } from "@/types/school"
import StepConfigPanel from "./components/StepConfigPanel"
import StepFormModal, {
  CUSTOM_STEP_TYPE,
  type StepFormValues,
} from "./components/StepFormModal"
import StepFieldsModal from "./components/StepFieldsModal"
import { validateStageSequence } from "./components/stage-sequence"
import type { StageDraft } from "./components/stage-draft"
import {
  CATEGORY_LABELS,
  categoriesInUse,
  describeScope,
  resolveScope,
  scopePayload,
  type ScopedStepRow,
  type StepOrigin,
  type StepScope,
} from "./components/step-scope"

const DEFAULT_TAB = "default"
const PROGRAM_TAB = "program"
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
      })
      if (step.group !== "FORM") return 0
      const listed = await admissionFormFieldsApi.list(step.id)
      // Child fields may come nested or flat. Copy parents first so each
      // child can point at its parent's new id.
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
        const copy = await admissionFormFieldsApi.create(created.id, {
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
    },
  })

  const [tab, setTab] = useState<string>(DEFAULT_TAB)
  const [programId, setProgramId] = useState<number | null>(null)
  const [majorProgramId, setMajorProgramId] = useState<number | null>(null)
  const [previewProgramId, setPreviewProgramId] = useState<number | null>(null)
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

  const previewProcess = useQuery(
    admissionStepsQueryOptions.effective("PROCESS", previewProgramId)
  )
  const previewForm = useQuery(
    admissionStepsQueryOptions.effective("FORM", previewProgramId)
  )

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
  const categories = categoriesInUse(programs, [...allProcess, ...allForm])

  const selectedProgram = programs.find((p) => p.id === programId) ?? null
  const scope: StepScope | null =
    tab === DEFAULT_TAB
      ? { kind: "default" }
      : tab === PROGRAM_TAB
        ? selectedProgram
          ? { kind: "program", program: selectedProgram }
          : null
        : { kind: "category", category: tab as ProgramCategory }
  const scopeInfo = scope ? describeScope(scope) : null
  const scopeCategory =
    scope?.kind === "category"
      ? scope.category
      : scope?.kind === "program"
        ? scope.program.programCategory
        : null
  const originLabels: Record<StepOrigin, string> = {
    default: "All programs",
    category: scopeCategory ? CATEGORY_LABELS[scopeCategory] : "Category",
    program: selectedProgram?.name ?? "Program",
  }

  const processRows = scope
    ? resolveScope(allProcess, scope, canEditDefault)
    : []
  const formRows = scope ? resolveScope(allForm, scope, canEditDefault) : []
  const canEditScope =
    scope !== null && (scope.kind !== "default" || canEditDefault)
  const rowsFor = (group: AdmissionStepGroup) =>
    group === "PROCESS" ? processRows : formRows
  const stageIssues = scope ? validateStageSequence(processRows) : []
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

  const pickerPrograms =
    majorProgramId === null
      ? programs
      : programs.filter((p) => p.majorProgramId === majorProgramId)
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

  const handleTabChange = (value: string) => {
    setTab(value)
    if (value === DEFAULT_TAB) setPreviewProgramId(null)
    else if (value === PROGRAM_TAB) setPreviewProgramId(programId)
    else
      setPreviewProgramId(
        programs.find((p) => p.programCategory === value)?.id ?? null
      )
  }

  const handleMajorProgramChange = (value: string) => {
    const next = value === NO_SELECTION ? null : Number(value)
    setMajorProgramId(next)
    if (next !== null && selectedProgram?.majorProgramId !== next) {
      setProgramId(null)
      setPreviewProgramId(null)
    }
  }

  const handleProgramChange = (value: string) => {
    const next = value === NO_SELECTION ? null : Number(value)
    setProgramId(next)
    setPreviewProgramId(next)
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
        const order =
          groupItems.reduce((max, s) => Math.max(max, s.order), 0) + 1
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
        className="mb-6 flex items-center gap-3"
      >
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10">
          <Sparkles className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Admission Configuration
          </h1>
          <p className="text-sm text-muted-foreground">
            Set up the admission process and application form for every program,
            then customise them per program category or for a single program.
          </p>
        </div>
      </motion.div>

      {/* Scope tabs */}
      <Tabs value={tab} onValueChange={handleTabChange} className="mb-4">
        <div className="overflow-x-auto pb-1">
          <TabsList>
            <TabsTrigger value={DEFAULT_TAB}>All programs</TabsTrigger>
            {categories.map((category) => (
              <TabsTrigger key={category} value={category}>
                {CATEGORY_LABELS[category]}
              </TabsTrigger>
            ))}
            <TabsTrigger value={PROGRAM_TAB}>Specific program</TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      {tab === PROGRAM_TAB && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="scope-major-program">Major program</Label>
            <Select
              value={
                majorProgramId === null ? NO_SELECTION : String(majorProgramId)
              }
              onValueChange={handleMajorProgramChange}
            >
              <SelectTrigger id="scope-major-program" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SELECTION}>All major programs</SelectItem>
                {majorPrograms.map((mp) => (
                  <SelectItem key={mp.id} value={String(mp.id)}>
                    {mp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="scope-program">Program</Label>
            <Select
              value={programId === null ? NO_SELECTION : String(programId)}
              onValueChange={handleProgramChange}
            >
              <SelectTrigger id="scope-program" className="w-full">
                <SelectValue placeholder="Choose a program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SELECTION}>Choose a program</SelectItem>
                {pickerPrograms.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name} ({p.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {scopeInfo && (
        <p className="mb-6 text-sm text-muted-foreground">
          {scopeInfo.description}
          {scope?.kind === "default" &&
            !canEditDefault &&
            " Only a super admin can change the default."}
        </p>
      )}

      {/* Live preview */}
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
          {tab === PROGRAM_TAB ? (
            selectedProgram && (
              <p className="text-xs text-muted-foreground">
                Previewing {selectedProgram.name}
              </p>
            )
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
                  previewProgramId === null
                    ? NO_SELECTION
                    : String(previewProgramId)
                }
                onValueChange={(value) =>
                  setPreviewProgramId(
                    value === NO_SELECTION ? null : Number(value)
                  )
                }
              >
                <SelectTrigger id="preview-as" className="h-8 w-60 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SELECTION}>
                    Before a program is chosen
                  </SelectItem>
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
        </div>
      )}

      {/* Panels */}
      {scope === null ? (
        <EmptyState
          icon={GraduationCap}
          title="Choose a program"
          description="Pick a program above to see its steps and customise them for that program only."
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
              onManageFields={setFieldsStep}
              disabled={isMutating}
            />
          </motion.div>
        </div>
      )}

      <StepFieldsModal step={fieldsStep} onClose={() => setFieldsStep(null)} />

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
    </div>
  )
}
