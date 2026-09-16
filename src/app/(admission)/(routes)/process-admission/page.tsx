"use client"

import { AnimatePresence, motion } from "framer-motion"
import { AlertTriangle, GraduationCap, RotateCcw, Loader2 } from "lucide-react"
import EmptyState from "@/components/custom/EmptyState"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { useDevSimulate } from "../../hooks/useAdmissionQueries"
import { useAdmissionStages } from "../../hooks/useAdmissionStages"
import {
  AdmissionStepIndicator,
  MajorProgramChoiceSection,
  ChoiceProgramSection,
  ApplicationPaymentSection,
  ApplicationFormSection,
  AdmissionStatusSection,
  AcceptanceFeeSection,
  TuitionPaymentSection,
  AdmissionCompleteSection,
  ContentStageSection,
  DocumentUploadStageSection,
  PaymentStageSection,
} from "../../components"

export default function ProcessAdmissionPage() {
  const {
    stages,
    currentStage,
    source,
    student,
    majorProgramOptions,
    fees,
    isLoading,
    configError,
    configEmpty,
    refresh,
    acknowledge,
    isAcknowledging,
    chooseMajorProgram,
    isChoosingMajorProgram,
    uploadDocument,
    removeDocument,
    isChangingDocuments,
    initiatePayment,
    isInitiatingPayment,
  } = useAdmissionStages()
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

  const renderStage = () => {
    if (!currentStage || !student || !fees) return null
    const sectionProps = { student, fees, onRefresh: refresh }

    // Rendered by type (sandbox/dynamic-admission/): the stage's own
    // settings decide the details, so stages can be added, removed or
    // reordered without a page change.
    switch (currentStage.type) {
      case "MAJOR_PROGRAM_CHOICE":
        return (
          <MajorProgramChoiceSection
            key={currentStage.key}
            {...sectionProps}
            majorProgramOptions={majorProgramOptions}
            onChoose={chooseMajorProgram}
            isSubmitting={isChoosingMajorProgram}
          />
        )
      case "PROGRAM_CHOICE":
        return (
          <ChoiceProgramSection
            key={currentStage.key}
            {...sectionProps}
            config={currentStage.config}
            title={currentStage.label}
            description={currentStage.description || undefined}
          />
        )
      case "PAYMENT":
        // Until the backend resolves fees per stage, the three fees the
        // student record already tracks keep their dedicated screens.
        if (source === "fallback") {
          switch (currentStage.config.feeCategory) {
            case "APPLICATION":
              return (
                <ApplicationPaymentSection
                  key={currentStage.key}
                  {...sectionProps}
                />
              )
            case "ACCEPTANCE":
              return (
                <AcceptanceFeeSection
                  key={currentStage.key}
                  {...sectionProps}
                />
              )
            case "TUITION":
              return (
                <TuitionPaymentSection
                  key={currentStage.key}
                  {...sectionProps}
                />
              )
          }
        }
        return (
          <PaymentStageSection
            key={currentStage.key}
            stage={currentStage}
            source={source}
            onPay={(amount) => initiatePayment(currentStage.key, amount)}
            isPaying={isInitiatingPayment}
          />
        )
      case "FORM":
        return (
          <ApplicationFormSection key={currentStage.key} {...sectionProps} />
        )
      case "DECISION":
        return (
          <AdmissionStatusSection
            key={currentStage.key}
            {...sectionProps}
            config={currentStage.config}
          />
        )
      case "CONTENT":
        return (
          <ContentStageSection
            key={currentStage.key}
            stage={currentStage}
            onAcknowledge={() => acknowledge(currentStage.key)}
            isSubmitting={isAcknowledging}
          />
        )
      case "DOCUMENT_UPLOAD":
        return (
          <DocumentUploadStageSection
            key={currentStage.key}
            stage={currentStage}
            source={source}
            onUpload={(documentKey, file) =>
              uploadDocument(currentStage.key, documentKey, file)
            }
            onRemove={(documentKey) =>
              removeDocument(currentStage.key, documentKey)
            }
            isBusy={isChangingDocuments}
          />
        )
      case "COMPLETE":
        return (
          <AdmissionCompleteSection
            key={currentStage.key}
            {...sectionProps}
            config={currentStage.config}
            completedStageLabels={stages
              .filter((s) => s.status === "COMPLETED" && s.type !== "COMPLETE")
              .map((s) => s.label)}
          />
        )
    }
  }

  return (
    <PermissionGate
      require={{ resource: "my-application", action: "view" }}
      denyBehavior="screen"
    >
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
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

        {stages.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-8 rounded-2xl border border-border/50 bg-card/50 p-4 shadow-sm backdrop-blur-sm"
          >
            <AdmissionStepIndicator
              stages={stages}
              currentStageKey={currentStage?.key ?? null}
            />
          </motion.div>
        )}

        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        )}

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
                <Button variant="outline" size="sm" onClick={refresh}>
                  Try again
                </Button>
              ) : undefined
            }
          />
        )}

        {!isLoading && !configError && !configEmpty && (
          <AnimatePresence mode="wait">{renderStage()}</AnimatePresence>
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
              {[
                {
                  label: "Choice Program: Program Chosen",
                  mutation: simulateProgramChosen,
                  run: () =>
                    simulateProgramChosen.mutate({
                      programId: 1,
                      programName: "B.Sc. Computer Science",
                      entryMode: "UTME",
                      studyMode: "online",
                      startTerm: student?.session ?? "2026/2027",
                    }),
                },
                {
                  label: "App Payment Paid",
                  mutation: simulateAppPaymentPaid,
                  run: () => simulateAppPaymentPaid.mutate(),
                },
                {
                  label: "Form Submitted",
                  mutation: simulateApplied,
                  run: () => simulateApplied.mutate(),
                },
                {
                  label: "Admission Offered",
                  mutation: simulateOffered,
                  run: () => simulateOffered.mutate(),
                },
                {
                  label: "Acceptance Fee Paid",
                  mutation: simulateAccepted,
                  run: () => simulateAccepted.mutate(),
                },
                {
                  label: "Simulate: Declined",
                  mutation: simulateDeclined,
                  run: () => simulateDeclined.mutate(),
                },
                {
                  label: "Simulate: Expired",
                  mutation: simulateExpired,
                  run: () => simulateExpired.mutate(),
                },
                {
                  label: "Tuition Paid",
                  mutation: simulateTuitionPaid,
                  run: () => simulateTuitionPaid.mutate(),
                },
              ].map(({ label, mutation, run }) => (
                <Button
                  key={label}
                  variant="outline"
                  size="sm"
                  onClick={run}
                  disabled={mutation.isPending}
                  className="gap-1.5 text-xs"
                >
                  {mutation.isPending && (
                    <Loader2 className="size-3 animate-spin" />
                  )}
                  {label}
                </Button>
              ))}
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
              Stages from: <span className="font-mono font-bold">{source}</span>{" "}
              | Current:{" "}
              <span className="font-mono font-bold">
                {currentStage?.key ?? "—"}
              </span>{" "}
              | Student: {student?.name ?? "—"} | Status:{" "}
              {student?.admission_status ?? "—"}
            </p>
          </motion.div>
        )}
      </div>
    </PermissionGate>
  )
}
