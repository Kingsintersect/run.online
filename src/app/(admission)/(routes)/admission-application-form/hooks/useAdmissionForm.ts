"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useForm, type UseFormReturn } from "react-hook-form"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { formStorage } from "@/lib/storage"
import { useUploadProgress } from "@/hooks/use-upload-progress"
import type { UploadStage } from "@/lib/uploads"
import { useAppStore, useAppHydrated } from "@/store/appStore"
import { admissionStepsQueryOptions } from "@/services/admissionStepsApi"
import { useAcademicSessions } from "@/hooks/useAcademicSessions"
import { useAllPrograms } from "@/hooks/useCourseStructure"
import { resolveActiveSession } from "@/lib/academic/resolve-active-session"
import {
  admissionKeys,
  admissionQueryOptions,
} from "../../../services/admissionService"
import {
  fetchMyProfile,
  submitApplication,
  toSubmitError,
  type SubmitError,
} from "../services/application-submit.service"
import {
  personalInfoSchema,
  sponsorInfoSchema,
  nextOfKinSchema,
  documentsSchema,
  qualificationFieldsSchema,
  examSittingSchema,
  qualificationDocumentsSchema,
  programSelectionSchema,
  odlProgramSchema,
} from "../schema/admission-schema"
import {
  FormStep,
  FORM_STEP_KEYS,
  FORM_STORAGE_KEY,
  STEP_STORAGE_KEY,
  DEFAULT_FORM_VALUES,
  STEP_FIELDS,
  backendFieldToFormField,
  getFieldLabel,
  getStepForField,
  type FormDefaultValues,
} from "../types/form-types"
import {
  buildDynamicPayload,
  buildFieldIndex,
  buildWizardSteps,
  fieldPath,
  formValueKeyFor,
  makeLookup,
  migrateSavedStepId,
  stepFields,
  validateStepFields,
  type FieldIndexEntry,
  type StepIssue,
  type WizardStep,
} from "../lib/dynamic-form"

// ─── Per-step schema resolver map (hand-built steps) ─────────────────────────
const STEP_SCHEMAS = {
  [FormStep.PERSONAL_INFO]: personalInfoSchema,
  [FormStep.SPONSOR_INFO]: sponsorInfoSchema,
  [FormStep.NEXT_OF_KIN]: nextOfKinSchema,
  [FormStep.DOCUMENTS]: documentsSchema,
  [FormStep.QUALIFICATION_FIELDS]: qualificationFieldsSchema,
  [FormStep.EXAM_SITTING]: examSittingSchema,
  [FormStep.QUALIFICATION_DOCUMENTS]: qualificationDocumentsSchema,
  [FormStep.PROGRAM_SELECTION]: programSelectionSchema,
} as const

const BUILT_IN_STEP_IDS = new Set<string>(Object.values(FORM_STEP_KEYS))

export interface UseAdmissionFormReturn {
  form: UseFormReturn<FormDefaultValues>
  /** The wizard's steps, in order — built from the admission step registry. */
  steps: WizardStep[]
  currentStep: WizardStep
  totalSteps: number
  completedSteps: Set<string>
  /** Every dynamic field across the form, by key. */
  fieldIndex: Map<string, FieldIndexEntry>
  isLoading: boolean
  isSubmitting: boolean
  isSubmitted: boolean
  /** Stage of the in-flight submission, for driving <UploadProgress />. */
  submitStage: UploadStage
  /** Percentage of the multipart body uploaded so far, 0-100. */
  submitPercent: number
  /** True once the user has clicked "Submit Application" at least once — gates the error summary. */
  submitAttempted: boolean
  /**
   * The most recent backend rejection of a submit attempt (validation 422,
   * 409, 500, network …), or null. Cleared at the start of every new attempt
   * and on form reset. Rendered above the footer alongside client-side errors.
   */
  submitError: SubmitError | null
  goToStep: (stepId: string) => void
  nextStep: () => Promise<boolean>
  prevStep: () => void
  submitForm: () => Promise<void>
  saveProgress: () => Promise<void>
  resetForm: () => Promise<void>
  clearStep: (stepId: string) => Promise<void>
  /** Label and owning step for an error path (client form path or backend error key). */
  describeErrorPath: (path: string) => { label: string; stepId?: string }
  direction: 1 | -1
}

