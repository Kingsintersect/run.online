"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { getStepIcon } from "@/lib/admissionStepIcons"
import type { ResolvedStage } from "../types/admission-stages"

interface AdmissionStepIndicatorProps {
  stages: Pick<
    ResolvedStage,
    "key" | "label" | "icon" | "status" | "awaitingBackend"
  >[]
  currentStageKey: string | null
}

export function AdmissionStepIndicator({
  stages,
  currentStageKey,
}: AdmissionStepIndicatorProps) {
  return (
    <nav aria-label="Admission stages" className="w-full overflow-x-auto py-2">
      <ol className="flex min-w-[600px] items-center justify-between gap-1 px-2">
        {stages.map((stage, idx) => {
          const isCompleted = stage.status === "COMPLETED"
          const isBlocked = stage.status === "BLOCKED"
          const isActive = stage.key === currentStageKey
          const Icon = getStepIcon(stage.icon)

          return (
            <li key={stage.key} className="flex flex-1 items-center">
              <div
                className="flex flex-col items-center gap-1.5"
                aria-current={isActive ? "step" : undefined}
              >
                <motion.div
                  initial={false}
                  animate={{
                    scale: isActive ? 1.15 : 1,
                    backgroundColor: isBlocked
                      ? "var(--color-destructive)"
                      : isCompleted || isActive
                        ? "var(--color-primary)"
                        : "var(--color-muted)",
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={cn(
                    "relative flex size-10 items-center justify-center rounded-full transition-shadow",
                    isActive && "shadow-lg shadow-primary/30",
                    isCompleted && "shadow-md shadow-primary/20",
                    stage.awaitingBackend && !isCompleted && "opacity-60"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 transition-colors",
                      isCompleted || isActive || isBlocked
                        ? "text-primary-foreground"
                        : "text-muted-foreground"
                    )}
                  />
                  {isActive && !isBlocked && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-primary"
                      initial={{ scale: 1, opacity: 0.6 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeOut",
                      }}
                    />
                  )}
                </motion.div>

                <span
                  className={cn(
                    "max-w-[80px] text-center text-[10px] leading-tight font-medium",
                    isBlocked
                      ? "text-destructive"
                      : isCompleted
                        ? "text-primary"
                        : isActive
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground"
                  )}
                >
                  {stage.label}
                  {stage.awaitingBackend && !isCompleted && (
                    <span className="block text-[9px] font-normal text-muted-foreground">
                      opens soon
                    </span>
                  )}
                </span>
              </div>

              {idx < stages.length - 1 && (
                <div className="relative mx-1 h-[2px] flex-1">
                  <div className="absolute inset-0 rounded-full bg-muted" />
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-primary"
                    initial={{ width: "0%" }}
                    animate={{
                      width: isCompleted ? "100%" : isActive ? "50%" : "0%",
                    }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
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
