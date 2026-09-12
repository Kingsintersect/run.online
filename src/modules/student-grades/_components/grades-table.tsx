"use client"

import { AnimatePresence, motion } from "framer-motion"
import {
  ChevronUp,
  ChevronDown,
  Eye,
  User,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Send,
  Loader2,
} from "lucide-react"
import { useState, useMemo } from "react"
import StatusBadge from "@/components/custom/StatusBadge"
import EmptyState from "@/components/custom/EmptyState"
import type {
  Grade,
  GradeStatus,
  GradesPaginationState,
} from "../types/grades.types"
import { useSubmitGrade } from "../hooks/use-grades-mutations"

// ─── Status badge mapping ─────────────────────────────────────────────────────

type StatusVariant = "success" | "warning" | "destructive" | "info" | "default"

const STATUS_BADGE_MAP: Record<
  GradeStatus,
  { label: string; variant: StatusVariant }
> = {
  PUBLISHED: { label: "Published", variant: "success" },
  APPROVED: { label: "Approved", variant: "info" },
  SUBMITTED: { label: "Submitted", variant: "warning" },
  DRAFT: { label: "Draft", variant: "default" },
}

// ─── Grade letter colour ──────────────────────────────────────────────────────

function GradePill({
  letter,
  point,
}: {
  letter: string | null
  point: number | null
}) {
  if (!letter) return <span className="text-xs text-muted-foreground">—</span>
  const colour =
    (point ?? 0) >= 4.5
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
      : (point ?? 0) >= 3.5
        ? "text-blue-600   dark:text-blue-400   bg-blue-50   dark:bg-blue-950/40"
        : (point ?? 0) >= 2.5
          ? "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40"
          : (point ?? 0) >= 1.0
            ? "text-amber-600  dark:text-amber-400  bg-amber-50  dark:bg-amber-950/40"
            : "text-red-600    dark:text-red-400    bg-red-50    dark:bg-red-950/40"
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 font-mono text-xs font-bold ${colour}`}
    >
      {letter}
    </span>
  )
}

// ─── Sort header ─────────────────────────────────────────────────────────────

type SortKey = keyof Grade | null
type SortDir = "asc" | "desc" | null

function SortHeader({
  label,
  field,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string
  field: keyof Grade
  sortKey: SortKey
  sortDir: SortDir
  onSort: (key: keyof Grade) => void
}) {
  const active = sortKey === field
  return (
    <button
      onClick={() => onSort(field)}
      className="group/sort flex items-center gap-1 transition-colors hover:text-foreground"
    >
      {label}
      {active ? (
        sortDir === "asc" ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )
      ) : (
        <ChevronsUpDown className="h-3 w-3 opacity-0 group-hover/sort:opacity-50" />
      )}
    </button>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface GradesTableProps {
  grades: Grade[]
  loading: boolean
  pagination: GradesPaginationState
  onPageChange: (page: number) => void
  onViewGrade: (grade: Grade) => void
  onViewTranscript: (grade: Grade) => void
  canManage?: boolean // ← ADD THIS
}

export function GradesTable({
  grades,
  loading,
  pagination,
  onPageChange,
  onViewGrade,
  onViewTranscript,
  canManage = false, // ← ADD THIS with default
}: GradesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)
  const submitMutation = useSubmitGrade()

  const handleSort = (key: keyof Grade) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : sortDir === "desc" ? null : "asc")
      if (sortDir === "desc") setSortKey(null)
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return grades
    return [...grades].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [grades, sortKey, sortDir])

  const thClass =
    "px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide"

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className={thClass}>
                <SortHeader
                  label="Student"
                  field="studentName"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
              </th>
              <th className={thClass}>
                <SortHeader
                  label="Course"
                  field="courseCode"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
              </th>
              <th className={thClass}>
                <SortHeader
                  label="Semester"
                  field="semesterId"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
              </th>
              <th className={`${thClass} text-center`}>CA</th>
              <th className={`${thClass} text-center`}>Exam</th>
              <th className={`${thClass} text-center`}>
                <SortHeader
                  label="Total"
                  field="totalScore"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
              </th>
              <th className={`${thClass} text-center`}>
                <SortHeader
                  label="Grade"
                  field="gradeLetter"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
              </th>
              <th className={`${thClass} text-center`}>GP</th>
              <th className={`${thClass} text-center`}>
                <SortHeader
                  label="Status"
                  field="status"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
              </th>
              <th className={`${thClass} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {Array.from({ length: 10 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div
                        className="h-3 animate-pulse rounded bg-muted"
                        style={{ width: `${45 + ((i * 10 + j * 7) % 40)}%` }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={10}>
                  <EmptyState
                    title="No grades found"
                    description="Try adjusting your filters."
                  />
                </td>
              </tr>
            ) : (
              <AnimatePresence mode="popLayout">
                {sorted.map((grade) => (
                  <motion.tr
                    key={grade.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="group border-b border-border/50 transition-colors hover:bg-muted/30"
                  >
                    {/* Student */}
                    <td className="min-w-40 px-4 py-3">
                      <p className="text-xs leading-tight font-medium text-foreground">
                        {grade.studentName}
                      </p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {grade.studentMatric}
                      </p>
                    </td>
                    {/* Course */}
                    <td className="min-w-36 px-4 py-3">
                      <p className="font-mono text-xs font-semibold text-foreground">
                        {grade.courseCode}
                      </p>
                      <p className="max-w-32 truncate text-[11px] text-muted-foreground">
                        {grade.courseName}
                      </p>
                    </td>
                    {/* Semester */}
                    <td className="min-w-32 px-4 py-3">
                      <p className="text-[11px] text-foreground">
                        {grade.semesterName}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {grade.academicYear}
                      </p>
                    </td>
                    {/* CA */}
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono text-xs text-foreground">
                        {grade.caScore ?? "—"}
                      </span>
                    </td>
                    {/* Exam */}
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono text-xs text-foreground">
                        {grade.examScore ?? "—"}
                      </span>
                    </td>
                    {/* Total */}
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono text-xs font-bold text-foreground">
                        {grade.totalScore ?? "—"}
                      </span>
                    </td>
                    {/* Grade letter */}
                    <td className="px-4 py-3 text-center">
                      <GradePill
                        letter={grade.gradeLetter}
                        point={grade.gradePoint}
                      />
                    </td>
                    {/* Grade point */}
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono text-xs text-muted-foreground">
                        {grade.gradePoint?.toFixed(2) ?? "—"}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      <StatusBadge {...STATUS_BADGE_MAP[grade.status]} dot />
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => onViewGrade(grade)}
                          title="View grade details"
                          className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onViewTranscript(grade)}
                          title="View student transcript"
                          className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                        >
                          <User className="h-3.5 w-3.5" />
                        </button>
                        {/* Edit button - only show if user can manage */}
                        {canManage && (
                          <button
                            onClick={() => onViewGrade(grade)}
                            title="Edit grade"
                            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {/* Submit for approval - only for DRAFT rows the user can manage */}
                        {canManage && grade.status === "DRAFT" && (
                          <button
                            onClick={() => submitMutation.mutate(grade.id)}
                            disabled={submitMutation.isPending}
                            title="Submit for approval"
                            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-primary/10 hover:text-primary disabled:opacity-50"
                          >
                            {submitMutation.isPending &&
                            submitMutation.variables === grade.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.pageSize + 1}–
            {Math.min(pagination.page * pagination.pageSize, pagination.total)}{" "}
            of {pagination.total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(5, pagination.totalPages) }).map(
              (_, i) => {
                const page =
                  Math.max(
                    1,
                    Math.min(pagination.page - 2, pagination.totalPages - 4)
                  ) + i
                return (
                  <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`h-7 w-7 rounded-lg text-xs font-medium transition ${
                      page === pagination.page
                        ? "bg-primary text-white"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {page}
                  </button>
                )
              }
            )}
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
