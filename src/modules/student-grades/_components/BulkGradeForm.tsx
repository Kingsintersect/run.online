"use client"

import { useState, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import {
  BookOpen,
  ChevronDown,
  Send,
  Check,
  AlertCircle,
  Loader2,
  Download,
} from "lucide-react"
import { gradesService } from "../services/grades.service"
import { useBulkCreateGrades } from "../hooks/use-grades-mutations"
import { courseOfferingQueryOptions } from "@/services/courseOfferingApi"
import { useCaPreview } from "@/modules/moodle-sync/hooks/use-sync-assessments"
import type { BulkGradeItemDto } from "../types/grades.types"
import type { CourseOffering } from "@/types/school"

interface ScoreEntry {
  studentId: number
  studentName: string
  studentMatric: string
  existingStatus: string | null
  caScore: string
  examScore: string
  locked: boolean
}

interface SubmitResult {
  saved: number
  errors: string[]
}

export function BulkGradeForm() {
  const [selectedOffering, setSelectedOffering] =
    useState<CourseOffering | null>(null)
  const [entries, setEntries] = useState<ScoreEntry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [caPulledCount, setCaPulledCount] = useState<number | null>(null)
  const bulkCreateMutation = useBulkCreateGrades()

  // Real course offerings (course + semester + session already resolved
  // server-side) — replaces the previous mock Course/Semester picker pair.
  // A Grade row is keyed by (studentId, courseId, semesterId), and an
  // offering embeds both, so picking one offering supplies everything the
  // real bulk-create endpoint needs.
  const { data: offeringsRes, isLoading: offeringsLoading } = useQuery(
    courseOfferingQueryOptions.list()
  )
  const offerings = offeringsRes?.data ?? []

  const caPreviewMutation = useCaPreview()

  const loadStudents = useCallback(async () => {
    if (!selectedOffering) return
    setLoadingStudents(true)
    setResult(null)
    setCaPulledCount(null)
    try {
      const existing = await gradesService.getGradesForPublish({
        academicYearId: null,
        semesterId: String(selectedOffering.semester_id),
        programId: null,
        courseId: selectedOffering.course_id,
      })
      const loadedEntries: ScoreEntry[] = existing.map((g) => ({
        studentId: g.studentId,
        studentName: g.studentName,
        studentMatric: g.studentMatric,
        existingStatus: g.status,
        caScore: g.caScore?.toString() ?? "",
        examScore: g.examScore?.toString() ?? "",
        locked: g.status === "APPROVED" || g.status === "PUBLISHED",
      }))
      setEntries(loadedEntries)
      setLoaded(true)
    } finally {
      setLoadingStudents(false)
    }
  }, [selectedOffering])

  const updateScore = (
    idx: number,
    field: "caScore" | "examScore",
    value: string
  ) => {
    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e))
    )
  }

  // Moodle → Grade.caScore bridge: pulls the computed CA preview for this
  // offering/semester and pre-fills each matching, unlocked student's CA
  // field — still editable, still requires the lecturer to hit Save.
  const handlePullCaFromMoodle = async () => {
    if (!selectedOffering) return
    try {
      const preview = await caPreviewMutation.mutateAsync({
        offeringId: selectedOffering.id,
        semesterId: selectedOffering.semester_id,
      })
      const byStudentId = new Map(
        preview.students.map((s) => [s.studentId, s.computedCaScore])
      )
      let pulled = 0
      setEntries((prev) =>
        prev.map((e) => {
          if (e.locked || !byStudentId.has(e.studentId)) return e
          pulled += 1
          return { ...e, caScore: byStudentId.get(e.studentId)!.toString() }
        })
      )
      setCaPulledCount(pulled)
    } catch {
      // surfaced via caPreviewMutation.isError below
    }
  }

  const handleSubmit = async () => {
    if (!selectedOffering) return
    setResult(null)
    const editable = entries.filter((e) => !e.locked)
    const grades: BulkGradeItemDto[] = editable.map((e) => ({
      studentId: e.studentId,
      caScore: e.caScore ? Number(e.caScore) : undefined,
      examScore: e.examScore ? Number(e.examScore) : undefined,
    }))
    const response = await bulkCreateMutation.mutateAsync({
      courseId: selectedOffering.course_id,
      semesterId: selectedOffering.semester_id,
      grades,
    })
    setResult({
      saved: response.submitted,
      errors: response.errors.map(
        (e) => `Student #${e.studentId}: ${e.message}`
      ),
    })
  }

  const editableCount = entries.filter((e) => !e.locked).length

  return (
    <div className="space-y-6">
      {/* Selector */}
      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Select Course Offering
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Load students to begin entering grades
          </p>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Course Offering
          </label>
          <div className="relative">
            <select
              className="w-full appearance-none rounded-xl border border-border bg-background px-3 py-2.5 pr-8 text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:outline-none"
              value={selectedOffering?.id ?? ""}
              disabled={offeringsLoading}
              onChange={(e) => {
                const offering =
                  offerings.find((o) => o.id === Number(e.target.value)) ?? null
                setSelectedOffering(offering)
                setLoaded(false)
                setResult(null)
                setCaPulledCount(null)
              }}
            >
              <option value="">
                {offeringsLoading
                  ? "Loading offerings…"
                  : "Select course offering…"}
              </option>
              {offerings.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.course_code} — {o.course_title}
                  {" · "}
                  {[
                    o.credit_units != null ? `${o.credit_units} CU` : null,
                    o.semester_name ?? `Semester #${o.semester_id}`,
                    o.session_name,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
        <button
          className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => void loadStudents()}
          disabled={!selectedOffering || loadingStudents}
        >
          {loadingStudents ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <BookOpen size={14} />
          )}
          Load Students
        </button>
      </div>

      {/* Grade entry table */}
      {loaded && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-2xl border border-border bg-card"
        >
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Grade Entry
              </p>
              <p className="text-xs text-muted-foreground">
                {entries.length} students — CA max 40 pts, Exam max 60 pts
                {editableCount < entries.length &&
                  ` · ${entries.length - editableCount} locked (approved/published)`}
              </p>
            </div>
            {entries.length > 0 && (
              <button
                onClick={() => void handlePullCaFromMoodle()}
                disabled={caPreviewMutation.isPending}
                title="Compute each student's CA score from their Moodle assignment/quiz grades for this offering"
                className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted/50 disabled:opacity-50"
              >
                {caPreviewMutation.isPending ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Download size={12} />
                )}
                Pull CA from Moodle
              </button>
            )}
          </div>
          {caPulledCount !== null && (
            <div className="border-b border-border bg-blue-50 px-5 py-2 text-xs text-blue-700 dark:bg-blue-950/20 dark:text-blue-400">
              Pulled CA scores for {caPulledCount} student
              {caPulledCount !== 1 ? "s" : ""} from Moodle. Review before
              saving.
            </div>
          )}
          {caPreviewMutation.isError && (
            <div className="border-b border-border bg-amber-50 px-5 py-2 text-xs text-amber-700 dark:bg-amber-950/20 dark:text-amber-400">
              Could not compute CA scores from Moodle for this offering.
            </div>
          )}

          {entries.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <AlertCircle size={28} className="opacity-40" />
              <p className="text-sm">No students found for this selection.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      {[
                        "Student",
                        "Matric No.",
                        "CA (0–40)",
                        "Exam (0–60)",
                        "Total",
                        "Status",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2.5 text-left text-[10px] font-semibold tracking-wide whitespace-nowrap text-muted-foreground uppercase"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, idx) => {
                      const ca = parseFloat(entry.caScore) || 0
                      const exam = parseFloat(entry.examScore) || 0
                      const total =
                        entry.caScore || entry.examScore ? ca + exam : null
                      const statusChip: Record<string, string> = {
                        PUBLISHED:
                          "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300",
                        APPROVED:
                          "text-blue-700 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-300",
                        SUBMITTED:
                          "text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300",
                        DRAFT:
                          "text-slate-600 bg-slate-100 dark:bg-slate-800/50",
                      }
                      return (
                        <tr
                          key={entry.studentId}
                          className={`border-b border-border/30 last:border-0 ${entry.locked ? "opacity-60" : ""}`}
                        >
                          <td className="px-3 py-2.5 font-medium whitespace-nowrap text-foreground">
                            {entry.studentName}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-muted-foreground">
                            {entry.studentMatric}
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="number"
                              min={0}
                              max={40}
                              step={0.5}
                              className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-center font-mono text-xs focus:ring-2 focus:ring-primary/30 focus:outline-none disabled:cursor-not-allowed disabled:bg-muted/30"
                              value={entry.caScore}
                              onChange={(e) =>
                                updateScore(idx, "caScore", e.target.value)
                              }
                              disabled={entry.locked}
                              placeholder="—"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="number"
                              min={0}
                              max={60}
                              step={0.5}
                              className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-center font-mono text-xs focus:ring-2 focus:ring-primary/30 focus:outline-none disabled:cursor-not-allowed disabled:bg-muted/30"
                              value={entry.examScore}
                              onChange={(e) =>
                                updateScore(idx, "examScore", e.target.value)
                              }
                              disabled={entry.locked}
                              placeholder="—"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono font-bold text-foreground">
                            {total !== null ? total : "—"}
                          </td>
                          <td className="px-3 py-2.5">
                            {entry.existingStatus ? (
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusChip[entry.existingStatus] ?? ""}`}
                              >
                                {entry.existingStatus}
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">
                                New
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between border-t border-border bg-muted/10 px-5 py-4">
                <p className="text-xs text-muted-foreground">
                  Grades are locked once approved or published.
                </p>
                <button
                  onClick={() => void handleSubmit()}
                  disabled={bulkCreateMutation.isPending || editableCount === 0}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {bulkCreateMutation.isPending ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Send size={13} />
                  )}
                  Save Grades
                </button>
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* Result banner */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30"
        >
          <Check
            size={16}
            className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
          />
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              {result.saved} grade{result.saved !== 1 ? "s" : ""} saved as draft
            </p>
            <p className="mt-0.5 text-xs text-emerald-600/80 dark:text-emerald-400/80">
              Submit each one for approval from the Grade Book when you&apos;re
              ready.
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-xs text-amber-700 dark:text-amber-400">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}
