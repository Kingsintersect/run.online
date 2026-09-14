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
  FORM_STORAGE_KEY,
  STEP_STORAGE_KEY,
  DEFAULT_FORM_VALUES,
  STEP_FIELDS,
  getActiveFormSteps,
  getCustomFormFields,
  getFieldLabel,
  collectFormErrors,
  type FormDefaultValues,
} from "../types/form-types"
import { buildStepSchema } from "../lib/dynamic-field-schema"
import type { AdmissionFormField } from "@/types/admissionConfig"

// ─── Per-step schema resolver map ────────────────────────────────────────────
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

export interface UseAdmissionFormReturn {
  form: UseFormReturn<FormDefaultValues>
  currentStep: FormStep
  activeSteps: FormStep[]
  totalSteps: number
  completedSteps: Set<FormStep>
  /** The applicant's program's own custom FORM-group fields (Multi-Program
   *  Platform §B), resolved and ready for ADDITIONAL_INFO's renderer. Empty
   *  when the program has none — which also means ADDITIONAL_INFO never
   *  appears in activeSteps at all. */
  customFormFields: AdmissionFormField[]
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
  goToStep: (step: FormStep) => void
  nextStep: () => Promise<boolean>
  prevStep: () => void
  submitForm: () => Promise<void>
  saveProgress: () => Promise<void>
  resetForm: () => Promise<void>
  clearStep: (step: FormStep) => Promise<void>
  isStepValid: (step: FormStep) => boolean
  getStepErrors: (step: FormStep) => string[]
  direction: 1 | -1
}

