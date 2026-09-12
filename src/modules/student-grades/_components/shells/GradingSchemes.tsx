"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Layers, Loader2, Plus, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import EmptyState from "@/components/custom/EmptyState"
import StatusBadge from "@/components/custom/StatusBadge"
import { useGradingSchemes } from "../../hooks/use-grading-schemes"
import { GradingSchemeFormDialog } from "../grading-schemes/GradingSchemeFormDialog"
import { AddScaleDialog } from "../grading-schemes/AddScaleDialog"
import { GradeBandsSection } from "../grading-schemes/GradeBandsSection"
import type { GradingScheme, GradingSchemeType } from "../../types/grades.types"

interface GradingSchemesPageProps {
  canManage?: boolean
}

const SCHEME_TYPE_BADGE: Record<
  GradingSchemeType,
  { label: string; variant: "success" | "info" | "purple" }
> = {
  CREDIT_WEIGHTED_GPA: { label: "Credit-Weighted GPA", variant: "success" },
  SIMPLE_AVERAGE: { label: "Simple Average", variant: "info" },
  PASS_FAIL: { label: "Pass / Fail", variant: "purple" },
}

// Admin config screen for pluggable grading schemes — see
// sandbox/schema-moodel-sync-refactor/{README,api-v2}.md §"Grading
// Schemes". A Program opts into a scheme via `gradingSchemeId`; leaving it
// unset keeps today's institution-default GPA behavior unchanged.
export default function GradingSchemesPage({
  canManage = false,
}: GradingSchemesPageProps) {
  const { data, isLoading } = useGradingSchemes()
  const [creating, setCreating] = useState(false)
  const [addingScaleTo, setAddingScaleTo] = useState<GradingScheme | null>(null)

  const schemes = data ?? []

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-start justify-between gap-3"
      >
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Grading Schemes
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure how each Program is graded — credit-weighted GPA, a
            WAEC-style simple average, or pass/fail.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" data-icon="inline-start" /> New Scheme
          </Button>
        )}
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : schemes.length === 0 ? (
        <EmptyState
          icon={Settings2}
          title="No grading schemes yet"
          description="The institution default GPA scheme applies until you add one — create a scheme to support a non-degree program type."
          action={
            canManage ? (
              <Button onClick={() => setCreating(true)}>
                <Plus className="size-4" data-icon="inline-start" />
                New Scheme
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {schemes.map((scheme, index) => (
            <motion.div
              key={scheme.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card>
                <CardContent className="space-y-3 pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {scheme.name}
                      </p>
                      <StatusBadge
                        {...SCHEME_TYPE_BADGE[scheme.schemeType]}
                        dot
                      />
                    </div>
                    {!scheme.isActive && (
                      <StatusBadge label="Inactive" variant="destructive" dot />
                    )}
                  </div>

                  {scheme.schemeType !== "CREDIT_WEIGHTED_GPA" && (
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {scheme.passMark !== null && (
                        <span>Pass mark: {scheme.passMark}</span>
                      )}
                      {scheme.caWeightPercent !== null && (
                        <span>CA {scheme.caWeightPercent}%</span>
                      )}
                      {scheme.examWeightPercent !== null && (
                        <span>Exam {scheme.examWeightPercent}%</span>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Layers size={12} /> Scales
                      </p>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => setAddingScaleTo(scheme)}
                        >
                          <Plus className="size-3" data-icon="inline-start" />{" "}
                          Add
                        </Button>
                      )}
                    </div>
                    {!scheme.gradeScales || scheme.gradeScales.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No scales yet.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {scheme.gradeScales.map((s) => (
                          <span
                            key={s.id}
                            className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-foreground"
                          >
                            {s.grade} ({s.minScore}–{s.maxScore})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <div className="border-t border-border pt-6">
        <GradeBandsSection canManage={canManage} />
      </div>

      <GradingSchemeFormDialog
        open={creating}
        onClose={() => setCreating(false)}
      />
      <AddScaleDialog
        scheme={addingScaleTo}
        onClose={() => setAddingScaleTo(null)}
      />
    </div>
  )
}
