"use client"

import { motion } from "framer-motion"
import {
  Award,
  BookOpen,
  TrendingUp,
  Clock,
  GraduationCap,
  Download,
  Loader2,
} from "lucide-react"
import { useMyStudentId } from "@/hooks/use-my-student-id"
import { useProgram } from "@/hooks/useCourseStructure"
import {
  useMyTermResults,
  useStudentTranscript,
  useDownloadSemesterResult,
} from "../hooks/use-grades-data"
import { TermResultsView } from "./TermResultsView"
import type { Grade, CgpaHistoryEntry } from "../types/grades.types"

// ─── Grade colour map ──────────────────────────────────────────────────────────

const GRADE_CHIP: Record<string, string> = {
  A: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300",
  AB: "text-teal-700 bg-teal-50 dark:bg-teal-950/40 dark:text-teal-300",
  B: "text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300",
  BC: "text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-300",
  C: "text-violet-700 bg-violet-50 dark:bg-violet-950/40 dark:text-violet-300",
  CD: "text-orange-700 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-300",
  D: "text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300",
  F: "text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300",
}

const STATUS_CHIP: Record<string, string> = {
  PUBLISHED:
    "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300",
  APPROVED: "text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300",
  SUBMITTED:
    "text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300",
  DRAFT: "text-slate-600 bg-slate-100 dark:bg-slate-800/50 dark:text-slate-300",
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function GradeLetterBadge({ letter }: { letter: string | null }) {
  if (!letter) return <span className="font-mono text-muted-foreground">—</span>
  return (
    <span
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${GRADE_CHIP[letter] ?? "bg-muted text-foreground"}`}
    >
      {letter}
    </span>
  )
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${STATUS_CHIP[status] ?? ""}`}
    >
      {status}
    </span>
  )
}

function GradeRow({ grade }: { grade: Grade }) {
  return (
    <tr className="border-b border-border/30 transition-colors last:border-0 hover:bg-muted/20">
      <td className="px-3 py-2.5">
        <p className="text-xs font-semibold text-foreground">
          {grade.courseCode}
        </p>
        <p className="text-[11px] leading-tight text-muted-foreground">
          {grade.courseName}
        </p>
      </td>
      <td className="px-3 py-2.5 text-center font-mono text-xs">
        {grade.caScore ?? "—"}
      </td>
      <td className="px-3 py-2.5 text-center font-mono text-xs">
        {grade.examScore ?? "—"}
      </td>
      <td className="px-3 py-2.5 text-center font-mono text-xs font-bold text-foreground">
        {grade.totalScore ?? "—"}
      </td>
      <td className="px-3 py-2.5 text-center">
        <GradeLetterBadge letter={grade.gradeLetter} />
      </td>
      <td className="px-3 py-2.5 text-center font-mono text-xs">
        {grade.gradePoint?.toFixed(2) ?? "—"}
      </td>
      <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">
        {grade.creditUnits}
      </td>
      <td className="px-3 py-2.5 text-center">
        <StatusPill status={grade.status} />
      </td>
    </tr>
  )
}

// ─── CGPA history mini-chart ───────────────────────────────────────────────────

