"use client"

import { motion } from "framer-motion"
import { CalendarCheck, GraduationCap } from "lucide-react"
import { useMyStudentId } from "@/hooks/use-my-student-id"
import { useAttendanceSummary } from "../hooks/use-attendance"
import EmptyState from "@/components/custom/EmptyState"

function AttendanceBar({ value }: { value: number }) {
  const colour =
    value >= 75 ? "bg-emerald-500" : value >= 50 ? "bg-amber-500" : "bg-red-500"
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <motion.div
          className={`h-full ${colour} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(value, 100)}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <span className="w-12 text-right font-mono text-xs font-semibold text-foreground tabular-nums">
        {value.toFixed(1)}%
      </span>
    </div>
  )
}

export function MyAttendanceSummary() {
  const { studentId, isLoading: resolvingStudentId } = useMyStudentId()
  const { data, isLoading } = useAttendanceSummary(studentId)

  if (studentId === null && !resolvingStudentId) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="Your student record couldn't be resolved"
        description="This page needs the backend to support resolving your own student profile — check back once that's available."
      />
    )
  }

  if (isLoading || resolvingStudentId) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    )
  }

  const summaries = data ?? []

  if (summaries.length === 0) {
    return (
      <EmptyState
        icon={CalendarCheck}
        title="No attendance recorded yet"
        description="Attendance appears here once your lecturers start marking class sessions."
      />
    )
  }

  return (
    <div className="space-y-3">
      {summaries.map((s, i) => (
        <motion.div
          key={s.offeringId}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="rounded-2xl border border-border bg-card p-4"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-xs font-semibold text-primary">
                {s.courseCode}
              </p>
              <p className="text-sm font-semibold text-foreground">
                {s.courseTitle}
              </p>
            </div>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {s.totalSessions} session{s.totalSessions !== 1 ? "s" : ""}{" "}
              recorded
            </span>
          </div>
          <AttendanceBar value={s.attendedPercent} />
          <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>{s.present} present</span>
            <span>{s.late} late</span>
            <span>{s.absent} absent</span>
            <span>{s.excused} excused</span>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
