"use client"

import { useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, Pencil, Plus, Settings2, Trash2 } from "lucide-react"
import EmptyState from "@/components/custom/EmptyState"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useResultSchemes } from "../../hooks/use-results"
import {
  useDeleteScheme,
  useDeleteSchemeScale,
} from "../../hooks/use-results-mutations"
import { toResultsApiError } from "../../lib/results-errors"
import { ScaleFormDialog } from "./scale-form-dialog"
import { SchemeFormDialog } from "./scheme-form-dialog"
import { fmtScore } from "./format"
import type { ResultGradingScheme, SchemeGradeScale } from "../../types"

const TYPE_LABEL = {
  CREDIT_WEIGHTED_GPA: "Credit-weighted GPA",
  SIMPLE_AVERAGE: "Simple average",
  PASS_FAIL: "Pass / fail",
} as const

interface GradingSchemesManagerProps {
  majorProgramId: number | null
  majorPrograms: { id: number; name: string }[]
  canManage: boolean
}

export function GradingSchemesManager({
  majorProgramId,
  majorPrograms,
  canManage,
}: GradingSchemesManagerProps) {
  const schemes = useResultSchemes(majorProgramId)
  const deleteScheme = useDeleteScheme()
  const deleteScale = useDeleteSchemeScale()
  const [editing, setEditing] = useState<{
    scheme: ResultGradingScheme | null
  } | null>(null)
  const [scaleEdit, setScaleEdit] = useState<{
    scheme: ResultGradingScheme
    scale: SchemeGradeScale | null
  } | null>(null)

  const onError = (error: Error) =>
    toast.error(toResultsApiError(error).message)
  const programName = (id: number | null | undefined) =>
    id == null
      ? "Institution template"
      : (majorPrograms.find((m) => m.id === id)?.name ?? `Major program #${id}`)

  if (schemes.isLoading)
    return (
      <div className="h-40 animate-pulse rounded-2xl bg-muted/40" aria-busy />
    )
  if (schemes.isError)
    return (
      <EmptyState
        icon={Settings2}
        title="Couldn't load grading schemes"
        description={schemes.error.message}
      />
    )

  const list = schemes.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-2xl text-xs text-muted-foreground">
          A program&apos;s own scheme overrides its major program&apos;s
          default. CA and exam weights come from each course&apos;s Moodle
          gradebook first; a scheme&apos;s weights are only the fallback for
          courses with none. Grade bands must cover 0–100 with no gaps or
          overlaps.
        </p>
        {canManage && (
          <Button size="sm" onClick={() => setEditing({ scheme: null })}>
            <Plus className="size-4" aria-hidden /> New scheme
          </Button>
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={Settings2}
          title="No grading schemes yet"
          description="Create a scheme, then set it as a major program's default in Result policies."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((scheme) => {
            const scales = [...(scheme.gradeScales ?? [])].sort(
              (a, b) => b.minScore - a.minScore
            )
            return (
              <article
                key={scheme.id}
                className="space-y-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">
                      {scheme.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {TYPE_LABEL[scheme.schemeType]} ·{" "}
                      {programName(scheme.majorProgramId)}
                      {!scheme.isActive && " · Inactive"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {scheme.schemeType === "PASS_FAIL"
                        ? `Pass mark ${fmtScore(scheme.passMark)}`
                        : scheme.caWeightPercent == null &&
                            scheme.examWeightPercent == null
                          ? "No fallback weights (uses Moodle's)"
                          : `Fallback weights: CA ${fmtScore(scheme.caWeightPercent)}% · Exam ${fmtScore(scheme.examWeightPercent)}%`}
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Edit ${scheme.name}`}
                        onClick={() => setEditing({ scheme })}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Delete ${scheme.name}`}
                        onClick={() => {
                          if (
                            !window.confirm(
                              `Delete "${scheme.name}"? This fails if any grade uses it.`
                            )
                          )
                            return
                          deleteScheme.mutate(scheme.id, {
                            onSuccess: () => toast.success("Scheme deleted."),
                            onError,
                          })
                        }}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* The server's own C4 validity check. An invalid scheme can't
                    be a policy default or program override, and rows graded
                    on it are flagged "No grading scheme". */}
                {!scheme.isValid && (
                  <div
                    role="alert"
                    className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-800 dark:text-amber-200"
                  >
                    <p className="flex items-center gap-1.5 font-semibold">
                      <AlertTriangle className="size-3 shrink-0" aria-hidden />
                      The server reports problems with this scheme:
                    </p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5">
                      {scheme.problems.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                    <p className="mt-1.5 text-amber-800/80 dark:text-amber-200/80">
                      Weights are a fallback: courses whose Moodle gradebook
                      weights its CA and EXAM categories don&apos;t need them.
                      Until the server supports that (contract v1.1), it still
                      reports missing weights here.
                    </p>
                  </div>
                )}

                <table className="w-full text-xs">
                  <caption className="sr-only">
                    {scheme.name} grade bands
                  </caption>
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th scope="col" className="py-1.5">
                        Grade
                      </th>
                      <th scope="col" className="py-1.5">
                        Range
                      </th>
                      <th scope="col" className="py-1.5 text-right">
                        Point
                      </th>
                      {canManage && (
                        <th scope="col">
                          <span className="sr-only">Actions</span>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {scales.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-3 text-muted-foreground">
                          No bands yet.
                        </td>
                      </tr>
                    )}
                    {scales.map((s) => (
                      <tr
                        key={s.id}
                        className="border-b border-border/40 last:border-0"
                      >
                        <td className="py-1.5 font-semibold">{s.grade}</td>
                        <td className="py-1.5 tabular-nums">
                          {fmtScore(s.minScore)}–{fmtScore(s.maxScore)}
                        </td>
                        <td className="py-1.5 text-right tabular-nums">
                          {fmtScore(s.gradePoint)}
                        </td>
                        {canManage && (
                          <td className="py-1.5 text-right">
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              aria-label={`Edit band ${s.grade}`}
                              onClick={() => setScaleEdit({ scheme, scale: s })}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              aria-label={`Delete band ${s.grade}`}
                              onClick={() =>
                                deleteScale.mutate(
                                  { schemeId: scheme.id, scaleId: s.id },
                                  {
                                    onSuccess: () =>
                                      toast.success("Band deleted."),
                                    onError,
                                  }
                                )
                              }
                            >
                              <Trash2 className="text-destructive" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {canManage && (
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => setScaleEdit({ scheme, scale: null })}
                  >
                    <Plus aria-hidden /> Add band
                  </Button>
                )}
              </article>
            )
          })}
        </div>
      )}

      <SchemeFormDialog
        open={editing != null}
        onClose={() => setEditing(null)}
        scheme={editing?.scheme ?? null}
        majorPrograms={majorPrograms}
        defaultMajorProgramId={majorProgramId}
      />
      <ScaleFormDialog
        scheme={scaleEdit?.scheme ?? null}
        scale={scaleEdit?.scale ?? null}
        onClose={() => setScaleEdit(null)}
      />
      <span className={cn("sr-only")} aria-live="polite">
        {deleteScheme.isPending || deleteScale.isPending ? "Deleting…" : ""}
      </span>
    </div>
  )
}
