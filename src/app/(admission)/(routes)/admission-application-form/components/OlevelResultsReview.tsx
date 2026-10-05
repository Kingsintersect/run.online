"use client"

/* ------------------------------------------------------------------ */
/*  O'level results on the Review step — sandbox/olevel-results/       */
/* ------------------------------------------------------------------ */

import { CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { olevelSubjectLabel } from "@/lib/admission-catalog"
import type { AdmissionFormField } from "@/types/admissionConfig"
import type { DynamicFieldValue } from "../lib/dynamic-form"
import {
  describeOlevelRule,
  isCreditGrade,
  joinSubjectLabels,
  readOlevelRules,
  sittingName,
  summarizeOlevel,
  toOlevelPayload,
  type OlevelContext,
} from "../lib/olevel-results"

interface OlevelResultsReviewProps {
  field: AdmissionFormField
  value: DynamicFieldValue
  context: OlevelContext
}

export function OlevelResultsReview({
  field,
  value,
  context,
}: OlevelResultsReviewProps) {
  const rules = readOlevelRules(field)
  // Exactly what will be submitted: sittings in force, complete rows only.
  const sittings = toOlevelPayload(value, context)

  if (sittings.length === 0) {
    return (
      <div className="flex justify-between gap-4 border-b border-dashed py-2 last:border-0">
        <span className="text-sm text-muted-foreground">{field.label}</span>
        <span className="text-right text-sm text-muted-foreground italic">
          {context.awaitingResult ? "Awaiting results" : "Not entered"}
        </span>
      </div>
    )
  }

  const summary = summarizeOlevel(sittings, rules)

  return (
    <div className="space-y-3 border-b border-dashed py-3 last:border-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{field.label}</span>
        {!context.awaitingResult && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium",
              summary.meetsRule
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-amber-700 dark:text-amber-400"
            )}
            title={describeOlevelRule(rules)}
          >
            {summary.meetsRule ? (
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
            ) : (
              <AlertCircle className="size-3.5" aria-hidden="true" />
            )}
            {summary.credits} credit{summary.credits === 1 ? "" : "s"}
            {summary.meetsRule && rules.requiredSubjects.length > 0
              ? ` incl. ${joinSubjectLabels(rules.requiredSubjects)}`
              : ""}
            {!summary.meetsRule && ` of ${rules.minCredits} needed`}
          </span>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {sittings.map((sitting) => (
          <div
            key={sitting.sitting}
            className="rounded-lg border border-border bg-muted/30 p-3"
          >
            <p className="text-xs font-semibold text-foreground">
              {sittingName(sitting.sitting - 1)}
            </p>
            <p className="mb-2 text-xs text-muted-foreground">
              {sitting.exam_type} {sitting.exam_year} · No.{" "}
              {sitting.exam_number}
            </p>
            <table className="w-full text-sm">
              <caption className="sr-only">
                {sittingName(sitting.sitting - 1)} subjects and grades
              </caption>
              <thead className="sr-only">
                <tr>
                  <th scope="col">Subject</th>
                  <th scope="col">Grade</th>
                </tr>
              </thead>
              <tbody>
                {sitting.subjects.map((row) => (
                  <tr key={row.subject}>
                    <td className="py-0.5 pr-2">
                      {olevelSubjectLabel(row.subject)}
                    </td>
                    <td
                      className={cn(
                        "py-0.5 text-right font-medium",
                        isCreditGrade(row.grade)
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-muted-foreground"
                      )}
                    >
                      {row.grade}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}
