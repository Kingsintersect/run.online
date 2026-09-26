"use client"

import { useMemo } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Award,
  BookOpen,
  TrendingUp,
  Clock,
  GraduationCap,
  Download,
  Hourglass,
  Loader2,
  Wallet,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMyStudentId } from "@/hooks/use-my-student-id"
import { useMyActiveSession } from "@/hooks/use-my-active-session"
import { useProgram } from "@/hooks/useCourseStructure"
import {
  useMyTermResults,
  useStudentCgpa,
  useDownloadSemesterResult,
} from "../hooks/use-grades-data"
import { useMyPublishedGrades, useMyResultStatus } from "../hooks/use-results"
import {
  useMyResultsSessionFilter,
  type ResultsFilterItem,
} from "../hooks/use-my-results-session-filter"
import { TermResultsView } from "./TermResultsView"
import { MyResultsSessionFilter } from "./my-results-session-filter"
import { fmtScore } from "./results/format"
import type { CgpaHistoryEntry } from "../types/grades.types"
import type { StudentGrade } from "../types"

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

// Renders a StudentGrade only (contract C8) — published results, no status,
// no raw scores, no adjustments.
function GradeRow({ grade }: { grade: StudentGrade }) {
  return (
    <tr className="border-b border-border/30 transition-colors last:border-0 hover:bg-muted/20">
      <td className="px-3 py-2.5">
        <p className="text-xs font-semibold text-foreground">
          {grade.courseCode}
        </p>
        <p className="text-[11px] leading-tight text-muted-foreground">
          {grade.courseTitle}
        </p>
      </td>
      <td className="px-3 py-2.5 text-center font-mono text-xs">
        {fmtScore(grade.caScore)}
      </td>
      <td className="px-3 py-2.5 text-center font-mono text-xs">
        {fmtScore(grade.examScore)}
      </td>
      <td className="px-3 py-2.5 text-center font-mono text-xs font-bold text-foreground">
        {fmtScore(grade.totalScore)}
      </td>
      <td className="px-3 py-2.5 text-center">
        <GradeLetterBadge letter={grade.grade} />
      </td>
      <td className="px-3 py-2.5 text-center font-mono text-xs">
        {grade.gradePoint?.toFixed(2) ?? "—"}
      </td>
      <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">
        {grade.creditUnits}
      </td>
    </tr>
  )
}

// ─── Withheld / not-yet-released banner (current semester) ─────────────────────

function ResultStatusBanner({ semesterId }: { semesterId: number | null }) {
  const status = useMyResultStatus(semesterId)
  // Not live yet → nothing to say honestly; never guess a withheld state.
  const s = status.data?.available ? status.data.data : null
  if (!s || s.published) return null
  if (s.withheld && s.reason === "OUTSTANDING_FEES")
    return (
      <div
        role="status"
        className="flex flex-wrap items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4"
      >
        <Wallet
          className="mt-0.5 size-5 shrink-0 text-rose-600 dark:text-rose-400"
          aria-hidden
        />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold text-foreground">Results withheld</p>
          <p className="text-muted-foreground">
            Your results for this semester are withheld because of outstanding
            fees. They will appear once your fees are cleared.
          </p>
        </div>
        <Link
          href="/student/fees"
          className="self-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
        >
          View my fees
        </Link>
      </div>
    )
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-2xl border border-border bg-muted/30 p-4"
    >
      <Hourglass
        className="mt-0.5 size-5 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <p className="text-sm text-muted-foreground">
        Results for this semester have not been released yet.
      </p>
    </div>
  )
}

// ─── Empty state for a session/semester with nothing published ────────────────

