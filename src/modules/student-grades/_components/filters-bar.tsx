"use client"

import { useCallback } from "react"
import { Search, X, SlidersHorizontal } from "lucide-react"
import { motion } from "framer-motion"
import type { GradeFilters, GradeStatus } from "../types/grades.types"
import { ACADEMIC_YEARS, SEMESTERS, PROGRAMS } from "../services/grades.service"
import { useGradeScales } from "../hooks/use-grades-data"

interface FiltersBarProps {
  filters: GradeFilters
  onChange: (partial: Partial<GradeFilters>) => void
  onReset: () => void
  activeFilterCount: number
}

const STATUS_OPTIONS: { value: GradeStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "APPROVED", label: "Approved" },
  { value: "PUBLISHED", label: "Published" },
]

function SelectFilter({
  value,
  onChange,
  options,
  className,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  className?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-9 cursor-pointer rounded-xl border border-border bg-card px-3 text-xs font-medium text-foreground transition focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none ${className ?? ""}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function GradesFiltersBar({
  filters,
  onChange,
  onReset,
  activeFilterCount,
}: FiltersBarProps) {
  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ search: e.target.value }),
    [onChange]
  )

  const { scales: gradeScales } = useGradeScales()

  const yearOptions = [
    { value: "all", label: "All Years" },
    ...ACADEMIC_YEARS.map((y) => ({ value: y.id, label: y.label })),
  ]

  const semesterOptions = [
    { value: "all", label: "All Semesters" },
    ...SEMESTERS.filter(
      (s) =>
        filters.academicYearId === "all" ||
        s.academicYearId === filters.academicYearId
    ).map((s) => ({ value: s.id, label: `${s.label} ${s.academicYear}` })),
  ]

  const programOptions = [
    { value: "all", label: "All Programs" },
    ...PROGRAMS.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` })),
  ]

  const gradeOptions = [
    { value: "all", label: "All Grades" },
    ...gradeScales.map((g) => ({
      value: g.grade,
      label: `${g.grade} (${g.gradePoint.toFixed(2)})`,
    })),
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-border bg-card p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">Filters</span>
        {activeFilterCount > 0 && (
          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
            {activeFilterCount}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search student, matric, course…"
            value={filters.search}
            onChange={handleSearch}
            className="h-9 w-full rounded-xl border border-border bg-background pr-3 pl-9 text-xs text-foreground transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          />
        </div>

        {/* Status */}
        <SelectFilter
          value={filters.status}
          onChange={(v) => onChange({ status: v as GradeStatus | "all" })}
          options={STATUS_OPTIONS}
        />

        {/* Academic Year */}
        <SelectFilter
          value={filters.academicYearId}
          onChange={(v) => onChange({ academicYearId: v, semesterId: "all" })}
          options={yearOptions}
        />

        {/* Semester */}
        <SelectFilter
          value={filters.semesterId}
          onChange={(v) => onChange({ semesterId: v })}
          options={semesterOptions}
        />

        {/* Program */}
        <SelectFilter
          value={filters.programId}
          onChange={(v) => onChange({ programId: v })}
          options={programOptions}
        />

        {/* Grade Letter */}
        <SelectFilter
          value={filters.gradeLetter}
          onChange={(v) => onChange({ gradeLetter: v })}
          options={gradeOptions}
        />

        {/* Reset */}
        {activeFilterCount > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileTap={{ scale: 0.95 }}
            onClick={onReset}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-medium text-muted-foreground transition hover:border-destructive/50 hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}
