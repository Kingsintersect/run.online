"use client"

import { FormProvider } from "react-hook-form"
import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { UploadProgress } from "@/components/upload-progress"
import EmptyState from "@/components/custom/EmptyState"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { useAdmissionForm } from "./hooks/useAdmissionForm"
import FormStepIndicator from "./components/FormStepIndicator"
import FormNavigation from "./components/FormNavigation"
import SuccessModal from "./components/SuccessModal"
import {
  PersonalInfoStep,
  SponsorInfoStep,
  NextOfKinStep,
  DocumentsStep,
  QualificationFieldsStep,
  ExamSittingStep,
  QualificationDocumentsStep,
  ProgramSelectionStep,
  ReviewStep,
} from "./components/steps"
import DynamicStep from "./components/steps/DynamicStep"
import { FormStep, collectFormErrors } from "./types/form-types"
import type { FieldIndexEntry, WizardStep } from "./lib/dynamic-form"

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -300 : 300, opacity: 0 }),
}

function FormLoadingSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-center gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="size-10 rounded-full" />
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
        <Skeleton className="h-10" />
        <Skeleton className="h-24" />
      </div>
    </div>
  )
}

function BuiltInStepBody({ formStep }: { formStep: FormStep }) {
  switch (formStep) {
    case FormStep.PERSONAL_INFO:
      return <PersonalInfoStep />
    case FormStep.SPONSOR_INFO:
      return <SponsorInfoStep />
    case FormStep.NEXT_OF_KIN:
      return <NextOfKinStep />
    case FormStep.DOCUMENTS:
      return <DocumentsStep />
    case FormStep.QUALIFICATION_FIELDS:
      return <QualificationFieldsStep />
    case FormStep.EXAM_SITTING:
      return <ExamSittingStep />
    case FormStep.QUALIFICATION_DOCUMENTS:
      return <QualificationDocumentsStep />
    case FormStep.PROGRAM_SELECTION:
      return <ProgramSelectionStep />
    default:
      return null
  }
}

function StepRenderer({
  step,
  steps,
  completedSteps,
  onEditStep,
  fieldIndex,
}: {
  step: WizardStep
  steps: WizardStep[]
  completedSteps: Set<string>
  onEditStep: (stepId: string) => void
  fieldIndex: Map<string, FieldIndexEntry>
}) {
  switch (step.kind) {
    case "review":
      return (
        <ReviewStep
          steps={steps}
          completedSteps={completedSteps}
          onEditStep={onEditStep}
          fieldIndex={fieldIndex}
        />
      )
    case "dynamic":
      return (
        <DynamicStep
          stepId={step.id}
          title={step.title}
          description={step.description}
          fields={step.fields}
          fieldIndex={fieldIndex}
        />
      )
    case "builtin":
      return (
        <div className="space-y-8">
          <BuiltInStepBody formStep={step.formStep} />
          {step.extraFields.length > 0 && (
            <div className="border-t pt-6">
              <DynamicStep
                stepId={step.id}
                fields={step.extraFields}
                fieldIndex={fieldIndex}
              />
            </div>
          )}
        </div>
      )
  }
}

