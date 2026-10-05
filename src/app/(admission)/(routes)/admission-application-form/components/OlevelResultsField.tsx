"use client"

/* ------------------------------------------------------------------ */
/*  O'level results grid — sandbox/olevel-results/                     */
/*                                                                     */
/*  One card per sitting (exam type, year, exam number, then subject   */
/*  + grade rows), a live credit summary against the field's rule,      */
/*  and inline errors. Controlled: the caller owns the stored value.    */
/* ------------------------------------------------------------------ */

import { useId, useMemo, useState } from "react"
import { AlertCircle, CheckCircle2, Info, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  OLEVEL_EXAM_TYPES,
  OLEVEL_GRADES,
  OLEVEL_MAX_SITTINGS,
  OLEVEL_SUBJECTS,
  OLEVEL_SUBJECTS_PER_SITTING,
} from "@/lib/admission-catalog"
import type { AdmissionFormField } from "@/types/admissionConfig"
import type { DynamicFieldValue } from "../lib/dynamic-form"
import {
  describeOlevelRule,
  effectiveSittings,
  isBlankSitting,
  isCreditGrade,
  joinSubjectLabels,
  readOlevelRules,
  sittingName,
  summarizeOlevel,
  validateOlevelResults,
  type OlevelContext,
  type OlevelIssue,
  type OlevelIssuePart,
  type OlevelSitting,
} from "../lib/olevel-results"

interface OlevelResultsFieldProps {
  field: AdmissionFormField
  value: DynamicFieldValue
  onChange: (value: DynamicFieldValue) => void
  /** The form-level error — once set, every inline problem is shown. */
  error?: string
  disabled?: boolean
  context: OlevelContext
}

const EARLIEST_YEAR_SHOWN = 1980

