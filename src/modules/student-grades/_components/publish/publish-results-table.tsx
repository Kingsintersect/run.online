"use client"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Banknote,
} from "lucide-react"
import StatusBadge from "@/components/custom/StatusBadge"
import EmptyState from "@/components/custom/EmptyState"
import { GradesExportToolbar } from "../export-toolbar"
import { useGradesExport } from "../../hooks/use-grades-export"
import type { Grade, GradeStatus } from "../../types/grades.types"

// ─── Shared helpers ───────────────────────────────────────────────────────────

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
        ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40"
        : (point ?? 0) >= 2.5
          ? "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40"
          : (point ?? 0) >= 1.0
            ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40"
            : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40"
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
  onSort: (k: keyof Grade) => void
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

const PAGE_SIZE = 15

interface PublishResultsTableProps {
  grades: Grade[]
  canPublish?: boolean // ← ADD THIS
}

export function PublishResultsTable({
  grades,
  canPublish = false,
}: PublishResultsTableProps) {
  const { exporting, exportCSV, exportExcel, exportPDF } = useGradesExport()

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<GradeStatus | "all">("all")
  const [feeFilter, setFeeFilter] = useState<"all" | "clear" | "outstanding">(
    "all"
  )
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)

  const handleSort = (key: keyof Grade) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : null)
      if (sortDir === "desc") setSortKey(null)
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const filtered = useMemo(() => {
    let list = grades
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (g) =>
          g.studentName.toLowerCase().includes(q) ||
          g.studentMatric.toLowerCase().includes(q)
      )
    }
    if (statusFilter !== "all")
      list = list.filter((g) => g.status === statusFilter)
    if (feeFilter === "clear") list = list.filter((g) => !g.hasOutstandingFees)
    if (feeFilter === "outstanding")
      list = list.filter((g) => g.hasOutstandingFees)
    if (sortKey) {
      list = [...list].sort((a, b) => {
        const av = a[sortKey] ?? ""
        const bv = b[sortKey] ?? ""
        if (av < bv) return sortDir === "asc" ? -1 : 1
        if (av > bv) return sortDir === "asc" ? 1 : -1
        return 0
      })
    }
    return list
  }, [grades, search, statusFilter, feeFilter, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageSlice = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  )

  const SKELETON_ROWS = 8

  return (
    <div className="space-y-3">
      {/* Search + filter row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search student name or matric…"
            className="w-full rounded-xl border border-border bg-card py-2 pr-8 pl-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as GradeStatus | "all")
            setPage(1)
          }}
          className="rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="APPROVED">Approved</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </select>

        {/* Fee filter */}
        <select
          value={feeFilter}
          onChange={(e) => {
            setFeeFilter(e.target.value as "all" | "clear" | "outstanding")
            setPage(1)
          }}
          className="rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
        >
          <option value="all">All Fee Status</option>
          <option value="clear">Fee Cleared</option>
          <option value="outstanding">Fee Outstanding</option>
        </select>

        {/* Export - only show if user can publish/manage */}
        {canPublish && (
          <GradesExportToolbar
            grades={filtered}
            exporting={exporting}
            onExportCSV={exportCSV}
            onExportExcel={exportExcel}
            onExportPDF={exportPDF}
            totalCount={filtered.length}
          />
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No results found"
          description="Try adjusting the search or status filter."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-3 py-3 text-left text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    <SortHeader
                      label="Student"
                      field="studentName"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Matric
                  </th>
                  <th className="px-3 py-3 text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    <SortHeader
                      label="CA"
                      field="caScore"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-3 py-3 text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    <SortHeader
                      label="Exam"
                      field="examScore"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-3 py-3 text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    <SortHeader
                      label="Total"
                      field="totalScore"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-3 py-3 text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Grade
                  </th>
                  <th className="px-3 py-3 text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    GP
                  </th>
                  <th className="px-3 py-3 text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Status
                  </th>
                  <th className="px-3 py-3 text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Fees
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageSlice.map((grade, i) => {
                  const isPublished = grade.status === "PUBLISHED"
                  return (
                    <motion.tr
                      key={grade.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className={`border-b border-border/30 transition-colors last:border-0 hover:bg-muted/30 ${isPublished ? "opacity-60" : ""} ${grade.hasOutstandingFees && !isPublished ? "bg-amber-50/40 dark:bg-amber-950/10" : ""}`}
                    >
                      <td className="px-3 py-3">
                        <p className="font-medium text-foreground">
                          {grade.studentName}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-mono text-muted-foreground">
                          {grade.studentMatric}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-foreground">
                        {grade.caScore ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-foreground">
                        {grade.examScore ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-center font-mono font-bold text-foreground">
                        {grade.totalScore ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <GradePill
                          letter={grade.gradeLetter}
                          point={grade.gradePoint}
                        />
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-muted-foreground">
                        {grade.gradePoint?.toFixed(2) ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <StatusBadge {...STATUS_BADGE_MAP[grade.status]} dot />
                      </td>
                      <td className="px-3 py-3 text-center">
                        {grade.hasOutstandingFees ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-400">
                            <Banknote className="h-3 w-3" />
                            Held
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                            Cleared
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-3">
              <span className="text-xs text-muted-foreground">
                {(safePage - 1) * PAGE_SIZE + 1}–
                {Math.min(safePage * PAGE_SIZE, filtered.length)} of{" "}
                {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="rounded-lg border border-border bg-card p-1.5 transition hover:bg-muted disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5 text-foreground" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = i + 1
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`h-7 w-7 rounded-lg border text-xs transition ${
                        safePage === p
                          ? "border-primary bg-primary font-semibold text-primary-foreground"
                          : "border-border bg-card text-foreground hover:bg-muted"
                      }`}
                    >
                      {p}
                    </button>
                  )
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="rounded-lg border border-border bg-card p-1.5 transition hover:bg-muted disabled:opacity-40"
                >
                  <ChevronRight className="h-3.5 w-3.5 text-foreground" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Skeleton placeholder for loading state */}
      {grades.length === 0 && (
        <div className="space-y-2">
          {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-xl bg-muted/40"
            />
          ))}
        </div>
      )}
    </div>
  )
}