export default function AdmissionApplicationFormPage() {
  const {
    form,
    steps,
    currentStep,
    totalSteps,
    completedSteps,
    fieldIndex,
    isLoading,
    isEmpty,
    isSubmitting,
    submitStage,
    submitPercent,
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
  } = useAdmissionForm()

  const currentStepPosition = currentStep
    ? steps.findIndex((s) => s.id === currentStep.id)
    : 0
  const stepTitle = (stepId: string) =>
    steps.find((s) => s.id === stepId)?.title ?? "the relevant step"

  const submitErrors = submitAttempted
    ? collectFormErrors(form.formState.errors).map(({ path, message }) => ({
        key: path,
        message,
        ...describeErrorPath(path),
      }))
    : []

  // Per-field messages from a backend rejection, each linked to the step that owns the field.
  const serverErrorRows = (submitError?.fieldErrors ?? []).map(
    ({ field, message }, i) => ({
      key: `${field}-${i}`,
      message,
      ...describeErrorPath(field),
    })
  )

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <Card>
          <FormLoadingSkeleton />
        </Card>
      </div>
    )
  }

  // Genuinely nothing configured for this major program yet — not a
  // loading state (BACKEND_DEVIATIONS A23: a major program with nothing
  // adopted via "Add from Catalog" has no shared default to fall back to
  // anymore). Distinct from the loading skeleton above — this used to be
  // indistinguishable from "still loading" (both fell through to
  // `!currentStep`), leaving the applicant on a skeleton forever instead
  // of an honest explanation.
  if (isEmpty || !currentStep) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <EmptyState
          icon={AlertTriangle}
          title="Application form isn't configured yet"
          description="No application form steps have been set up for your major program yet. Please contact the admissions office to have the form configured."
        />
      </div>
    )
  }

  return (
    <PermissionGate
      require={{ resource: "my-application", action: "submit" }}
      denyBehavior="modal"
    >
      <div className="mx-auto max-w-7xl px-4 py-8">
        <motion.div
          className="mb-8 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Admission Application Form
          </h1>
          <p className="mt-2 text-muted-foreground">
            Complete all steps below to submit your application. Your progress
            is automatically saved.
          </p>
        </motion.div>

        <motion.div
          className="mb-2 h-1.5 overflow-hidden rounded-full bg-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{
              width: `${((currentStepPosition + 1) / totalSteps) * 100}%`,
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </motion.div>
        <p className="mb-6 text-right text-xs text-muted-foreground">
          Step {currentStepPosition + 1} of {totalSteps}
        </p>

        <FormStepIndicator
          steps={steps}
          currentStepId={currentStep.id}
          completedSteps={completedSteps}
          onStepClick={goToStep}
        />

        <FormProvider {...form}>
          <form onSubmit={(e) => e.preventDefault()}>
            <Card className="mt-6">
              <CardContent className="min-h-100 overflow-hidden p-6 sm:p-8">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={currentStep.id}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      duration: 0.35,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                  >
                    <StepRenderer
                      step={currentStep}
                      steps={steps}
                      completedSteps={completedSteps}
                      onEditStep={goToStep}
                      fieldIndex={fieldIndex}
                    />
                  </motion.div>
                </AnimatePresence>
              </CardContent>

              {(submitErrors.length > 0 || submitError) && (
                <div className="px-6 sm:px-8">
                  <div
                    role="alert"
                    className="mb-4 space-y-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4"
                  >
                    {submitErrors.length > 0 && (
                      <div>
                        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-destructive">
                          <AlertCircle className="size-4 shrink-0" />
                          {submitErrors.length === 1
                            ? "Please fix 1 error before submitting:"
                            : `Please fix ${submitErrors.length} errors before submitting:`}
                        </p>
                        <ul className="list-disc space-y-1 pl-5">
                          {submitErrors.map(
                            ({ key, message, stepId, label }) => (
                              <li
                                key={key}
                                className="text-sm text-destructive"
                              >
                                {stepId ? (
                                  <button
                                    type="button"
                                    onClick={() => goToStep(stepId)}
                                    className="text-left underline-offset-2 hover:underline"
                                  >
                                    <span className="font-medium">
                                      {label}:
                                    </span>{" "}
                                    {message}
                                  </button>
                                ) : (
                                  <>
                                    <span className="font-medium">
                                      {label}:
                                    </span>{" "}
                                    {message}
                                  </>
                                )}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}

                    {submitError && (
                      <div>
                        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-destructive">
                          <AlertCircle className="size-4 shrink-0" />
                          {serverErrorRows.length > 0
                            ? "The server rejected your application — fix the following and resubmit:"
                            : "Your application could not be submitted:"}
                        </p>
                        {serverErrorRows.length > 0 ? (
                          <ul className="list-disc space-y-1 pl-5">
                            {serverErrorRows.map(
                              ({ key, label, message, stepId }) => (
                                <li
                                  key={key}
                                  className="text-sm text-destructive"
                                >
                                  <span className="font-medium">{label}:</span>{" "}
                                  {message}
                                  {stepId && (
                                    <>
                                      {" — "}
                                      <button
                                        type="button"
                                        onClick={() => goToStep(stepId)}
                                        className="font-medium underline underline-offset-2 hover:no-underline"
                                      >
                                        Go to {stepTitle(stepId)}
                                      </button>
                                    </>
                                  )}
                                </li>
                              )
                            )}
                          </ul>
                        ) : (
                          <p className="text-sm text-destructive">
                            {submitError.message}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {submitStage !== "idle" && (
                <div className="px-6 sm:px-8">
                  <UploadProgress
                    stage={submitStage}
                    percent={submitPercent}
                    message={
                      submitStage === "done"
                        ? "Application submitted successfully"
                        : submitStage === "error"
                          ? "We couldn't submit your application — please try again"
                          : undefined
                    }
                    className="mb-4"
                  />
                </div>
              )}

              <div className="px-6 pb-6 sm:px-8">
                <FormNavigation
                  isFirst={currentStepPosition === 0}
                  isLast={currentStep.kind === "review"}
                  currentStepPosition={currentStepPosition}
                  totalSteps={totalSteps}
                  isSubmitting={isSubmitting}
                  onNext={nextStep}
                  onPrev={prevStep}
                  onSubmit={submitForm}
                  onSave={saveProgress}
                  onClearStep={() => clearStep(currentStep.id)}
                  onClearForm={resetForm}
                />
              </div>
            </Card>
          </form>
        </FormProvider>

        <SuccessModal isOpen={isSubmitted} />
      </div>
    </PermissionGate>
  )
}
