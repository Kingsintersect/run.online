"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import gsap from "gsap"
import { Medal, Trophy, TrendingUp, Hash } from "lucide-react"
import { GradeStatsCards } from "../stats-cards"
import { GradeDistributionChart } from "../charts/grade-distribution-chart"
import { ProgramPerformanceChart } from "../charts/program-performance-chart"
import { CgpaTrendChart } from "../charts/cgpa-trend-chart"
import SectionCard from "@/components/custom/SectionCard"
import {
  useGradesSummary,
  useGradeDistributionData,
  useProgramPerformanceData,
  useCgpaTrendsData,
  useTopPerformersData,
  useGradeScales,
} from "../../hooks/use-grades-data"

const MEDAL_COLOURS = ["text-yellow-500", "text-slate-400", "text-amber-700"]

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, damping: 18, stiffness: 140 },
  },
}

interface GradesSummaryPageProps {
  canViewOwn?: boolean
}

export default function GradesSummaryPage({
  canViewOwn = true,
}: GradesSummaryPageProps) {
  const { data: stats, isLoading: statsLoading } = useGradesSummary()
  const { data: gradeDistribution = [] } = useGradeDistributionData()
  const { data: programPerformance = [] } = useProgramPerformanceData()
  const { data: cgpaTrends = [] } = useCgpaTrendsData()
  const { data: topPerformers = [] } = useTopPerformersData()
  const { scales } = useGradeScales()
  const headerRef = useRef<HTMLDivElement>(null)
  const loading = statsLoading

  useEffect(() => {
    if (!headerRef.current) return
    gsap.from(headerRef.current, { y: -18, duration: 0.6, ease: "power3.out" })
  }, [])

  // If user doesn't have permission, show nothing
  if (!canViewOwn) return null

  return (
    <div className="space-y-5">
      {/* Rest of your component remains the same */}
      {!loading && stats && (
        <motion.div
          ref={headerRef as unknown as React.RefObject<HTMLDivElement>}
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-5"
        >
          {/* Stats */}
          <motion.div variants={fadeUp}>
            <GradeStatsCards stats={stats} />
          </motion.div>

          {/* Charts row */}
          <motion.div
            variants={fadeUp}
            className="grid grid-cols-1 gap-4 lg:grid-cols-3"
          >
            <SectionCard
              title="Grade Distribution"
              icon={Hash}
              className="lg:col-span-1"
            >
              <GradeDistributionChart data={gradeDistribution} />
            </SectionCard>
            <SectionCard
              title="Program Performance"
              icon={TrendingUp}
              className="lg:col-span-1"
            >
              <ProgramPerformanceChart data={programPerformance} />
            </SectionCard>
            <SectionCard
              title="GPA Trend by Semester"
              icon={TrendingUp}
              className="lg:col-span-1"
            >
              <CgpaTrendChart data={cgpaTrends} />
            </SectionCard>
          </motion.div>

          {/* Top performers + Grade scale - only show for staff/tutors */}
          {canViewOwn && topPerformers.length > 0 && (
            <motion.div
              variants={fadeUp}
              className="grid grid-cols-1 gap-4 lg:grid-cols-2"
            >
              {/* Top performers */}
              <SectionCard title="Top Performers" icon={Trophy}>
                <div className="space-y-2 py-1">
                  {topPerformers.map((p, i) => (
                    <motion.div
                      key={p.studentId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 rounded-xl bg-muted/30 px-3 py-2.5 transition hover:bg-muted/50"
                    >
                      <div className="flex w-6 shrink-0 justify-center">
                        {i < 3 ? (
                          <Medal className={`h-4 w-4 ${MEDAL_COLOURS[i]}`} />
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground">
                            {i + 1}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-foreground">
                          {p.studentName}
                        </p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {p.studentMatric}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-lg bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
                        {p.programCode}
                      </span>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-sm font-bold text-foreground">
                          {p.cgpa.toFixed(2)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          CGPA
                        </p>
                      </div>
                    </motion.div>
                  ))}
                  {topPerformers.length === 0 && (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      No data available
                    </p>
                  )}
                </div>
              </SectionCard>

              {/* Grade scale reference */}
              <SectionCard title="Grade Scale Reference" icon={Hash}>
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        {[
                          "Grade",
                          "Range (%)",
                          "Grade Points",
                          "Description",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-3 py-2.5 text-left text-[10px] font-semibold tracking-wide text-muted-foreground uppercase"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {scales.map((s, i) => (
                        <tr
                          key={s.grade}
                          className={`border-b border-border/30 last:border-0 ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                        >
                          <td className="px-3 py-2.5">
                            <span
                              className="font-mono text-sm font-bold"
                              style={{
                                color: s.color
                                  ? `var(--color-${s.color}-500, #64748b)`
                                  : "var(--foreground)",
                              }}
                            >
                              {s.grade}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-foreground">
                            {s.minScore}–{s.maxScore}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-foreground">
                            {s.gradePoint.toFixed(2)}
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">
                            {s.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Skeleton while loading */}
      {loading && (
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-muted" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-muted" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
