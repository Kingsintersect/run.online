"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { ArrowLeft, ArrowRight, Send, Save, Eraser, Trash2 } from "lucide-react"
import { FormStep } from "../types/form-types"

interface FormNavigationProps {
  currentStep: FormStep
  currentStepPosition: number
  totalSteps: number
  isSubmitting: boolean
  onNext: () => void
  onPrev: () => void
  onSubmit: () => void
  onSave: () => void
  onClearStep: () => void
  onClearForm: () => void
}

export default function FormNavigation({
  currentStep,
  currentStepPosition,
  totalSteps,
  isSubmitting,
  onNext,
  onPrev,
  onSubmit,
  onSave,
  onClearStep,
  onClearForm,
}: FormNavigationProps) {
  const isFirst = currentStep === FormStep.PERSONAL_INFO
  const isLast = currentStep === FormStep.REVIEW
  const [clearStepOpen, setClearStepOpen] = useState(false)
  const [clearFormOpen, setClearFormOpen] = useState(false)

  return (
    <motion.div
      className="flex flex-wrap items-center justify-between gap-3 border-t pt-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center gap-2">
        {!isFirst && (
          <Button
            type="button"
            variant="outline"
            onClick={onPrev}
            disabled={isSubmitting}
          >
            <ArrowLeft className="mr-2 size-4" />
            Previous
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setClearStepOpen(true)}
          disabled={isSubmitting}
          title="Clear this step"
          className="text-muted-foreground hover:text-destructive"
        >
          <Eraser className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setClearFormOpen(true)}
          disabled={isSubmitting}
          title="Clear entire form"
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onSave}
          disabled={isSubmitting}
          className="text-muted-foreground"
        >
          <Save className="mr-2 size-4" />
          Save Draft
        </Button>

        {isLast ? (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="min-w-35"
          >
            {isSubmitting ? (
              <motion.div
                className="size-4 rounded-full border-2 border-primary-foreground border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            ) : (
              <>
                <Send className="mr-2 size-4" />
                Submit Application
              </>
            )}
          </Button>
        ) : (
          <Button type="button" onClick={onNext} disabled={isSubmitting}>
            Next
            <ArrowRight className="ml-2 size-4" />
          </Button>
        )}
      </div>

      {/* Progress text */}
      <span className="sr-only">
        Step {currentStepPosition + 1} of {totalSteps}
      </span>

      <ConfirmDialog
        open={clearStepOpen}
        onOpenChange={setClearStepOpen}
        onConfirm={() => {
          onClearStep()
          setClearStepOpen(false)
        }}
        title="Clear this step?"
        description="This will erase everything you've entered on this step and reset it to its defaults. Other steps are not affected."
        confirmLabel="Clear Step"
      />
      <ConfirmDialog
        open={clearFormOpen}
        onOpenChange={setClearFormOpen}
        onConfirm={() => {
          onClearForm()
          setClearFormOpen(false)
        }}
        title="Clear the entire form?"
        description="This will permanently erase all saved progress across every step, including uploaded documents, and start you over from the beginning. This can't be undone."
        confirmLabel="Clear Form"
      />
    </motion.div>
  )
}
