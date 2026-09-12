"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { LayoutList, LayoutGrid, ChevronDown, AlertCircle } from "lucide-react"
import { GradesFiltersBar } from "../filters-bar"
import { GradesExportToolbar } from "../export-toolbar"
import { GradesTable } from "../grades-table"
import { GradesGroupedView } from "../grouped-view"
import { GradeDetailModal } from "../modals/grade-detail-modal"
import { TranscriptModal } from "../modals/transcript-modal"
import {
  useGrades,
  useGroupedGrades,
  useStudentTranscript,
} from "../../hooks/use-grades-data"
import { useGradesExport } from "../../hooks/use-grades-export"
import { useGradesStore } from "../../store/gradesStore"
import type { GradesGroupBy } from "../../types/grades.types"

const GROUP_BY_OPTIONS: { label: string; value: GradesGroupBy }[] = [
  { label: "Academic Year", value: "academic_year" },
  { label: "Semester", value: "semester" },
  { label: "Program", value: "program" },
]

interface GradesResultsPageProps {
  canViewAll?: boolean
  canManage?: boolean
  canExport?: boolean
  canAnalyze?: boolean
}

export default function GradesResultsPage({
  canViewAll = false,
  canManage = false,
  canExport = false,
  canAnalyze = false,
}: GradesResultsPageProps) {
  const [activeView, setActiveView] = useState<"table" | "grouped">("table")
  const [groupBy, setGroupBy] = useState<GradesGroupBy>("academic_year")
  const [groupByOpen, setGroupByOpen] = useState(false)

  const {
    grades,
    filters,
    pagination,
    loading,
    error,
    updateFilters,
    resetFilters,
    goToPage,
    activeFilterCount,
  } = useGrades(15)
  const { data: groupedData, loading: groupedLoading } = useGroupedGrades(
    groupBy,
    filters,
    canAnalyze
  )
  const { exporting, exportCSV, exportExcel, exportPDF } = useGradesExport()

  const {
    gradeDetailOpen,
    closeGradeDetail,
    openGradeDetail,
    openTranscript,
    transcriptOpen,
    closeTranscript,
    transcriptStudentId,
  } = useGradesStore()

  const { transcript, loading: transcriptLoading } =
    useStudentTranscript(transcriptStudentId)

  // If user doesn't have view permission, show nothing
  if (!canViewAll && !canManage) return null

  return (
    <div className="space-y-4">
      {/* Toolbar row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* View toggle */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/50 p-1">
          <button
            onClick={() => setActiveView("table")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeView === "table"
                ? "border border-border bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutList className="h-3.5 w-3.5" /> Table
          </button>
          {canAnalyze && (
            <button
              onClick={() => setActiveView("grouped")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                activeView === "grouped"
                  ? "border border-border bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Grouped
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Group by selector (only in grouped view) */}
          {canAnalyze && activeView === "grouped" && (
            <div className="relative">
              <button
                onClick={() => setGroupByOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted/50"
              >
                Group:{" "}
                {GROUP_BY_OPTIONS.find((o) => o.value === groupBy)?.label}
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${groupByOpen ? "rotate-180" : ""}`}
                />
              </button>
              {groupByOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 z-20 mt-1 min-w-36 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
                >
                  {GROUP_BY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setGroupBy(opt.value)
                        setGroupByOpen(false)
                      }}
                      className={`w-full px-4 py-2.5 text-left text-xs transition hover:bg-muted ${
                        groupBy === opt.value
                          ? "font-semibold text-primary"
                          : "text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          )}

          {/* Export toolbar - only show if user can export */}
          {canExport && (
            <GradesExportToolbar
              grades={grades}
              exporting={exporting}
              onExportCSV={exportCSV}
              onExportExcel={exportExcel}
              onExportPDF={exportPDF}
              totalCount={pagination.total}
            />
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Filters */}
      <GradesFiltersBar
        filters={filters}
        onChange={updateFilters}
        onReset={resetFilters}
        activeFilterCount={activeFilterCount}
      />

      {/* Main content */}
      {activeView === "table" || !canAnalyze ? (
        <GradesTable
          grades={grades}
          loading={loading}
          pagination={pagination}
          onPageChange={goToPage}
          onViewGrade={openGradeDetail}
          onViewTranscript={(grade) => openTranscript(grade.studentId)}
          canManage={canManage}
        />
      ) : (
        <GradesGroupedView data={groupedData} loading={groupedLoading} />
      )}

      {/* Modals */}
      <GradeDetailModal
        open={gradeDetailOpen}
        onClose={closeGradeDetail}
        canManage={canManage}
      />
      <TranscriptModal
        open={transcriptOpen}
        onClose={closeTranscript}
        transcript={transcript ?? null}
        loading={transcriptLoading}
        canManage={canManage}
      />
    </div>
  )
}
