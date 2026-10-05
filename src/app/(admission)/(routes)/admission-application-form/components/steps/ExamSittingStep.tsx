"use client"

import { motion } from "framer-motion"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" as const },
}

/**
 * Exam type, year and number are now asked once per sitting by the O'level
 * results grid (sandbox/olevel-results/), which buildWizardSteps places on
 * this step (lib/dynamic-form.ts, withOlevelFallback) and which also fills the
 * legacy flat sitting values the submit endpoint reads. So this hand-built
 * step is just the heading; the grid renders below it as one of the step's
 * fields, and shows its own note while results are awaited.
 */
export default function ExamSittingStep() {
  return (
    <motion.div className="space-y-1" {...fadeInUp}>
      <h3 className="text-lg font-semibold">Exam Sitting Details</h3>
      <p className="text-sm text-muted-foreground">
        Your O-Level examination sittings, with the subjects and grades from
        each.
      </p>
    </motion.div>
  )
}
