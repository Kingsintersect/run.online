"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"
import type { WizardStep } from "../lib/dynamic-form"

interface FormStepIndicatorProps {
  steps: Pick<WizardStep, "id" | "title" | "icon">[]
  currentStepId: string
  completedSteps: Set<string>
  onStepClick: (stepId: string) => void
}

export default function FormStepIndicator({
  steps,
  currentStepId,
  completedSteps,
  onStepClick,
}: FormStepIndicatorProps) {
  return (
    <nav aria-label="Application steps" className="w-full overflow-x-auto py-4">
      <ol className="flex min-w-max items-center justify-center gap-1 px-4">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(step.id)
          const isCurrent = currentStepId === step.id
          const prevStepId = index > 0 ? steps[index - 1].id : undefined
          const isAccessible =
            isCompleted ||
            isCurrent ||
            (prevStepId !== undefined && completedSteps.has(prevStepId))
          const Icon = step.icon

          return (
            <li key={step.id} className="flex items-center">
              <motion.button
                type="button"
                onClick={() => isAccessible && onStepClick(step.id)}
                disabled={!isAccessible}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`${step.title}${isCompleted ? " (complete)" : ""}`}
                className={cn(
                  "group relative flex flex-col items-center gap-1.5",
                  isAccessible ? "cursor-pointer" : "cursor-not-allowed"
                )}
                whileHover={isAccessible ? { scale: 1.05 } : undefined}
                whileTap={isAccessible ? { scale: 0.95 } : undefined}
              >
                <motion.div
                  className={cn(
                    "relative flex size-10 items-center justify-center rounded-full border-2 transition-colors",
                    isCompleted &&
                      "border-primary bg-primary text-primary-foreground",
                    isCurrent &&
                      !isCompleted &&
                      "border-primary bg-primary/10 text-primary",
                    !isCurrent &&
                      !isCompleted &&
                      "border-muted-foreground/30 text-muted-foreground/50"
                  )}
                  animate={isCurrent ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                  transition={
                    isCurrent
                      ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
                      : undefined
                  }
                >
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Check className="size-5" />
                    </motion.div>
                  ) : (
                    <Icon className="size-4" />
                  )}

                  {isCurrent && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-primary"
                      animate={{ scale: [1, 1.3, 1.3], opacity: [0.6, 0, 0] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeOut",
                      }}
                    />
                  )}
                </motion.div>

                <span
                  className={cn(
                    "max-w-20 text-center text-[10px] leading-tight",
                    isCurrent && "font-semibold text-primary",
                    isCompleted && "font-medium text-primary",
                    !isCurrent && !isCompleted && "text-muted-foreground/60"
                  )}
                >
                  {step.title}
                </span>
              </motion.button>

              {index < steps.length - 1 && (
                <div className="relative mx-1 h-0.5 w-8 bg-muted-foreground/20 sm:w-12">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-primary"
                    initial={{ width: "0%" }}
                    animate={{ width: isCompleted ? "100%" : "0%" }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