export function useAdmissionForm(): UseAdmissionFormReturn {
  const [currentStep, setCurrentStep] = useState<FormStep>(
    FormStep.PERSONAL_INFO
  )
  const [completedSteps, setCompletedSteps] = useState<Set<FormStep>>(new Set())
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
  // Bug fix: the storage keys used to be the bare FORM_STORAGE_KEY/
  // STEP_STORAGE_KEY constants with no user scoping at all, so IndexedDB (and
  // its companion localStorage step/completed entries) were shared by every
  // account that ever logged in on the same browser — one applicant would see
  // a previous applicant's saved draft. Suffixing every key with the logged-in
  // user's id keeps each account's draft fully isolated; a fresh account (or
  // signing in as someone else on the same device) always starts blank.
  const isAppHydrated = useAppHydrated()
  const userId = useAppStore((s) => s.user?.id)
  const formStorageKey = userId ? `${FORM_STORAGE_KEY}_${userId}` : null
  const stepStorageKey = userId ? `${STEP_STORAGE_KEY}_${userId}` : null
  const stepCompletedStorageKey = stepStorageKey
    ? `${stepStorageKey}_completed`
    : null

  // ─── Admin-configured active steps — admins can disable/reorder steps ───
  const { data: admissionConfig } = useQuery(
    admissionStepsQueryOptions.config()
  )
  const { data: sessions } = useAcademicSessions()
  // If the applicant already made a real pre-application program choice (the
  // "Choice Program" process step), PROGRAM_SELECTION drops out of
  // activeSteps below and this pre-fills its fields instead of asking again.
  const { data: admissionStudent } = useQuery(admissionQueryOptions.student())
  const { data: allProgramsData } = useAllPrograms()
  // Major-Program Scoping — resolves the active session for the applicant's
  // already-chosen program's major program once the backend supports scoped
  // sessions; today (every session unscoped) this is identical to "the"
  // institution-wide active session.
  const selectedMajorProgramId = admissionStudent?.program_id
    ? (allProgramsData?.data ?? []).find(
        (p) => p.id === admissionStudent.program_id
      )?.majorProgramId
    : undefined
  const activeSessionId = useMemo(
    () => resolveActiveSession(sessions, selectedMajorProgramId)?.id ?? null,
    [sessions, selectedMajorProgramId]
  )

  // Multi-Program Platform — sandbox/multi-program-platform/ §A/§B. Resolves
  // the applicant's program's own FORM-group steps once a program is known
  // (via the earlier "Choice Program" process step); before that, resolves
  // with no programId (institution defaults only, i.e. no custom fields —
  // matches today's behavior exactly). Not yet shipped by the backend —
  // 404s and leaves customFormFields empty, so ADDITIONAL_INFO simply never
  // appears until it does.
  const { data: effectiveFormSteps } = useQuery({
    ...admissionStepsQueryOptions.effective(
      "FORM",
      admissionStudent?.program_id ?? null
    ),
    retry: false,
  })
  const customFormFields = useMemo(
    () => getCustomFormFields(effectiveFormSteps ?? []),
    [effectiveFormSteps]
  )

  const activeSteps = useMemo(() => {
    return getActiveFormSteps(
      admissionConfig?.formSteps ?? [],
      !!admissionStudent?.has_selected_program,
      customFormFields.length > 0
    )
  }, [
    admissionConfig,
    admissionStudent?.has_selected_program,
    customFormFields,
  ])
  const totalSteps = activeSteps.length

  // If a disabled step was reached/saved before the admin turned it off, snap to the nearest active one.
  useEffect(() => {
    if (isLoading || activeSteps.includes(currentStep)) return
    const fallback =
      activeSteps.find((s) => s > currentStep) ??
      activeSteps[activeSteps.length - 1] ??
      FormStep.PERSONAL_INFO
    setCurrentStep(fallback)
  }, [activeSteps, currentStep, isLoading])

  const form = useForm<FormDefaultValues>({
    defaultValues: DEFAULT_FORM_VALUES,
    mode: "onTouched",
  })

  // ─── Load persisted data on mount ────────────────────────────────────────
  // Waits for the app store to finish hydrating so `userId` (and therefore
  // the scoped storage keys) reflects the real logged-in account before
  // anything is read — loading too early risked resolving `userId` as
  // undefined for a moment and reading nothing, or briefly hitting the old
  // unscoped bucket.
  useEffect(() => {
    if (!isAppHydrated || hasLoadedRef.current) return
    hasLoadedRef.current = true

    const loadSavedData = async () => {
      try {
        // One-time cleanup of the pre-fix shared bucket — it's no longer read
        // or written by anyone, so purge it rather than leave a dead,
        // cross-account record sitting in IndexedDB/localStorage.
        formStorage.clearFormData(FORM_STORAGE_KEY).catch(() => {})
        localStorage.removeItem(STEP_STORAGE_KEY)
        localStorage.removeItem(`${STEP_STORAGE_KEY}_completed`)

        if (!formStorageKey || !stepStorageKey || !stepCompletedStorageKey) {
          return
        }

        const savedData = await formStorage.loadFormData(formStorageKey)
        if (savedData) {
          // saveProgress() stores `null` in place of `undefined` (IndexedDB
          // can't hold `undefined` as a value). Drop those keys on the way back
          // in so DEFAULT_FORM_VALUES supplies the field's real default — an
          // object spread only skips *missing* keys, so a stored `null` would
          // otherwise overwrite the default and reach the schemas, where an
          // optional field fails with "expected array, received null".
          const restored: Record<string, unknown> = {}
          for (const [key, value] of Object.entries(savedData)) {
            if (value !== null) restored[key] = value
          }

          const dataWithDefaults = {
            ...DEFAULT_FORM_VALUES,
            ...restored,
          } as FormDefaultValues
          form.reset(dataWithDefaults)
          toast.success("Your previous progress has been restored.")
        }

        const savedStep = localStorage.getItem(stepStorageKey)
        if (savedStep !== null) {
          const step = Number(savedStep)
          // Upper bound was FormStep.REVIEW (8) — the previous highest
          // value. ADDITIONAL_INFO (9, Multi-Program Platform §B) is now
          // the true max, appended after REVIEW specifically so REVIEW's
          // own value never shifted (see the FormStep enum's comment) —
          // this bound needs to widen to match, or a saved draft sitting on
          // ADDITIONAL_INFO would fail to restore and silently bounce back
          // to step 0 on reload.
          if (step >= 0 && step <= FormStep.ADDITIONAL_INFO) {
            setCurrentStep(step as FormStep)
          }
        }

        const savedCompleted = localStorage.getItem(stepCompletedStorageKey)
        if (savedCompleted) {
          const parsed = JSON.parse(savedCompleted) as number[]
          setCompletedSteps(new Set(parsed as FormStep[]))
        }
      } catch (error) {
        console.error("Failed to load saved form data:", error)
      } finally {
        setIsLoading(false)
        // Skip the auto-save that fires when isLoading transitions to false
        // since we just loaded data — no need to immediately write it back
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
  // A draft saved before DEFAULT_FORM_VALUES.programId/entryMode got their
  // temporary non-empty defaults (see form-types.ts) restores the old
  // 0/"" values via the load effect above, silently overriding the new
  // default. Force it back to a valid value here so testing isn't blocked
  // by stale IndexedDB data. Remove alongside the other TEMPORARY markers
  // once Choice Program is live and this step is retired.
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

  // ─── Pre-fill program choice from the earlier "Choice Program" step ─────
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
    // No logged-in user id yet (store still hydrating) — nothing to scope
    // the save to, so don't write anywhere rather than risk an unscoped save.
    if (!formStorageKey || !stepStorageKey || !stepCompletedStorageKey) return

    try {
      const values = form.getValues()

      // Sanitize: replace undefined values with null for IndexedDB compatibility
      // and keep File instances intact (storage.ts handles file extraction)
      const sanitized: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(values)) {
        if (value === undefined) {
          sanitized[key] = null
        } else {
          sanitized[key] = value
        }
      }

      await formStorage.saveFormData(formStorageKey, sanitized)
      localStorage.setItem(stepStorageKey, String(currentStep))
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
    if (!isLoading) {
      // Skip the redundant save right after initial load
      if (skipNextAutoSaveRef.current) {
        skipNextAutoSaveRef.current = false
        return
      }
      saveProgress()
    }
  }, [currentStep, isLoading, saveProgress])

  // ─── Validate current step fields ────────────────────────────────────────
  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    if (currentStep === FormStep.REVIEW) return true

    // Multi-Program Platform §B — ADDITIONAL_INFO's "schema" is built at
    // runtime from the program's resolved custom fields, not a static
    // per-step entry in STEP_SCHEMAS below.
    if (currentStep === FormStep.ADDITIONAL_INFO) {
      if (customFormFields.length === 0) return true
      const schema = buildStepSchema(customFormFields)
      const result = await schema.safeParseAsync(
        form.getValues("customFields") ?? {}
      )
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          form.setError(`customFields.${issue.path.join(".")}` as never, {
            message: issue.message,
          })
        })
        return false
      }
      form.clearErrors("customFields" as never)
      return true
    }

    // Skip document validation when awaiting results
    if (
      currentStep === FormStep.QUALIFICATION_DOCUMENTS &&
      form.getValues("awaiting_result")
    ) {
      return true
    }

    const stepSchema = STEP_SCHEMAS[currentStep as keyof typeof STEP_SCHEMAS]
    if (!stepSchema) return true

    const fields = STEP_FIELDS[currentStep]
    const values = form.getValues()

    // Extract only this step's field values
    const stepValues: Record<string, unknown> = {}
    fields.forEach((field) => {
      stepValues[field] = values[field as keyof FormDefaultValues]
    })

    const result = await stepSchema.safeParseAsync(stepValues)

    if (!result.success) {
      // Map errors to react-hook-form
      result.error.issues.forEach((issue) => {
        const fieldPath = issue.path.join(".") as keyof FormDefaultValues
        form.setError(fieldPath, { message: issue.message })
      })
      return false
    }

    // Clear step errors
    fields.forEach((field) => {
      form.clearErrors(field as keyof FormDefaultValues)
    })

    return true
  }, [currentStep, form, customFormFields])

  // ─── Navigation (moves along admin-configured activeSteps, not raw +/-1) ─
  const nextStep = useCallback(async (): Promise<boolean> => {
    const isValid = await validateCurrentStep()
    if (!isValid) {
      const fields = new Set(STEP_FIELDS[currentStep])
      const stepErrors = collectFormErrors(form.formState.errors).filter((e) =>
        fields.has(e.field)
      )
      const first = stepErrors[0]
      const extra =
        stepErrors.length > 1
          ? ` (+${stepErrors.length - 1} more issue${stepErrors.length > 2 ? "s" : ""})`
          : ""
      toast.error(
        first
          ? `${getFieldLabel(first.field)}: ${first.message}${extra}`
          : "Please review the highlighted fields before proceeding."
      )
      return false
    }

    setCompletedSteps((prev) => new Set([...prev, currentStep]))
    setDirection(1)

    const idx = activeSteps.indexOf(currentStep)
    if (idx !== -1 && idx < activeSteps.length - 1) {
      setCurrentStep(activeSteps[idx + 1])
    }

    await saveProgress()
    return true
  }, [currentStep, activeSteps, validateCurrentStep, saveProgress, form])

  const prevStep = useCallback(() => {
    const idx = activeSteps.indexOf(currentStep)
    if (idx > 0) {
      setDirection(-1)
      setCurrentStep(activeSteps[idx - 1])
    }
  }, [currentStep, activeSteps])

  const goToStep = useCallback(
    (step: FormStep) => {
      if (!activeSteps.includes(step)) return
      const currentIdx = activeSteps.indexOf(currentStep)
      const targetIdx = activeSteps.indexOf(step)
      // Only allow going to completed steps or the current step + 1 (within active steps)
      if (
        targetIdx <= currentIdx ||
        completedSteps.has(step) ||
        targetIdx === currentIdx + 1
      ) {
        setDirection(targetIdx > currentIdx ? 1 : -1)
        setCurrentStep(step)
      }
    },
    [currentStep, activeSteps, completedSteps]
  )

  // ─── Check if a step has valid data ──────────────────────────────────────
  const isStepValid = useCallback(
    (step: FormStep): boolean => {
      if (step === FormStep.REVIEW) return true

      if (step === FormStep.ADDITIONAL_INFO) {
        if (customFormFields.length === 0) return true
        const schema = buildStepSchema(customFormFields)
        return schema.safeParse(form.getValues("customFields") ?? {}).success
      }

      const stepSchema = STEP_SCHEMAS[step as keyof typeof STEP_SCHEMAS]
      if (!stepSchema) return true

      const fields = STEP_FIELDS[step]
      const values = form.getValues()

      const stepValues: Record<string, unknown> = {}
      fields.forEach((field) => {
        stepValues[field] = values[field as keyof FormDefaultValues]
      })

      const result = stepSchema.safeParse(stepValues)
      return result.success
    },
    [form, customFormFields]
  )

  // ─── Get step-specific errors ────────────────────────────────────────────
  const getStepErrors = useCallback(
    (step: FormStep): string[] => {
      if (step === FormStep.ADDITIONAL_INFO) {
        const errs = form.formState.errors.customFields as
          | Record<string, { message?: string }>
          | undefined
        return Object.values(errs ?? {})
          .map((e) => e?.message)
          .filter((m): m is string => !!m)
      }
      const fields = new Set(STEP_FIELDS[step])
      return collectFormErrors(form.formState.errors)
        .filter((e) => fields.has(e.field))
        .map((e) => e.message)
    },
    [form.formState.errors]
  )

  // ─── Submit full form ────────────────────────────────────────────────────
  const submitForm = useCallback(async () => {
    setIsSubmitting(true)
    setSubmitAttempted(true)
    setSubmitError(null)
    startSubmitProgress()
    try {
      const values = form.getValues()
      const result = await odlProgramSchema.safeParseAsync(values)

      if (!result.success) {
        console.warn(
          "Submission validation errors:",
          result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
        )
        result.error.issues.forEach((issue) => {
          const fieldPath = issue.path.join(".") as keyof FormDefaultValues
          form.setError(fieldPath, { message: issue.message })
        })
        toast.error("Please review and fix all errors before submitting.")
        // Nothing was sent, so drop back to idle rather than showing a failed
        // upload — the error summary above the footer explains what's wrong.
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
        handleSubmitProgress
      )
      succeedSubmitProgress()

      // SuccessModal redirects to /process-admission ~10s from now, but the
      // student query has a 60s staleTime — without this the page would render
      // from the pre-submit snapshot and look like nothing happened. It also
      // matters for a re-application after rejection: the stale snapshot still
      // says `admission_status: "rejected"`, which would drop the applicant
      // straight back onto the rejection panel they just acted on.
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
  // Deliberately does NOT call saveProgress() afterward — that would
  // re-persist STEP_STORAGE_KEY/completedSteps from their stale pre-reset
  // closure values, silently undoing the removeItem calls below. Clearing
  // storage and leaving it empty is correct: the next mount's load-effect
  // finds nothing to restore and falls through to the current
  // DEFAULT_FORM_VALUES exactly as intended.
  const resetForm = useCallback(async () => {
    form.reset(DEFAULT_FORM_VALUES)
    setCurrentStep(FormStep.PERSONAL_INFO)
    setCompletedSteps(new Set())
    setSubmitAttempted(false)
    setSubmitError(null)
    if (formStorageKey) await formStorage.clearFormData(formStorageKey)
    if (stepStorageKey) localStorage.removeItem(stepStorageKey)
    if (stepCompletedStorageKey)
      localStorage.removeItem(stepCompletedStorageKey)
    toast.info("Form has been reset.")
  }, [form, formStorageKey, stepStorageKey, stepCompletedStorageKey])

  // ─── Clear just the current step's fields back to their defaults ────────
  // Uses form.reset() over the whole values object (rather than per-field
  // setValue calls) because reset() is what reliably forces every watch()
  // subscriber — including file-preview components — to re-render with the
  // cleared value; individual setValue calls were silently not "sticking"
  // visually for some field types.
  const clearStep = useCallback(
    async (step: FormStep) => {
      const clearedFields = Object.fromEntries(
        STEP_FIELDS[step].map((field) => [
          field,
          DEFAULT_FORM_VALUES[field as keyof FormDefaultValues],
        ])
      ) as Partial<FormDefaultValues>

      form.reset(
        { ...form.getValues(), ...clearedFields },
        { keepDirty: false, keepTouched: false, keepIsSubmitted: false }
      )
      setCompletedSteps((prev) => {
        const next = new Set(prev)
        next.delete(step)
        return next
      })
      await saveProgress()
      toast.info("Step cleared.")
    },
    [form, saveProgress]
  )

  return {
    form,
    currentStep,
    activeSteps,
    totalSteps,
    completedSteps,
    customFormFields,
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
    isStepValid,
    getStepErrors,
    direction,
  }
}
