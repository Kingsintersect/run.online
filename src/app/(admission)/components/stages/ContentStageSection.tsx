"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { BookOpen, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { MarkdownContent } from "../MarkdownContent"
import type { ResolvedStageOf } from "../../types/admission-stages"

interface ContentStageSectionProps {
  stage: ResolvedStageOf<"CONTENT">
  onAcknowledge: () => Promise<void>
  isSubmitting: boolean
}

/** A CONTENT stage — instructions or a notice, optionally confirmed. */
export function ContentStageSection({
  stage,
  onAcknowledge,
  isSubmitting,
}: ContentStageSectionProps) {
  const { title, body, requireAcknowledgement, acknowledgementLabel } =
    stage.config
  const [confirmed, setConfirmed] = useState(false)
  const canContinue = !requireAcknowledgement || confirmed

  const handleContinue = async () => {
    try {
      await onAcknowledge()
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Couldn't continue. Please try again."
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
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 dark:bg-primary/20">
              <BookOpen className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{title || stage.label}</CardTitle>
              {stage.description && (
                <CardDescription>{stage.description}</CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <MarkdownContent markdown={body} />

          {requireAcknowledgement && (
            <div className="flex items-start gap-3 rounded-xl border border-border p-4">
              <Checkbox
                id={`ack-${stage.key}`}
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(checked === true)}
                disabled={isSubmitting}
              />
              <Label
                htmlFor={`ack-${stage.key}`}
                className="text-sm leading-snug"
              >
                {acknowledgementLabel || "I have read and understood this"}
              </Label>
            </div>
          )}

          <Button
            onClick={handleContinue}
            disabled={!canContinue || isSubmitting}
            className="btn-glow w-full gap-2"
            size="lg"
          >
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Continue
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
