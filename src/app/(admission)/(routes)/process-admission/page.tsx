"use client"

import { useMemo } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle } from "lucide-react"
import EmptyState from "@/components/custom/EmptyState"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import {
  useFees,
  useStudentAdmission,
  useDevSimulate,
} from "../../hooks/useAdmissionQueries"
import { admissionKeys } from "../../services/admissionService"
import { admissionStepsQueryOptions } from "@/services/admissionStepsApi"
import {
  AdmissionStepIndicator,
  ChoiceProgramSection,
  ApplicationPaymentSection,
  ApplicationFormSection,
  AdmissionStatusSection,
  AcceptanceFeeSection,
  TuitionPaymentSection,
  AdmissionCompleteSection,
} from "../../components"
import { AdmissionStep } from "../../types/admission"

const KNOWN_STEP_KEYS: readonly string[] = Object.values(AdmissionStep)
import { GraduationCap, RotateCcw, Loader2 } from "lucide-react"
import { sortByOrder } from "@/lib/admissionConfig"
import { deriveStep } from "../../store/admissionStore"

export default function ProcessAdmissionPage() {
  const queryClient = useQueryClient()
  const { data: fees, isLoading: feesLoading } = useFees()
  const {
    data: student,
    isLoading: studentLoading,
    refetch,
  } = useStudentAdmission()
  const {
    data: admissionConfig,
    isLoading: configLoading,
    isError: configError,
  } = useQuery(admissionStepsQueryOptions.config())

  // Multi-Program Platform: once the applicant has chosen a program, prefer
  // the server-resolved, program-scoped PROCESS steps over the raw
  // institution-wide config above
  // (sandbox/multi-program-platform/API_CONTRACTS.md §A). Falls back to
  // `admissionConfig.processSteps` if the effective lookup fails.
  const { data: effectiveProcessSteps } = useQuery({
    ...admissionStepsQueryOptions.effective("PROCESS", student?.program_id),
    enabled: !!student?.program_id,
    retry: false,
  })
  const {
    resetAll,
    simulateProgramChosen,
    simulateAppPaymentPaid,
    simulateApplied,
    simulateOffered,
    simulateAccepted,
    simulateDeclined,
    simulateExpired,
    simulateTuitionPaid,
  } = useDevSimulate()

  // Derived directly from both queries' live data on every render — not
  // stored in Zustand and set imperatively from two independent effects.
  // That older approach raced: whichever of `student`/`admissionConfig`
  // resolved first computed the step from the *other* value's still-empty
  // default, and nothing was guaranteed to recompute once both were in,
  // so a freshly-logged-in applicant could get stuck on the wrong step
  // until a full page reload happened to settle the race differently.
  // A plain `useMemo` has no such window: it always reflects the current
  // `student` + `processSteps`, whichever order they arrived in.
  const orderedSteps = useMemo(() => {
    if (effectiveProcessSteps?.length) {
      // Already server-resolved (program > category > institution default)
      // and pre-filtered to active steps only — adapt into the shape
      // AdmissionStepIndicator/deriveStep already consume rather than
      // touching either of them.
      return sortByOrder(
        effectiveProcessSteps.map((s) => ({ ...s, enabled: true }))
      )
    }
    return sortByOrder(
      (admissionConfig?.processSteps ?? []).filter(
        (s) => s.enabled || s.required
      )
    )
  }, [admissionConfig, effectiveProcessSteps])
  const currentStep = useMemo(
    () => deriveStep(student ?? null, orderedSteps),
    [student, orderedSteps]
  )

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: admissionKeys.student() })
    refetch()
  }

  const isLoading = feesLoading || studentLoading || configLoading
  const processSteps = admissionConfig?.processSteps ?? []
  const configEmpty =
    !configLoading && !configError && processSteps.length === 0

  return (
    <PermissionGate
      require={{ resource: "my-application", action: "view" }}
      denyBehavior="screen"
    >
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 space-y-1"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 dark:bg-primary/20">
              <GraduationCap className="size-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Admission Process
              </h1>
              <p className="text-sm text-muted-foreground">
                {student
                  ? `Welcome, ${student.name} — Session: ${student.session}`
                  : "Complete all steps to finalize your admission"}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Step indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-8 rounded-2xl border border-border/50 bg-card/50 p-4 shadow-sm backdrop-blur-sm"
        >
          <AdmissionStepIndicator
            currentStep={currentStep}
            stepDefinitions={processSteps}
          />
        </motion.div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        )}

        {/* Admission step configuration failed to load or is empty */}
        {!isLoading && (configError || configEmpty) && (
          <EmptyState
            icon={AlertTriangle}
            title={
              configError
                ? "Couldn't load the admission process configuration"
                : "Admission process isn't configured yet"
            }
            description={
              configError
                ? "We couldn't reach the admission configuration service. Please refresh the page, or contact the admissions office if this keeps happening."
                : "No admission process steps have been set up for this session yet. Please contact the admissions office to have the process configured."
            }
            action={
              configError ? (
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  Try again
                </Button>
              ) : undefined
            }
          />
        )}

        {/* Step sections — AnimatePresence for smooth transitions */}
        {!isLoading && !configError && !configEmpty && student && fees && (
          <AnimatePresence mode="wait">
            {currentStep === AdmissionStep.CHOICE_PROGRAM && (
              <ChoiceProgramSection
                key="choice-program"
                student={student}
                fees={fees}
                onRefresh={handleRefresh}
              />
            )}

            {currentStep === AdmissionStep.APPLICATION_PAYMENT && (
              <ApplicationPaymentSection
                key="app-payment"
                student={student}
                fees={fees}
                onRefresh={handleRefresh}
              />
            )}

            {currentStep === AdmissionStep.APPLICATION_FORM && (
              <ApplicationFormSection
                key="app-form"
                student={student}
                fees={fees}
                onRefresh={handleRefresh}
              />
            )}

            {currentStep === AdmissionStep.ADMISSION_STATUS && (
              <AdmissionStatusSection
                key="admission-status"
                student={student}
                fees={fees}
                onRefresh={handleRefresh}
              />
            )}

            {currentStep === AdmissionStep.ACCEPTANCE_FEE && (
              <AcceptanceFeeSection
                key="acceptance-fee"
                student={student}
                fees={fees}
                onRefresh={handleRefresh}
              />
            )}

            {currentStep === AdmissionStep.TUITION_PAYMENT && (
              <TuitionPaymentSection
                key="tuition-payment"
                student={student}
                fees={fees}
                onRefresh={handleRefresh}
              />
            )}

            {currentStep === AdmissionStep.COMPLETED && (
              <AdmissionCompleteSection
                key="completed"
                student={student}
                fees={fees}
                onRefresh={handleRefresh}
              />
            )}

            {/* A custom admin-created step with no matching UI yet — see the "Custom" badge in the admission config admin page */}
            {!KNOWN_STEP_KEYS.includes(currentStep) && (
              <motion.div
                key="unknown-step"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <EmptyState
                  icon={AlertTriangle}
                  title="This step isn't available yet"
                  description="The admissions office added a custom step here that doesn't have a page built for it yet. Please contact the admissions office to continue."
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Dev toolbar — only in development */}
        {process.env.NODE_ENV === "development" && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-10 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 p-4 dark:bg-amber-500/10"
          >
            <p className="mb-3 text-xs font-bold tracking-wider text-amber-600 uppercase dark:text-amber-400">
              🛠 Development Controls — Simulate Workflow Steps
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  simulateProgramChosen.mutate({
                    programId: 1,
                    programName: "B.Sc. Computer Science",
                    entryMode: "UTME",
                    studyMode: "online",
                    startTerm: student?.session ?? "2026/2027",
                  })
                }
                disabled={simulateProgramChosen.isPending}
                className="gap-1.5 text-xs"
              >
                {simulateProgramChosen.isPending && (
                  <Loader2 className="size-3 animate-spin" />
                )}
                Choice Program: Program Chosen
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => simulateAppPaymentPaid.mutate()}
                disabled={simulateAppPaymentPaid.isPending}
                className="gap-1.5 text-xs"
              >
                {simulateAppPaymentPaid.isPending && (
                  <Loader2 className="size-3 animate-spin" />
                )}
                Step 0→1: App Payment Paid
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => simulateApplied.mutate()}
                disabled={simulateApplied.isPending}
                className="gap-1.5 text-xs"
              >
                {simulateApplied.isPending && (
                  <Loader2 className="size-3 animate-spin" />
                )}
                Step 1→2: Form Submitted
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => simulateOffered.mutate()}
                disabled={simulateOffered.isPending}
                className="gap-1.5 text-xs"
              >
                {simulateOffered.isPending && (
                  <Loader2 className="size-3 animate-spin" />
                )}
                Step 2→3: Admission Offered
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => simulateAccepted.mutate()}
                disabled={simulateAccepted.isPending}
                className="gap-1.5 text-xs"
              >
                {simulateAccepted.isPending && (
                  <Loader2 className="size-3 animate-spin" />
                )}
                Step 3→4: Acceptance Fee Paid
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => simulateDeclined.mutate()}
                disabled={simulateDeclined.isPending}
                className="gap-1.5 text-xs text-destructive"
              >
                {simulateDeclined.isPending && (
                  <Loader2 className="size-3 animate-spin" />
                )}
                Simulate: Declined
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => simulateExpired.mutate()}
                disabled={simulateExpired.isPending}
                className="gap-1.5 text-xs text-amber-600"
              >
                {simulateExpired.isPending && (
                  <Loader2 className="size-3 animate-spin" />
                )}
                Simulate: Expired
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => simulateTuitionPaid.mutate()}
                disabled={simulateTuitionPaid.isPending}
                className="gap-1.5 text-xs"
              >
                {simulateTuitionPaid.isPending && (
                  <Loader2 className="size-3 animate-spin" />
                )}
                Step 4→5: Tuition Paid
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => resetAll.mutate()}
                disabled={resetAll.isPending}
                className="gap-1.5 text-xs text-destructive"
              >
                {resetAll.isPending ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <RotateCcw className="size-3" />
                )}
                Reset Everything
              </Button>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Current step:{" "}
              <span className="font-mono font-bold">{currentStep}</span> |
              Student: {student?.name ?? "—"} | Status:{" "}
              {student?.admission_status ?? "—"} | has_selected_program:{" "}
              <span className="font-mono">
                {String(student?.has_selected_program)}
              </span>
            </p>
          </motion.div>
        )}
      </div>
    </PermissionGate>
  )
}
