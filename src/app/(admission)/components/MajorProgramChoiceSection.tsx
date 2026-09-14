"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { Building2, CheckCircle2, Loader2 } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { MajorProgram } from "@/types/school"
import type { StepSectionProps } from "../types/admission"

interface MajorProgramChoiceSectionProps extends StepSectionProps {
  majorProgramOptions: MajorProgram[]
  onChoose: (majorProgramId: number) => Promise<void>
  isSubmitting: boolean
}

// Major-Program Scoping — sandbox/dynamic-admission/. The first real
// decision an applicant makes, before Program Choice — picking a Degree,
// Part-Time, or Certificate program (etc.) so the next stage's own picker
// can narrow to just that major program's programs, instead of listing
// every program in the institution together.
export function MajorProgramChoiceSection({
  student,
  majorProgramOptions,
  onChoose,
  isSubmitting,
}: MajorProgramChoiceSectionProps) {
  const [selected, setSelected] = useState<number | null>(
    student.major_program_id ?? null
  )
  const options = majorProgramOptions.filter((mp) => mp.isActive)
  const noOptions = options.length === 0

  const handleSubmit = async () => {
    if (!selected) {
      toast.error("Please select a major program to continue.")
      return
    }
    try {
      await onChoose(selected)
      toast.success("Major program saved")
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Couldn't save your major program. Please try again."
      )
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Card className="relative overflow-hidden border-border/50 shadow-lg">
        <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary/40 via-primary to-primary/40" />

        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 dark:bg-primary/20">
              <Building2 className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">
                Choose Your Major Program
              </CardTitle>
              <CardDescription>
                Select which major program you&apos;re applying under before
                choosing a specific program.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {noOptions ? (
            <p className="text-sm text-muted-foreground">
              No major programs have been set up for this institution yet.
              Please contact the admissions office.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {options.map((mp) => {
                const isSelected = selected === mp.id
                return (
                  <button
                    key={mp.id}
                    type="button"
                    onClick={() => setSelected(mp.id)}
                    aria-pressed={isSelected}
                    className={cn(
                      "relative flex flex-col items-start gap-3 rounded-xl border-2 p-5 text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/30 hover:bg-muted/30"
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-lg p-2.5",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <Building2 className="size-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{mp.name}</p>
                      {mp.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {mp.description}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <div className="absolute top-4 right-4 rounded-full bg-primary p-0.5">
                        <CheckCircle2 className="size-3.5 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!selected || isSubmitting || noOptions}
            className="btn-glow w-full gap-2"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save and continue"
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
