"use client"

import { motion } from "framer-motion"
import { Award, BookOpen, Users } from "lucide-react"
import type { TermResultEntry } from "../types/grades.types"

// Non-credit-weighted results view for a SECONDARY_SCHOOL program — a simple
// average + class position per term, not a GPA. See
// sandbox/schema-moodel-sync-refactor/api-v2.md §"GET /students/me/results"
// and StudentResultsPage.tsx, which renders this instead of the
// CGPA/CgpaHistorySection view when the student's Program.programCategory
// is SECONDARY_SCHOOL.
export function TermResultsView({
  terms,
  loading,
}: {
  terms: TermResultEntry[]
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-40 rounded-2xl bg-muted/50" />
        ))}
      </div>
    )
  }

  if (terms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-muted-foreground">
        <BookOpen size={36} className="opacity-30" />
        <p className="text-sm">No results available yet.</p>
        <p className="text-xs opacity-70">
          Results will appear here once published.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {terms.map((term, idx) => (
        <motion.div
          key={term.semesterId}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.04 }}
          className="overflow-hidden rounded-2xl border border-border bg-card"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">
              {term.semesterName}
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Award size={13} />
                Average:{" "}
                <span className="font-mono font-bold text-foreground">
                  {term.averageScore.toFixed(2)}
                </span>
              </div>
              {term.positionInClass !== null && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users size={13} />
                  Position:{" "}
                  <span className="font-mono font-bold text-foreground">
                    {term.positionInClass}
                  </span>
                  {term.totalStudentsInClass !== null && (
                    <span>/ {term.totalStudentsInClass}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  {["Subject", "Score", "Grade"].map((h) => (
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
                {term.subjects.map((s) => (
                  <tr
                    key={s.courseCode}
                    className="border-b border-border/30 transition-colors last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-3 py-2.5">
                      <p className="text-xs font-semibold text-foreground">
                        {s.courseCode}
                      </p>
                      <p className="text-[11px] leading-tight text-muted-foreground">
                        {s.courseTitle}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-xs font-bold text-foreground">
                      {s.totalScore}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs font-semibold">
                      {s.grade}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