export function useAdmissionForm(): UseAdmissionFormReturn {
  const [currentStepId, setCurrentStepId] = useState("")
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const queryClient = useQueryClient()
  const submitProgress = useUploadProgress()
  // Destructured because the hook's returned object changes identity on every
  // progress tick, while these five callbacks are stable — depending on them
  // individually keeps submitForm from being rebuilt ~100x during an upload.
  const {
    start: startSubmitProgress,
    handleProgress: handleSubmitProgress,
    succeed: succeedSubmitProgress,
    fail: failSubmitProgress,
    reset: resetSubmitProgress,
  } = submitProgress
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [submitError, setSubmitError] = useState<SubmitError | null>(null)
  const [direction, setDirection] = useState<1 | -1>(1)
  const hasLoadedRef = useRef(false)
  const skipNextAutoSaveRef = useRef(true)

  // ─── Per-user storage keys ────────────────────────────────────────────────
  // Every key is suffixed with the logged-in user's id so each account's
  // draft stays isolated on a shared browser.
  const isAppHydrated = useAppHydrated()
  const userId = useAppStore((s) => s.user?.id)
  const formStorageKey = userId ? `${FORM_STORAGE_KEY}_${userId}` : null
  const stepStorageKey = userId ? `${STEP_STORAGE_KEY}_${userId}` : null
  const stepCompletedStorageKey = stepStorageKey
    ? `${stepStorageKey}_completed`
    : null

  // ─── Admin-configured steps ─────────────────────────────────────────────
  const { data: admissionConfig } = useQuery(
    admissionStepsQueryOptions.config()
  )
  const { data: sessions } = useAcademicSessions()
  // If the applicant already made a real pre-application program choice (the
  // "Choice Program" process stage), PROGRAM_SELECTION drops out of the
  // steps and its values are pre-filled instead of asked again.
  const { data: admissionStudent } = useQuery(admissionQueryOptions.student())
  const { data: allProgramsData } = useAllPrograms()
  const selectedMajorProgramId = admissionStudent?.program_id
    ? (allProgramsData?.data ?? []).find(
        (p) => p.id === admissionStudent.program_id
      )?.majorProgramId
    : undefined
  const activeSessionId = useMemo(
    () => resolveActiveSession(sessions, selectedMajorProgramId)?.id ?? null,
    [sessions, selectedMajorProgramId]
  )

  // The applicant's program's resolved FORM steps, with their field
  // definitions (sandbox/dynamic-admission/API_CONTRACTS.md §3.3). Before a
  // program is chosen this resolves the institution defaults.
  const { data: effectiveFormSteps } = useQuery({
    ...admissionStepsQueryOptions.effective(
      "FORM",
      admissionStudent?.program_id ?? null
    ),
    retry: false,
  })

  const steps = useMemo(
    () =>
      buildWizardSteps({
        configSteps: admissionConfig?.formSteps ?? [],
        effectiveSteps: effectiveFormSteps,
        programAlreadyChosen: !!admissionStudent?.has_selected_program,
      }),
    [
      admissionConfig,
      effectiveFormSteps,
      admissionStudent?.has_selected_program,
    ]
  )
  const fieldIndex = useMemo(() => buildFieldIndex(steps), [steps])
  const currentStep = steps.find((s) => s.id === currentStepId) ?? steps[0]
  const totalSteps = steps.length

  // A step that's no longer active (admin changed the form, or the saved
  // draft predates it) — continue at the first step not yet completed.
  useEffect(() => {
    if (isLoading || steps.some((s) => s.id === currentStepId)) return
    const fallback =
      steps.find((s) => !completedSteps.has(s.id)) ?? steps[steps.length - 1]
    if (fallback) setCurrentStepId(fallback.id)
  }, [steps, currentStepId, isLoading, completedSteps])

  const form = useForm<FormDefaultValues>({
    defaultValues: DEFAULT_FORM_VALUES,
    mode: "onTouched",
  })

  // ─── Load persisted data on mount ────────────────────────────────────────
  useEffect(() => {
    if (!isAppHydrated || hasLoadedRef.current) return
    hasLoadedRef.current = true

    const loadSavedData = async () => {
      try {
        // One-time cleanup of the pre-fix shared (unscoped) bucket.
        formStorage.clearFormData(FORM_STORAGE_KEY).catch(() => {})
        localStorage.removeItem(STEP_STORAGE_KEY)
        localStorage.removeItem(`${STEP_STORAGE_KEY}_completed`)

        if (!formStorageKey || !stepStorageKey || !stepCompletedStorageKey)
          return

        const savedData = await formStorage.loadFormData(formStorageKey)
        if (savedData) {
          // saveProgress() stores `null` in place of `undefined` (IndexedDB
          // can't hold `undefined`). Drop those keys so DEFAULT_FORM_VALUES
          // supplies the real default. `customFields` belonged to the retired
          // "Additional Information" step; its questions now live on their
          // own steps under `answers`.
          const restored: Record<string, unknown> = {}
          for (const [key, value] of Object.entries(savedData)) {
            if (value !== null && key !== "customFields") restored[key] = value
          }
          form.reset({
            ...DEFAULT_FORM_VALUES,
            ...restored,
          } as FormDefaultValues)
          toast.success("Your previous progress has been restored.")
        }

        // Older drafts saved the step as a FormStep number; newer ones use the step key.
        const savedStep = localStorage.getItem(stepStorageKey)
        if (savedStep) setCurrentStepId(migrateSavedStepId(savedStep))

        const savedCompleted = localStorage.getItem(stepCompletedStorageKey)
        if (savedCompleted) {
          const parsed = JSON.parse(savedCompleted) as (number | string)[]
          setCompletedSteps(
            new Set(parsed.map((s) => migrateSavedStepId(String(s))))
          )
        }
      } catch (error) {
        console.error("Failed to load saved form data:", error)
      } finally {
        setIsLoading(false)
        skipNextAutoSaveRef.current = true
      }
    }

    loadSavedData()
  }, [
    form,
    isAppHydrated,
    formStorageKey,
    stepStorageKey,
    stepCompletedStorageKey,
  ])

  // ─── TEMPORARY: enforce the Program Selection placeholder default ───────
  // Remove alongside the other TEMPORARY markers once Choice Program is live.
  useEffect(() => {
    if (isLoading) return
    if (!form.getValues("programId")) {
      form.setValue("programId", DEFAULT_FORM_VALUES.programId)
      form.clearErrors("programId")
    }
    if (!form.getValues("entryMode")) {
      form.setValue("entryMode", DEFAULT_FORM_VALUES.entryMode)
      form.clearErrors("entryMode")
    }
  }, [isLoading, form])

  // ─── Pre-fill program choice from the earlier "Choice Program" stage ─────
  useEffect(() => {
    if (isLoading || !admissionStudent?.has_selected_program) return
    if (!admissionStudent.program_id || !admissionStudent.entry_mode) return

    form.setValue("programId", admissionStudent.program_id)
    form.setValue("entryMode", admissionStudent.entry_mode)
    form.setValue("studyMode", admissionStudent.study_mode ?? "online")
    form.setValue(
      "startTerm",
      admissionStudent.start_term ?? DEFAULT_FORM_VALUES.startTerm
    )
  }, [admissionStudent, isLoading, form])

  // ─── Save progress to IndexedDB ─────────────────────────────────────────
  const saveProgress = useCallback(async () => {
    if (typeof window === "undefined") return
    if (!formStorageKey || !stepStorageKey || !stepCompletedStorageKey) return

    try {
      const values = form.getValues()
      const sanitized: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(values)) {
        sanitized[key] = value === undefined ? null : value
      }

      await formStorage.saveFormData(formStorageKey, sanitized)
      if (currentStep) localStorage.setItem(stepStorageKey, currentStep.id)
      localStorage.setItem(
        stepCompletedStorageKey,
        JSON.stringify([...completedSteps])
      )
    } catch (error) {
      console.warn("Failed to save progress:", error)
    }
  }, [
    form,
    currentStep,
    completedSteps,
    formStorageKey,
    stepStorageKey,
    stepCompletedStorageKey,
  ])

  // ─── Auto-save on step change ────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false
      return
    }
    saveProgress()
  }, [currentStepId, isLoading, saveProgress])

  // ─── Validation ──────────────────────────────────────────────────────────
  const validateStep = useCallback(
    async (step: WizardStep): Promise<StepIssue[]> => {
      if (step.kind === "review") return []
      const values = form.getValues()
      const issues: StepIssue[] = []

      if (step.kind === "builtin") {
        // Exam result documents aren't asked while results are awaited.
        const skip =
          step.formStep === FormStep.QUALIFICATION_DOCUMENTS &&
          values.awaiting_result
        const schema = STEP_SCHEMAS[step.formStep as keyof typeof STEP_SCHEMAS]
        if (schema && !skip) {
          const stepValues: Record<string, unknown> = {}
          STEP_FIELDS[step.formStep].forEach((field) => {
            stepValues[field] = values[field as keyof FormDefaultValues]
          })
          const result = await schema.safeParseAsync(stepValues)
          if (!result.success) {
            for (const issue of result.error.issues) {
              const path = issue.path.map(String).join(".")
              issues.push({
                path,
                label: getFieldLabel(String(issue.path[0] ?? path)),
                message: issue.message,
              })
            }
          }
        }
      }

      issues.push(
        ...validateStepFields(
          step.id,
          stepFields(step),
          values,
          makeLookup(values, fieldIndex)
        )
      )
      return issues
    },
    [form, fieldIndex]
  )

  const applyIssues = useCallback(
    (step: WizardStep, issues: StepIssue[]) => {
      const paths = [
        ...(step.kind === "builtin" ? STEP_FIELDS[step.formStep] : []),
        ...stepFields(step).map((f) => fieldPath(step.id, f)),
      ]
      form.clearErrors(paths as never)
      for (const issue of issues) {
        form.setError(issue.path as never, { message: issue.message })
      }
    },
    [form]
  )

  const toastFirstIssue = (issues: StepIssue[]) => {
    const [first] = issues
    const extra =
      issues.length > 1
        ? ` (+${issues.length - 1} more issue${issues.length > 2 ? "s" : ""})`
        : ""
    toast.error(
      first
        ? `${first.label}: ${first.message}${extra}`
        : "Please review the highlighted fields before proceeding."
    )
  }

  // ─── Navigation ───────────────────────────────────────────────────────────
  const nextStep = useCallback(async (): Promise<boolean> => {
    if (!currentStep) return false
    const issues = await validateStep(currentStep)
    applyIssues(currentStep, issues)
    if (issues.length > 0) {
      toastFirstIssue(issues)
      return false
    }

    setCompletedSteps((prev) => new Set([...prev, currentStep.id]))
    setDirection(1)
    const idx = steps.findIndex((s) => s.id === currentStep.id)
    if (idx !== -1 && idx < steps.length - 1)
      setCurrentStepId(steps[idx + 1].id)

    await saveProgress()
    return true
  }, [currentStep, steps, validateStep, applyIssues, saveProgress])

  const prevStep = useCallback(() => {
    if (!currentStep) return
    const idx = steps.findIndex((s) => s.id === currentStep.id)
    if (idx > 0) {
      setDirection(-1)
      setCurrentStepId(steps[idx - 1].id)
    }
  }, [currentStep, steps])

  const goToStep = useCallback(
    (stepId: string) => {
      if (!currentStep) return
      const targetIdx = steps.findIndex((s) => s.id === stepId)
      if (targetIdx === -1) return
      const currentIdx = steps.findIndex((s) => s.id === currentStep.id)
      // Only completed steps, earlier steps, or the next one.
      if (
        targetIdx <= currentIdx ||
        completedSteps.has(stepId) ||
        targetIdx === currentIdx + 1
      ) {
        setDirection(targetIdx > currentIdx ? 1 : -1)
        setCurrentStepId(stepId)
      }
    },
    [currentStep, steps, completedSteps]
  )

  // ─── Error descriptions (submit summary) ─────────────────────────────────
  const describeErrorPath = useCallback(
    (path: string): { label: string; stepId?: string } => {
      const segments = path.split(".")
      const findField = (stepId: string, key: string) => {
        const step = steps.find((s) => s.id === stepId)
        return step ? stepFields(step).find((f) => f.key === key) : undefined
      }

      // Client path for a dynamic answer: answers.STEP.field
      if (segments[0] === "answers" && segments.length >= 3) {
        const field = findField(segments[1], segments[2])
        return {
          label: field?.label ?? getFieldLabel(segments[2]),
          stepId: steps.some((s) => s.id === segments[1])
            ? segments[1]
            : undefined,
        }
      }

      // New backend contract: STEP_KEY.field_key
      if (segments.length >= 2 && steps.some((s) => s.id === segments[0])) {
        const field = findField(segments[0], segments[1])
        if (field) return { label: field.label, stepId: segments[0] }
      }

      // Legacy/system field, e.g. "passport" or "other_documents.0"
      const formField = backendFieldToFormField(path)
      for (const step of steps) {
        const bound = stepFields(step).find(
          (f) => formValueKeyFor(f) === formField
        )
        if (bound) return { label: bound.label, stepId: step.id }
      }
      const legacyStep = getStepForField(formField)
      const legacyId =
        legacyStep !== undefined ? FORM_STEP_KEYS[legacyStep] : undefined
      return {
        label: getFieldLabel(formField),
        stepId:
          legacyId && steps.some((s) => s.id === legacyId)
            ? legacyId
            : undefined,
      }
    },
    [steps]
  )

  // ─── Submit full form ────────────────────────────────────────────────────
  const submitForm = useCallback(async () => {
    setIsSubmitting(true)
    setSubmitAttempted(true)
    setSubmitError(null)
    startSubmitProgress()
    try {
      const values = form.getValues()
      const lookup = makeLookup(values, fieldIndex)
      const issues: StepIssue[] = []

      const hasDynamicBuiltIns = steps.some(
        (s) => s.kind === "dynamic" && BUILT_IN_STEP_IDS.has(s.id)
      )
      if (!hasDynamicBuiltIns) {
        // Today's whole-form rules (they cross steps), plus any dynamic questions.
        const result = await odlProgramSchema.safeParseAsync(values)
        if (!result.success) {
          for (const issue of result.error.issues) {
            const path = issue.path.map(String).join(".")
            issues.push({
              path,
              label: getFieldLabel(String(issue.path[0] ?? path)),
              message: issue.message,
            })
          }
        }
        for (const step of steps) {
          issues.push(
            ...validateStepFields(step.id, stepFields(step), values, lookup)
          )
        }
      } else {
        // Standard steps come from field definitions, so their conditions
        // carry the cross-step rules.
        for (const step of steps) issues.push(...(await validateStep(step)))
        if (!values.agreeToTerms) {
          issues.push({
            path: "agreeToTerms",
            label: getFieldLabel("agreeToTerms"),
            message: "You must agree to terms and conditions",
          })
        }
      }

      if (issues.length > 0) {
        console.warn(
          "Submission validation errors:",
          issues.map((i) => `${i.path}: ${i.message}`)
        )
        for (const issue of issues) {
          form.setError(issue.path as never, { message: issue.message })
        }
        toast.error("Please review and fix all errors before submitting.")
        resetSubmitProgress()
        return
      }

      if (!activeSessionId) {
        toast.error(
          "No active academic session found. Please contact admissions."
        )
        resetSubmitProgress()
        return
      }

      const profile = await fetchMyProfile()
      await submitApplication(
        values,
        profile,
        activeSessionId,
        handleSubmitProgress,
        buildDynamicPayload(steps, values, lookup)
      )
      succeedSubmitProgress()

      // The student query has a 60s staleTime — refresh it so the redirect
      // doesn't render the pre-submit snapshot.
      await queryClient.invalidateQueries({ queryKey: admissionKeys.student() })

      if (formStorageKey) await formStorage.clearFormData(formStorageKey)
      if (stepStorageKey) localStorage.removeItem(stepStorageKey)
      if (stepCompletedStorageKey)
        localStorage.removeItem(stepCompletedStorageKey)
      setIsSubmitted(true)
    } catch (error) {
      console.error("Submission failed:", error)
      failSubmitProgress()
      const parsed = toSubmitError(error)
      setSubmitError(parsed)
      toast.error(
        parsed.fieldErrors.length > 0
          ? `Submission rejected — ${parsed.fieldErrors.length} field${
              parsed.fieldErrors.length === 1 ? "" : "s"
            } need attention. See the details above the submit button.`
          : parsed.message
      )
    } finally {
      setIsSubmitting(false)
    }
  }, [
    form,
    fieldIndex,
    steps,
    validateStep,
    activeSessionId,
    formStorageKey,
    stepStorageKey,
    stepCompletedStorageKey,
    queryClient,
    startSubmitProgress,
    handleSubmitProgress,
    succeedSubmitProgress,
    failSubmitProgress,
    resetSubmitProgress,
  ])

  // ─── Reset form ──────────────────────────────────────────────────────────
  // Deliberately doesn't call saveProgress() afterward — that would re-persist
  // the step/completed state from stale closure values.
  const resetForm = useCallback(async () => {
    form.reset(DEFAULT_FORM_VALUES)
    setCurrentStepId(steps[0]?.id ?? "")
    setCompletedSteps(new Set())
    setSubmitAttempted(false)
    setSubmitError(null)
    if (formStorageKey) await formStorage.clearFormData(formStorageKey)
    if (stepStorageKey) localStorage.removeItem(stepStorageKey)
    if (stepCompletedStorageKey)
      localStorage.removeItem(stepCompletedStorageKey)
    toast.info("Form has been reset.")
  }, [form, steps, formStorageKey, stepStorageKey, stepCompletedStorageKey])

  // ─── Clear just one step's answers back to their defaults ───────────────
  // form.reset() over the whole values object reliably re-renders every
  // watch() subscriber (including file previews).
  const clearStep = useCallback(
    async (stepId: string) => {
      const step = steps.find((s) => s.id === stepId)
      if (!step) return
      const values = form.getValues()
      const clearedKeys = [
        ...(step.kind === "builtin" ? STEP_FIELDS[step.formStep] : []),
        ...stepFields(step).flatMap((f) => {
          const key = formValueKeyFor(f)
          return key ? [key] : []
        }),
      ]
      const cleared = Object.fromEntries(
        clearedKeys.map((key) => [
          key,
          DEFAULT_FORM_VALUES[key as keyof FormDefaultValues],
        ])
      ) as Partial<FormDefaultValues>
      const answers = { ...(values.answers ?? {}) }
      delete answers[stepId]

      form.reset(
        { ...values, ...cleared, answers },
        { keepDirty: false, keepTouched: false, keepIsSubmitted: false }
      )
      setCompletedSteps((prev) => {
        const next = new Set(prev)
        next.delete(stepId)
        return next
      })
      await saveProgress()
      toast.info("Step cleared.")
    },
    [form, steps, saveProgress]
  )

  return {
    form,
    steps,
    currentStep,
    totalSteps,
    completedSteps,
    fieldIndex,
    isLoading,
    isSubmitting,
    submitStage: submitProgress.stage,
    submitPercent: submitProgress.percent,
    isSubmitted,
    submitAttempted,
    submitError,
    goToStep,
    nextStep,
    prevStep,
    submitForm,
    saveProgress,
    resetForm,
    clearStep,
    describeErrorPath,
    direction,
  }
}
