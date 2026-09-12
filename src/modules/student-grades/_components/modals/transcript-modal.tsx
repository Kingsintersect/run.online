"use client"

import { motion } from "framer-motion"
import { TrendingUp, BookOpen, Award, Loader2, RefreshCw } from "lucide-react"
import Modal from "@/components/custom/Modal"
import StatusBadge from "@/components/custom/StatusBadge"
import type { GradeStatus, StudentTranscript } from "../../types/grades.types"
import { useCalculateCgpa } from "../../hooks/use-grades-mutations"

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

function CgpaBar({ value }: { value: number }) {
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
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <motion.div
          className={`h-full ${colour} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <span className="w-8 font-mono text-xs font-bold tabular-nums">
        {value.toFixed(2)}
      </span>
    </div>
  )
}

interface TranscriptModalProps {
  open: boolean
  onClose: () => void
  transcript: StudentTranscript | null
  loading: boolean
  canManage?: boolean
}

export function TranscriptModal({
  open,
  onClose,
  transcript,
  loading,
  canManage = false,
}: TranscriptModalProps) {
  const recalculateMutation = useCalculateCgpa()

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Student Transcript"
      subtitle={
        transcript
          ? `${transcript.studentMatric} · ${transcript.programName}`
          : "Loading…"
      }
    >
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {!loading && transcript && (
        <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5">
          {/* Header card */}
          <div className="flex flex-wrap items-start gap-4 rounded-2xl bg-muted/30 p-4">
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-foreground">
                {transcript.studentName}
              </h3>
              <p className="font-mono text-xs text-muted-foreground">
                {transcript.studentMatric}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {transcript.programName} ({transcript.programCode})
              </p>
              <p className="text-xs text-muted-foreground">
                {transcript.level}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-6">
              <div className="text-center">
                <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
                  CGPA
                </p>
                <p className="font-mono text-2xl font-bold text-primary">
                  {transcript.currentCGPA?.toFixed(2) ?? "—"}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
                  Credit Units
                </p>
                <p className="font-mono text-2xl font-bold text-foreground">
                  {transcript.totalCreditUnits}
                </p>
              </div>
            </div>
          </div>

          {/* CGPA History */}
          {transcript.cgpaHistory.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">
                  GPA / CGPA History
                </p>
              </div>
              <div className="space-y-2">
                {transcript.cgpaHistory.map((h, i) => (
                  <motion.div
                    key={h.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground">
                        {h.semesterName}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {h.academicYear} · {h.totalCreditUnits} units
                      </p>
                    </div>
                    <div className="flex min-w-48 shrink-0 items-center gap-4">
                      <div className="flex-1">
                        <p className="mb-1 text-[10px] text-muted-foreground">
                          GPA
                        </p>
                        <CgpaBar value={h.gpa} />
                      </div>
                      <div className="flex-1">
                        <p className="mb-1 text-[10px] text-muted-foreground">
                          CGPA
                        </p>
                        <CgpaBar value={h.cgpa} />
                      </div>
                    </div>
                    {canManage && (
                      <button
                        onClick={() =>
                          recalculateMutation.mutate({
                            studentId: transcript.studentId,
                            semesterId: Number(h.semesterId),
                          })
                        }
                        disabled={recalculateMutation.isPending}
                        title="Recalculate CGPA for this semester"
                        className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-primary/10 hover:text-primary disabled:opacity-50"
                      >
                        {recalculateMutation.isPending &&
                        recalculateMutation.variables?.semesterId ===
                          Number(h.semesterId) ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Grades by semester */}
          {(() => {
            const bySemester = new Map<string, typeof transcript.grades>()
            for (const g of transcript.grades) {
              const key = `${g.semesterId}-${g.academicYear}`
              const arr = bySemester.get(key) ?? []
              arr.push(g)
              bySemester.set(key, arr)
            }
            return Array.from(bySemester.entries()).map(([key, semGrades]) => {
              const g0 = semGrades[0]
              return (
                <div key={key}>
                  <div className="mb-2 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-semibold text-foreground">
                      {g0.semesterName} — {g0.academicYear}
                    </p>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="px-4 py-2.5 text-left text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                            Course
                          </th>
                          <th className="px-4 py-2.5 text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                            Units
                          </th>
                          <th className="px-4 py-2.5 text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                            CA
                          </th>
                          <th className="px-4 py-2.5 text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                            Exam
                          </th>
                          <th className="px-4 py-2.5 text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                            Total
                          </th>
                          <th className="px-4 py-2.5 text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                            Grade
                          </th>
                          <th className="px-4 py-2.5 text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                            GP
                          </th>
                          <th className="px-4 py-2.5 text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {semGrades.map((g) => (
                          <tr
                            key={g.id}
                            className="border-b border-border/30 last:border-0"
                          >
                            <td className="px-4 py-2.5">
                              <p className="font-mono font-semibold text-foreground">
                                {g.courseCode}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {g.courseName}
                              </p>
                            </td>
                            <td className="px-4 py-2.5 text-center font-mono text-foreground">
                              {g.creditUnits}
                            </td>
                            <td className="px-4 py-2.5 text-center font-mono text-foreground">
                              {g.caScore ?? "—"}
                            </td>
                            <td className="px-4 py-2.5 text-center font-mono text-foreground">
                              {g.examScore ?? "—"}
                            </td>
                            <td className="px-4 py-2.5 text-center font-mono font-bold text-foreground">
                              {g.totalScore ?? "—"}
                            </td>
                            <td className="px-4 py-2.5 text-center font-mono font-bold text-foreground">
                              {g.gradeLetter ?? "—"}
                            </td>
                            <td className="px-4 py-2.5 text-center font-mono text-muted-foreground">
                              {g.gradePoint?.toFixed(2) ?? "—"}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <StatusBadge {...STATUS_BADGE_MAP[g.status]} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })
          })()}

          {/* Footer note */}
          <div className="flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
            <Award className="h-3.5 w-3.5 shrink-0" />
            <span>{`This transcript is for internal review only. Official transcripts require the Registrar's seal.`}</span>
          </div>
        </div>
      )}
    </Modal>
  )
}
