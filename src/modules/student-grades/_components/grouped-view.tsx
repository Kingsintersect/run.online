"use client"

import { motion } from "framer-motion"
import { Users, BarChart2, CheckCircle2 } from "lucide-react"
import EmptyState from "@/components/custom/EmptyState"
import type { GroupedGradeData } from "../types/grades.types"

function GpaBar({ value }: { value: number }) {
  const pct = Math.min((value / 5) * 100, 100)
  const colour =
    value >= 4.0
      ? "bg-emerald-500"
      : value >= 3.0
        ? "bg-blue-500"
        : value >= 2.0
          ? "bg-amber-500"
          : "bg-red-500"
  return (
    <div className="flex min-w-28 items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <motion.div
          className={`h-full ${colour} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <span className="w-8 font-mono text-xs font-semibold text-foreground tabular-nums">
        {value.toFixed(2)}
      </span>
    </div>
  )
}

// A group is an aggregate row only (gradeCount/studentCount/avgGPA/passRate) —
// GET /results/grades/grouped returns aggregates, not the underlying grade
// records, so there's no per-grade drill-down to expand into here.
function GroupRow({ group }: { group: GroupedGradeData }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card px-5 py-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {group.label}
          </p>
          {group.subLabel && (
            <p className="text-xs text-muted-foreground">{group.subLabel}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-6">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {group.studentCount} students
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BarChart2 className="h-3.5 w-3.5" />
            {group.gradeCount} grades
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            {group.passRate}% pass
          </span>
          <GpaBar value={group.avgGPA} />
        </div>
      </div>
    </motion.div>
  )
}

interface GroupedViewProps {
  data: GroupedGradeData[]
  loading: boolean
}

export function GradesGroupedView({ data, loading }: GroupedViewProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[80, 65, 75, 55].map((w, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-2xl bg-muted"
            style={{ opacity: 1 - i * 0.15 }}
          />
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title="No grouped data"
        description="Adjust your filters to see grouped results."
      />
    )
  }

  return (
    <div className="space-y-3">
      {data.map((group) => (
        <GroupRow key={group.key} group={group} />
      ))}
    </div>
  )
}