function FilteredEmptyState({
  label,
  onClear,
}: {
  label: string
  onClear: () => void
}) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-14 text-center text-muted-foreground"
    >
      <BookOpen size={32} className="opacity-30" aria-hidden />
      <p className="text-sm">No published results for {label}.</p>
      <p className="max-w-sm text-xs opacity-70">
        Results for this session appear here once they&apos;re published.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onClear}
        className="mt-2 gap-1.5 text-xs"
      >
        <X size={13} aria-hidden />
        Show all sessions
      </Button>
    </div>
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
  const { studentId, programId, isLoading: studentLoading } = useMyStudentId()
  const { data: programData, isLoading: programLoading } = useProgram(programId)
  const { currentSemester } = useMyActiveSession()
  // SECONDARY_SCHOOL programs use a simple average + class position per
  // term (TermResultsView below), not a credit-weighted GPA — every other
  // category uses the published-results view. See
  // sandbox/schema-moodel-sync-refactor/api-v2.md §"GET /students/me/results".
  const isSecondarySchool =
    programData?.data.programCategory === "SECONDARY_SCHOOL"

  const gradesQuery = useMyPublishedGrades(
    !programLoading && !isSecondarySchool ? studentId : null
  )
  const cgpa = useStudentCgpa(
    !programLoading && !isSecondarySchool ? studentId : null
  )
  const downloadResult = useDownloadSemesterResult()
  const { data: terms, loading: termsLoading } = useMyTermResults(
    !programLoading && isSecondarySchool
  )

  // Session/semester filter — kept in the URL (?session=<id>&semester=<id>)
  // so the Academic History page can deep-link to one session.
  const allGrades = gradesQuery.data
  const filterItems = useMemo<ResultsFilterItem[]>(
    () =>
      isSecondarySchool
        ? terms.map((t) => ({
            semesterId: t.semesterId,
            semesterName: t.semesterName,
          }))
        : (allGrades ?? []),
    [isSecondarySchool, terms, allGrades]
  )
  const filter = useMyResultsSessionFilter(filterItems)
  const filterLabel = [filter.sessionLabel, filter.semesterLabel]
    .filter(Boolean)
    .join(" · ")
  const visibleTerms = terms.filter((t) =>
    filter.matches({ semesterId: t.semesterId, semesterName: t.semesterName })
  )
  const cgpaHistory = cgpa.history.filter((h) =>
    filter.matches({
      semesterId: Number(h.semesterId),
      semesterName: h.semesterName,
      academicSession: h.academicYear,
    })
  )
  const showCurrentStatus =
    !filter.isFiltered ||
    (currentSemester != null &&
      filter.matches({
        semesterId: currentSemester.id,
        semesterName: currentSemester.name,
      }))

  // Group published grades by semester (most recent first). The semester
  // GPA is the backend's own figure from cgpa_history — never recomputed here.
  const grades = (allGrades ?? []).filter(filter.matches)
  const bySemester = grades.reduce<Map<number, StudentGrade[]>>((acc, g) => {
    acc.set(g.semesterId, [...(acc.get(g.semesterId) ?? []), g])
    return acc
  }, new Map())
  const semesters = [...bySemester.entries()]
    .map(([semesterId, list]) => ({
      semesterId,
      label: list[0].semesterName,
      academicYear: list[0].academicSession,
      grades: list,
      gpa:
        cgpa.history.find((h) => h.semesterId === String(semesterId))?.gpa ??
        null,
    }))
    .sort((a, b) => b.semesterId - a.semesterId)
  const creditUnits = grades.reduce((a, g) => a + g.creditUnits, 0)

  if (
    programLoading ||
    (isSecondarySchool ? termsLoading : gradesQuery.isLoading || cgpa.loading)
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

  // Found in QA 2026-09-25: an account with the student role but no student
  // record (GET /users/students/me → 404) used to read "No results published
  // yet", which isn't true — there's no record to publish results against.
  if (!studentLoading && studentId == null)
    return (
      <div
        role="status"
        className="rounded-2xl border border-dashed border-border p-8 text-center"
      >
        <p className="text-sm font-semibold text-foreground">
          Your student record isn&apos;t set up yet
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Results appear once the registry has created your student record and
          your results are published. Contact the registry if you&apos;ve
          already been admitted.
        </p>
      </div>
    )

  if (isSecondarySchool) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <TrendingUp size={15} className="text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">
            Term Results
          </h2>
        </div>
        <MyResultsSessionFilter filter={filter} />
        {filter.isFiltered && visibleTerms.length === 0 ? (
          <FilteredEmptyState label={filterLabel} onClear={filter.clear} />
        ) : (
          <TermResultsView terms={visibleTerms} loading={termsLoading} />
        )}
      </div>
    )
  }

  if (gradesQuery.isError)
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Couldn&apos;t load your results. Please try again shortly.
      </div>
    )

  return (
    <div className="space-y-6">
      <MyResultsSessionFilter filter={filter} />

      {showCurrentStatus && (
        <ResultStatusBanner semesterId={currentSemester?.id ?? null} />
      )}

      {/* Header stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Current CGPA",
            value: cgpa.currentCGPA?.toFixed(2) ?? "—",
            icon: Award,
            color: "text-primary",
          },
          {
            label: "Credit Units (published)",
            value: creditUnits,
            icon: BookOpen,
            color: "text-blue-500",
          },
          {
            label: "Program",
            value: programData?.data.code ?? "—",
            icon: GraduationCap,
            color: "text-violet-500",
          },
          {
            label: "Semesters Published",
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
      <CgpaHistorySection history={cgpaHistory} />

      {/* Grades by semester */}
      <div className="flex items-center gap-2 space-y-1">
        <TrendingUp size={15} className="text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">
          Semester Results
          {filter.isFiltered && (
            <span className="ml-1.5 font-normal text-muted-foreground">
              — {filterLabel}
            </span>
          )}
        </h2>
      </div>

      {semesters.length === 0 && filter.isFiltered ? (
        <FilteredEmptyState label={filterLabel} onClear={filter.clear} />
      ) : semesters.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-muted-foreground">
          <BookOpen size={36} className="opacity-30" />
          <p className="text-sm">No results published yet.</p>
          <p className="text-xs opacity-70">
            Your results will appear here as soon as they&apos;re published.
          </p>
        </div>
      ) : (
        semesters.map((sem, idx) => (
          <motion.div
            key={sem.semesterId}
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
                    {sem.gpa?.toFixed(2) ?? "—"}
                    <span className="text-xs font-normal text-muted-foreground">
                      {" "}
                      / 5.0
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  title="Download result sheet (PDF)"
                  aria-label={`Download ${sem.label} ${sem.academicYear} result sheet`}
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
                    ].map((h) => (
                      <th
                        key={h}
                        scope="col"
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
