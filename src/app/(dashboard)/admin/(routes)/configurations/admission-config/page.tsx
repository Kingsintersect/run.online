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
} from "lucide-react"
import { toast } from "sonner"
import EmptyState from "@/components/custom/EmptyState"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import {
  admissionStepsKeys,
  admissionStepsQueryOptions,
  admissionStepsMutationOptions,
} from "@/services/admissionStepsApi"
import {
  KNOWN_PROCESS_STEP_KEYS,
  KNOWN_FORM_STEP_KEYS,
} from "@/lib/admissionConfig"
import type {
  AdmissionStepDefinition,
  AdmissionStepGroup,
} from "@/types/admissionConfig"
import StepConfigPanel from "./components/StepConfigPanel"
import StepFormModal, {
  CUSTOM_STEP_TYPE,
  NONE_SENTINEL,
  type StepFormValues,
} from "./components/StepFormModal"
import StepFieldsModal from "./components/StepFieldsModal"
import type { ProgramCategory } from "@/types/school"

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

  const createMutation = useMutation(admissionStepsMutationOptions.create())
  const updateMutation = useMutation(admissionStepsMutationOptions.update())
  const removeMutation = useMutation(admissionStepsMutationOptions.remove())
  const reorderMutation = useMutation(admissionStepsMutationOptions.reorder())

  const [formModal, setFormModal] = useState<{
    group: AdmissionStepGroup
    editing: AdmissionStepDefinition | null
  } | null>(null)
  const [deleting, setDeleting] = useState<AdmissionStepDefinition | null>(null)
  const [fieldsStep, setFieldsStep] = useState<AdmissionStepDefinition | null>(
    null
  )

  const isLoading = processQuery.isLoading || formQuery.isLoading
  const isError = processQuery.isError || formQuery.isError
  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    removeMutation.isPending ||
    reorderMutation.isPending

  const processSteps = processQuery.data ?? []
  // PROGRAM_SELECTION is superseded by the "Choice Program" PROCESS step
  // (program/entry-mode/study-mode choice now happens before the application
  // fee, not inside the form — see getActiveFormSteps in
  // admission-application-form/types/form-types.ts) and is never rendered in
  // the live form anymore, so it's hidden here too rather than left as a
  // toggle that does nothing.
  const formSteps = (formQuery.data ?? []).filter(
    (s) => s.key !== "PROGRAM_SELECTION"
  )

  const invalidateAll = () =>
    queryClient.invalidateQueries({ queryKey: admissionStepsKeys.all })

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

  const handleReorder = async (
    group: AdmissionStepGroup,
    step: AdmissionStepDefinition,
    direction: "up" | "down"
  ) => {
    const items = group === "PROCESS" ? processSteps : formSteps
    const idx = items.findIndex((s) => s.id === step.id)
    const swapWith = direction === "up" ? idx - 1 : idx + 1
    if (swapWith < 0 || swapWith >= items.length) return

    const orderedIds = items.map((s) => s.id)
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

  const handleFormSubmit = async (values: StepFormValues) => {
    if (!formModal) return
    // `stepType` only exists to drive the create-time key picker in
    // StepFormModal — it's never part of the actual step payload sent to
    // the backend (editing never touches key at all). programCategory/
    // programId arrive as NONE_SENTINEL-or-value strings from the form's
    // <Select>s — convert back to null/number for the API payload.
    const { stepType, programCategory, programId, ...rest } = values
    const stepValues = {
      ...rest,
      programCategory:
        programCategory === NONE_SENTINEL
          ? null
          : (programCategory as ProgramCategory),
      programId: programId === NONE_SENTINEL ? null : Number(programId),
    }
    try {
      if (formModal.editing) {
        await updateMutation.mutateAsync({
          id: formModal.editing.id,
          payload: stepValues,
        })
        toast.success("Step updated")
      } else {
        const groupItems =
          (formModal.group === "PROCESS"
            ? processQuery.data
            : formQuery.data) ?? []
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

  const enabledProcess = processSteps.filter((s) => s.enabled || s.required)
  const enabledForm = formSteps.filter((s) => s.enabled || s.required)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-center gap-3"
      >
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10">
          <Sparkles className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Admission Configuration
          </h1>
          <p className="text-sm text-muted-foreground">
            Create, edit, reorder, and toggle the admission process stages and
            application form steps every applicant sees.
          </p>
        </div>
      </motion.div>

      {/* Live preview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8 rounded-2xl border border-primary/20 bg-primary/4 p-4"
      >
        <div className="mb-3 flex items-center gap-2">
          <ListChecks className="size-4 text-primary" />
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">
            Live preview — what applicants will see
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AnimatePresence mode="popLayout">
            {enabledProcess.map((step, idx) => (
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
        <p className="mt-3 text-xs text-muted-foreground">
          {enabledForm.length} of {formSteps.length} application form steps
          enabled.
        </p>
      </motion.div>

      {/* Panels */}
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
            items={processSteps}
            knownKeys={KNOWN_PROCESS_STEP_KEYS}
            reorderable
            onToggle={handleToggle}
            onEdit={(step) => setFormModal({ group: "PROCESS", editing: step })}
            onDelete={setDeleting}
            onAdd={() => setFormModal({ group: "PROCESS", editing: null })}
            onReorder={(step, direction) =>
              handleReorder("PROCESS", step, direction)
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
            description="Steps inside the multi-step admission application form. Reorderable."
            icon={FileText}
            items={formSteps}
            knownKeys={KNOWN_FORM_STEP_KEYS}
            reorderable
            onToggle={handleToggle}
            onEdit={(step) => setFormModal({ group: "FORM", editing: step })}
            onDelete={setDeleting}
            onAdd={() => setFormModal({ group: "FORM", editing: null })}
            onReorder={(step, direction) =>
              handleReorder("FORM", step, direction)
            }
            onManageFields={setFieldsStep}
            disabled={isMutating}
          />
        </motion.div>
      </div>

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
        existingKeys={(
          (formModal?.group === "PROCESS"
            ? processQuery.data
            : formQuery.data) ?? []
        ).map((s) => s.key)}
        editing={formModal?.editing ?? null}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete step"
        subtitle={
          deleting
            ? `Remove "${deleting.label}" from this deployment?`
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
          This can&apos;t be undone. Applicants will no longer see this step.
        </p>
      </Modal>
    </div>
  )
}