function CgpaHistorySection({ history }: { history: CgpaHistoryEntry[] }) {
  if (!history.length) return null
  const max = 5
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border bg-muted/30 px-4 py-3">
        <p className="text-sm font-semibold text-foreground">CGPA History</p>
        <p className="text-xs text-muted-foreground">
          Cumulative grade point average per semester
        </p>
      </div>
      <div className="space-y-3 p-4">
        {history.map((entry, idx) => (
          <div key={entry.id} className="flex items-center gap-3">
            <div className="w-32 shrink-0">
              <p className="truncate text-[11px] font-medium text-foreground">
                {entry.semesterName}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {entry.academicYear}
              </p>
            </div>
            <div className="flex flex-1 items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${(entry.cgpa / max) * 100}%` }}
                  transition={{
                    delay: idx * 0.05,
                    duration: 0.5,
                    ease: "easeOut",
                  }}
                />
              </div>
              <span className="w-10 text-right font-mono text-xs font-bold text-foreground">
                {entry.cgpa.toFixed(2)}
              </span>
            </div>
            <div className="w-14 text-right">
              <p className="text-[10px] text-muted-foreground">GPA</p>
              <p className="font-mono text-xs font-semibold text-foreground">
                {entry.gpa.toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function StudentResultsPage() {
  const { studentId, programId } = useMyStudentId()
  const { data: programData, isLoading: programLoading } = useProgram(programId)
  // SECONDARY_SCHOOL programs use a simple average + class position per
  // term (TermResultsView below), not a credit-weighted GPA — every other
  // category keeps the CGPA transcript view unchanged. See
  // sandbox/schema-moodel-sync-refactor/api-v2.md §"GET /students/me/results".
  const isSecondarySchool =
    programData?.data.programCategory === "SECONDARY_SCHOOL"

  const { transcript, loading: transcriptLoading } = useStudentTranscript(
    !programLoading && !isSecondarySchool ? studentId : null
  )
  const downloadResult = useDownloadSemesterResult()
  const { data: terms, loading: termsLoading } = useMyTermResults(
    !programLoading && isSecondarySchool
  )

  // Group grades by semester (most recent first)
  const bySemester =
    transcript?.grades.reduce<Record<string, Grade[]>>((acc, g) => {
      const key = `${g.academicYear}::${g.semesterId}`
      if (!acc[key]) acc[key] = []
      acc[key].push(g)
      return acc
    }, {}) ?? {}

  const semesters = Object.entries(bySemester)
    .map(([key, grades]) => {
      const wSum = grades.reduce(
        (a, g) => a + (g.gradePoint ?? 0) * g.creditUnits,
        0
      )
      const cuSum = grades.reduce((a, g) => a + g.creditUnits, 0)
      const semesterId = parseInt(grades[0].semesterId.replace("sem-", ""))
      return {
        key,
        label: grades[0].semesterName,
        academicYear: grades[0].academicYear,
        semesterId,
        grades,
        gpa: cuSum ? Math.round((wSum / cuSum) * 100) / 100 : 0,
      }
    })
    .sort((a, b) => b.semesterId - a.semesterId) // most recent first

  if (
    programLoading ||
    (isSecondarySchool ? termsLoading : transcriptLoading)
  ) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted/50" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-2xl bg-muted/50" />
        ))}
      </div>
    )
  }

  if (isSecondarySchool) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <TrendingUp size={15} className="text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">
            Term Results
          </h2>
        </div>
        <TermResultsView terms={terms} loading={termsLoading} />
      </div>
    )
  }

  if (!transcript) return null

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Current CGPA",
            value: transcript.currentCGPA?.toFixed(2) ?? "—",
            icon: Award,
            color: "text-primary",
          },
          {
            label: "Credit Units Earned",
            value: transcript.totalCreditUnits,
            icon: BookOpen,
            color: "text-blue-500",
          },
          {
            label: "Program",
            value: transcript.programCode,
            icon: GraduationCap,
            color: "text-violet-500",
          },
          {
            label: "Semesters Completed",
            value: semesters.length,
            icon: Clock,
            color: "text-amber-500",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <stat.icon size={16} className={`mb-2 ${stat.color}`} />
            <p className="font-mono text-lg font-bold text-foreground">
              {stat.value}
            </p>
            <p className="text-[11px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* CGPA history */}
      {transcript.cgpaHistory.length > 0 && (
        <CgpaHistorySection history={transcript.cgpaHistory} />
      )}

      {/* Grades by semester */}
      <div className="flex items-center gap-2 space-y-1">
        <TrendingUp size={15} className="text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">
          Semester Results
        </h2>
      </div>

      {semesters.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-muted-foreground">
          <BookOpen size={36} className="opacity-30" />
          <p className="text-sm">No results available yet.</p>
          <p className="text-xs opacity-70">
            Results will appear here once published.
          </p>
        </div>
      ) : (
        semesters.map((sem, idx) => (
          <motion.div
            key={sem.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
            className="overflow-hidden rounded-2xl border border-border bg-card"
          >
            {/* Semester header */}
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {sem.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {sem.academicYear}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
                    Semester GPA
                  </p>
                  <p className="font-mono text-base font-bold text-foreground">
                    {sem.gpa.toFixed(2)}
                    <span className="text-xs font-normal text-muted-foreground">
                      {" "}
                      / 5.0
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  title="Download result sheet (PDF)"
                  onClick={() =>
                    downloadResult.mutate({
                      semesterId: sem.semesterId,
                      label: `${sem.label} ${sem.academicYear}`,
                    })
                  }
                  disabled={downloadResult.isPending}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  {downloadResult.isPending &&
                  downloadResult.variables?.semesterId === sem.semesterId ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Download size={14} />
                  )}
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    {[
                      "Course",
                      "CA",
                      "Exam",
                      "Total",
                      "Grade",
                      "GP",
                      "Units",
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
                  {sem.grades.map((grade) => (
                    <GradeRow key={grade.id} grade={grade} />
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        ))
      )}
    </div>
  )
}
