"use client"

import { cn } from "@/lib/utils"
import { CalendarDays, Layers, Check } from "lucide-react"
import {
  useAcademicSessionSetupStore,
  type AcademicSessionSetupStep,
} from "@/store/dashboard/academicSessionSetupStore"

// Static wizard-step config (labels/icons for this 2-step setup flow) — not
// business data, so it isn't fetched from the backend. A stale "RUNNING ON
// DUMMY DATA" comment and a dead earlier draft of this component (built
// against a different, unused feeSetupStore) used to live here; both were
// removed in the 2026-09 dummy-data audit — this file was never actually
// showing fake business data to a real user.
const STEPS: {
  key: AcademicSessionSetupStep
  label: string
  description: string
  icon: React.ElementType
}[] = [
  {
    key: "sessions",
    label: "Academic Session",
    description: "Create or select a session",
    icon: CalendarDays,
  },
  {
    key: "semesters",
    label: "Semesters",
    description: "Define semester periods",
    icon: Layers,
  },
]

function getStepIndex(step: AcademicSessionSetupStep) {
  return STEPS.findIndex((s) => s.key === step)
}

export function SetupStepper() {
  const { currentStep, setCurrentStep, selectedSessionId } =
    useAcademicSessionSetupStore()
  const currentIdx = getStepIndex(currentStep)

  return (
    <nav className="mb-8">
      <ol className="flex items-center gap-2">
        {STEPS.map((step, idx) => {
          const isActive = idx === currentIdx
          const isCompleted = idx < currentIdx
          const isClickable =
            isCompleted || idx === 0 || (idx > 0 && !!selectedSessionId)

          const Icon = step.icon

          return (
            <li key={step.key} className="flex flex-1 items-center">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && setCurrentStep(step.key)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors",
                  isActive && "bg-primary/10",
                  isClickable && !isActive && "hover:bg-muted",
                  !isClickable && "cursor-not-allowed opacity-50"
                )}
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    isCompleted &&
                      "border-primary bg-primary text-primary-foreground",
                    isActive && "border-primary bg-primary/10 text-primary",
                    !isCompleted &&
                      !isActive &&
                      "border-border bg-background text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="size-5" />
                  ) : (
                    <Icon className="size-5" />
                  )}
                </span>

                <div className="hidden min-w-0 sm:block">
                  <p
                    className={cn(
                      "truncate text-sm font-medium",
                      isActive
                        ? "text-primary"
                        : isCompleted
                          ? "text-foreground"
                          : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </button>

              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-1 hidden h-0.5 w-8 shrink-0 sm:block",
                    idx < currentIdx ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
