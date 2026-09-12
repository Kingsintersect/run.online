"use client"

import { FormProvider } from "react-hook-form"
import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { UploadProgress } from "@/components/upload-progress"
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
  AdditionalInfoStep,
} from "./components/steps"
import {
  FormStep,
  FORM_STEPS,
  getFieldLabel,
  getStepForField,
  backendFieldToFormField,
  collectFormErrors,
} from "./types/form-types"
import type { AdmissionFormField } from "@/types/admissionConfig"

const getStepTitle = (step: FormStep): string =>
  FORM_STEPS.find((s) => s.id === step)?.title ?? "the relevant step"

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
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

function StepRenderer({
  step,
  activeSteps,
  completedSteps,
  onEditStep,
  customFormFields,
}: {
  step: FormStep
  activeSteps: FormStep[]
  completedSteps: Set<FormStep>
  onEditStep: (step: FormStep) => void
  customFormFields: AdmissionFormField[]
}) {
  switch (step) {
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
    case FormStep.ADDITIONAL_INFO:
      return <AdditionalInfoStep fields={customFormFields} />
    case FormStep.REVIEW:
      return (
        <ReviewStep
          activeSteps={activeSteps}
          completedSteps={completedSteps}
          onEditStep={onEditStep}
          customFormFields={customFormFields}
        />
      )
    default:
      return null
  }
}

export default function AdmissionApplicationFormPage() {
  const {
    form,
    currentStep,
    activeSteps,
    totalSteps,
    completedSteps,
    customFormFields,
    isLoading,
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
    direction,
  } = useAdmissionForm()

  const currentStepPosition = activeSteps.indexOf(currentStep)

  const submitErrors = submitAttempted
    ? collectFormErrors(form.formState.errors).map(
        ({ path, field, message }) => ({
          field: path,
          message,
          step: getStepForField(field),
          label: getFieldLabel(field),
        })
      )
    : []

  // Per-field messages from a backend rejection (Laravel 422 `errors` map),
  // each linked to the step that owns the field where the field is resolvable
  // and that step is currently active.
  const serverErrorRows = (submitError?.fieldErrors ?? []).map(
    ({ field, message }, i) => {
      const formField = backendFieldToFormField(field)
      const step = getStepForField(formField)
      const navigable = step !== undefined && activeSteps.includes(step)
      return {
        key: `${field}-${i}`,
        label: getFieldLabel(formField),
        message,
        step: navigable ? step : undefined,
      }
    }
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

  return (
    <PermissionGate
      require={{ resource: "my-application", action: "submit" }}
      denyBehavior="modal"
    >
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
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

        {/* Progress Bar */}
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

        {/* Step Indicator */}
        <FormStepIndicator
          currentStep={currentStep}
          activeSteps={activeSteps}
          completedSteps={completedSteps}
          onStepClick={goToStep}
        />

        {/* Form Content */}
        <FormProvider {...form}>
          <form onSubmit={(e) => e.preventDefault()}>
            <Card className="mt-6">
              <CardContent className="min-h-100 overflow-hidden p-6 sm:p-8">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={currentStep}
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
                      activeSteps={activeSteps}
                      completedSteps={completedSteps}
                      onEditStep={goToStep}
                      customFormFields={customFormFields}
                    />
                  </motion.div>
                </AnimatePresence>
              </CardContent>

              {/* Submit error summary — client-side validation + backend
                  rejections, visible right above the footer */}
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
                            ({ field, message, step, label }) => (
                              <li
                                key={field}
                                className="text-sm text-destructive"
                              >
                                {step !== undefined ? (
                                  <button
                                    type="button"
                                    onClick={() => goToStep(step)}
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
                              ({ key, label, message, step }) => (
                                <li
                                  key={key}
                                  className="text-sm text-destructive"
                                >
                                  <span className="font-medium">{label}:</span>{" "}
                                  {message}
                                  {step !== undefined && (
                                    <>
                                      {" — "}
                                      <button
                                        type="button"
                                        onClick={() => goToStep(step)}
                                        className="font-medium underline underline-offset-2 hover:no-underline"
                                      >
                                        Go to {getStepTitle(step)}
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

              {/* Submission progress — documents can be several MB on a slow
                  connection, so the transfer is reported rather than hidden
                  behind a spinner. */}
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

              {/* Navigation */}
              <div className="px-6 pb-6 sm:px-8">
                <FormNavigation
                  currentStep={currentStep}
                  currentStepPosition={currentStepPosition}
                  totalSteps={totalSteps}
                  isSubmitting={isSubmitting}
                  onNext={nextStep}
                  onPrev={prevStep}
                  onSubmit={submitForm}
                  onSave={saveProgress}
                  onClearStep={() => clearStep(currentStep)}
                  onClearForm={resetForm}
                />
              </div>
            </Card>
          </form>
        </FormProvider>

        {/* Success Modal */}
        <SuccessModal isOpen={isSubmitted} />
      </div>
    </PermissionGate>
  )
}