export function OlevelResultsField({
  field,
  value,
  onChange,
  error,
  disabled,
  context,
}: OlevelResultsFieldProps) {
  const id = useId()
  const rules = readOlevelRules(field)
  const sittings = effectiveSittings(value, context, rules.requiredSubjects)
  const hasEntries = !sittings.every(isBlankSitting)
  const [showWhileAwaiting, setShowWhileAwaiting] = useState(false)
  const required = field.isRequired && !context.awaitingResult

  const years = useMemo(() => {
    const now = new Date().getFullYear()
    return Array.from({ length: now - EARLIEST_YEAR_SHOWN + 1 }, (_, i) =>
      String(now - i)
    )
  }, [])

  const issues = validateOlevelResults(sittings, rules, context, {
    required: field.isRequired,
  })
  const summary = summarizeOlevel(sittings, rules)
  // Before the applicant tries to continue, only show what's plainly wrong
  // already (a duplicate subject, a repeated exam number) — not every blank.
  const showAll = !!error
  const visibleIssue = (i: OlevelIssue) => showAll || i.immediate
  const issueAt = (
    sitting: number,
    row: number | null,
    part: OlevelIssuePart
  ): string | undefined =>
    issues.find(
      (i) =>
        i.sitting === sitting &&
        i.row === row &&
        i.part === part &&
        visibleIssue(i)
    )?.message
  const overallIssues = showAll ? issues.filter((i) => i.sitting === null) : []

  const write = (next: OlevelSitting[]) => onChange(next)
  const updateSitting = (index: number, patch: Partial<OlevelSitting>) =>
    write(sittings.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  const updateRow = (
    s: number,
    r: number,
    patch: Partial<OlevelSitting["subjects"][number]>
  ) =>
    updateSitting(s, {
      subjects: sittings[s].subjects.map((row, j) =>
        j === r ? { ...row, ...patch } : row
      ),
    })

  // Without a Result Type question, the applicant adds/removes the second sitting here.
  const canAddSitting =
    context.resultType === null &&
    sittings.length < Math.min(rules.maxSittings, OLEVEL_MAX_SITTINGS)

  const helpId = `${id}-help`
  const errorId = `${id}-error`

  if (context.awaitingResult && !hasEntries && !showWhileAwaiting) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">{field.label}</p>
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
          <Info className="mt-0.5 size-5 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
            <p>
              You&apos;re awaiting your results, so this isn&apos;t required
              now. You&apos;ll be asked for them once they&apos;re out.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => setShowWhileAwaiting(true)}
            >
              Add results I already have
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="space-y-4"
      aria-describedby={`${helpId}${error ? ` ${errorId}` : ""}`}
    >
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          {field.label}
          {required && (
            <span className="ml-1 text-destructive" aria-hidden="true">
              *
            </span>
          )}
        </p>
        <p id={helpId} className="text-xs text-muted-foreground">
          {describeOlevelRule(rules)}
          {field.helpText ? ` ${field.helpText}` : ""}
        </p>
      </div>

      {!context.awaitingResult && (
        <CreditSummary
          credits={summary.credits}
          minCredits={rules.minCredits}
          requiredSubjects={rules.requiredSubjects}
          missingRequired={summary.missingRequired}
          meetsRule={summary.meetsRule}
        />
      )}

      {sittings.map((sitting, s) => {
        const rowsUsed = new Set(sitting.subjects.map((r) => r.subject))
        const subjectsIssue = issueAt(s, null, "subjects")
        return (
          <fieldset
            key={s}
            className={cn(
              "space-y-4 rounded-xl border p-4",
              s === 0
                ? "border-border"
                : "border-primary/20 bg-primary/5 dark:bg-primary/10"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <legend className="text-sm font-semibold text-foreground">
                {sittingName(s)}
              </legend>
              {s > 0 && context.resultType === null && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-destructive hover:text-destructive"
                  disabled={disabled}
                  onClick={() => write(sittings.filter((_, i) => i !== s))}
                >
                  <X className="size-3.5" /> Remove sitting
                </Button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <HeaderSelect
                id={`${id}-s${s}-type`}
                label="Exam type"
                value={sitting.exam_type}
                options={OLEVEL_EXAM_TYPES.map((t) => ({ value: t, label: t }))}
                placeholder="Select exam…"
                error={issueAt(s, null, "exam_type")}
                disabled={disabled}
                onChange={(v) => updateSitting(s, { exam_type: v })}
              />
              <HeaderSelect
                id={`${id}-s${s}-year`}
                label="Year"
                value={sitting.exam_year}
                options={years.map((y) => ({ value: y, label: y }))}
                placeholder="Select year…"
                error={issueAt(s, null, "exam_year")}
                disabled={disabled}
                onChange={(v) => updateSitting(s, { exam_year: v })}
              />
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-s${s}-number`}>Exam number</Label>
                <Input
                  id={`${id}-s${s}-number`}
                  value={sitting.exam_number}
                  disabled={disabled}
                  placeholder="e.g. 4250101001"
                  maxLength={20}
                  aria-invalid={!!issueAt(s, null, "exam_number")}
                  onChange={(e) =>
                    updateSitting(s, { exam_number: e.target.value })
                  }
                />
                <InlineError message={issueAt(s, null, "exam_number")} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Subjects and grades</span>
                <span>
                  {sitting.subjects.filter((r) => r.subject && r.grade).length}{" "}
                  of {OLEVEL_SUBJECTS_PER_SITTING.min}–
                  {OLEVEL_SUBJECTS_PER_SITTING.max}
                </span>
              </div>
              <ul className="space-y-2">
                {sitting.subjects.map((row, r) => {
                  const subjectError = issueAt(s, r, "subject")
                  const gradeError = issueAt(s, r, "grade")
                  return (
                    <li key={r} className="space-y-1">
                      <div className="flex items-start gap-2">
                        <Select
                          value={row.subject || undefined}
                          onValueChange={(v) => updateRow(s, r, { subject: v })}
                          disabled={disabled}
                        >
                          <SelectTrigger
                            className="min-w-0 flex-1"
                            aria-label={`${sittingName(s)} subject ${r + 1}`}
                            aria-invalid={!!subjectError}
                          >
                            <SelectValue placeholder="Select subject…" />
                          </SelectTrigger>
                          <SelectContent>
                            {OLEVEL_SUBJECTS.map((subject) => (
                              <SelectItem
                                key={subject.code}
                                value={subject.code}
                                disabled={
                                  subject.code !== row.subject &&
                                  rowsUsed.has(subject.code)
                                }
                              >
                                {subject.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={row.grade || undefined}
                          onValueChange={(v) => updateRow(s, r, { grade: v })}
                          disabled={disabled}
                        >
                          <SelectTrigger
                            className={cn(
                              "w-24 shrink-0",
                              row.grade &&
                                (isCreditGrade(row.grade)
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : "text-amber-700 dark:text-amber-400")
                            )}
                            aria-label={`${sittingName(s)} grade ${r + 1}`}
                            aria-invalid={!!gradeError}
                          >
                            <SelectValue placeholder="Grade" />
                          </SelectTrigger>
                          <SelectContent>
                            {OLEVEL_GRADES.map((grade) => (
                              <SelectItem key={grade} value={grade}>
                                {grade}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="mt-1"
                          disabled={disabled}
                          onClick={() =>
                            updateSitting(s, {
                              subjects: sitting.subjects.filter(
                                (_, j) => j !== r
                              ),
                            })
                          }
                          aria-label={`Remove ${sittingName(s).toLowerCase()} row ${r + 1}`}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                      <InlineError message={subjectError ?? gradeError} />
                    </li>
                  )
                })}
              </ul>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={
                  disabled ||
                  sitting.subjects.length >= OLEVEL_SUBJECTS_PER_SITTING.max
                }
                onClick={() =>
                  updateSitting(s, {
                    subjects: [...sitting.subjects, { subject: "", grade: "" }],
                  })
                }
              >
                <Plus size={13} /> Add subject
              </Button>
              <InlineError message={subjectsIssue} />
            </div>
          </fieldset>
        )
      })}

      {canAddSitting && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={disabled}
          onClick={() =>
            write([
              ...sittings,
              {
                exam_type: "",
                exam_year: "",
                exam_number: "",
                subjects: [],
              },
            ])
          }
        >
          <Plus size={13} /> Add a second sitting
        </Button>
      )}

      {overallIssues.length > 0 && (
        <ul className="space-y-1">
          {overallIssues.map((issue) => (
            <li key={issue.message}>
              <InlineError message={issue.message} />
            </li>
          ))}
        </ul>
      )}
      {error && overallIssues.length === 0 && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

function CreditSummary({
  credits,
  minCredits,
  requiredSubjects,
  missingRequired,
  meetsRule,
}: {
  credits: number
  minCredits: number
  requiredSubjects: string[]
  missingRequired: string[]
  meetsRule: boolean
}) {
  const incl = requiredSubjects.length
    ? ` incl. ${joinSubjectLabels(requiredSubjects)}`
    : ""
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
        meetsRule
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
          : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
      )}
    >
      {meetsRule ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      ) : (
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      )}
      <p>
        {meetsRule ? (
          <>
            {credits} credit{credits === 1 ? "" : "s"}
            {incl} ✓
          </>
        ) : (
          <>
            {credits} of {minCredits} credits
            {missingRequired.length > 0 &&
              ` · still needs a credit in ${joinSubjectLabels(missingRequired)}`}
          </>
        )}
      </p>
    </div>
  )
}

function HeaderSelect({
  id,
  label,
  value,
  options,
  placeholder,
  error,
  disabled,
  onChange,
}: {
  id: string
  label: string
  value: string
  options: { value: string; label: string }[]
  placeholder: string
  error?: string
  disabled?: boolean
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value || undefined}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full" aria-invalid={!!error}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <InlineError message={error} />
    </div>
  )
}

function InlineError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="text-xs text-destructive">
      {message}
    </p>
  )
}
