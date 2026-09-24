"use client"

import { motion } from "framer-motion"
import { BookOpen, User, Calendar, ClipboardList } from "lucide-react"
import Modal from "@/components/custom/Modal"
import StatusBadge from "@/components/custom/StatusBadge"
import type { GradeStatus } from "../../types/grades.types"
import { useGradesStore } from "../../store/gradesStore"
import { useGrade } from "../../hooks/use-grades-data"

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

interface InfoRowProps {
  label: string
  value: React.ReactNode
}
function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 py-2.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="max-w-48 text-right text-xs font-medium text-foreground">
        {value}
      </span>
    </div>
  )
}

function GradeBar({
  score,
  max,
  colour,
}: {
  score: number | null
  max: number
  colour: string
}) {
  const pct = score !== null ? Math.min((score / max) * 100, 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Score</span>
        <span className="font-mono font-bold text-foreground">
          {score ?? "—"} / {max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          className={`h-full ${colour} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  )
}

// Read-only detail of one legacy grade row. Per-grade submit/approve/reject
// were removed (2026-09-24): the workflow is sheet-level now (Results
// workspace → result sheet), see use-results-mutations.ts.
interface GradeDetailModalProps {
  open: boolean
  onClose: () => void
}

export function GradeDetailModal({ open, onClose }: GradeDetailModalProps) {
  const { selectedGrade } = useGradesStore()

  // Refresh the row against server state while the modal is open — the list
  // row is the instant fallback (and what's used if GET /results/grades/:id
  // 404s).
  const { data: fetchedGrade } = useGrade(
    open ? (selectedGrade?.id ?? null) : null
  )

  if (!selectedGrade) return null
  const grade = fetchedGrade ?? selectedGrade

  const totalPct =
    grade.totalScore !== null
      ? Math.min((grade.totalScore / 100) * 100, 100)
      : 0
  const totalColour =
    totalPct >= 70
      ? "bg-emerald-500"
      : totalPct >= 50
        ? "bg-blue-500"
        : totalPct >= 40
          ? "bg-amber-500"
          : "bg-red-500"

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Grade Details"
      subtitle={`${grade.studentName} · ${grade.courseCode}`}
    >
      <div className="space-y-5 p-5">
        {/* Scores summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "CA Score",
              value: grade.caScore,
              max: 40,
              colour: "bg-blue-500",
            },
            {
              label: "Exam Score",
              value: grade.examScore,
              max: 60,
              colour: "bg-violet-500",
            },
            {
              label: "Total",
              value: grade.totalScore,
              max: 100,
              colour: totalColour,
            },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-muted/30 p-3">
              <p className="mb-2 text-[10px] tracking-wide text-muted-foreground uppercase">
                {s.label}
              </p>
              <GradeBar score={s.value} max={s.max} colour={s.colour} />
            </div>
          ))}
        </div>

        {/* Grade result */}
        <div className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-3">
          <div>
            <p className="mb-0.5 text-[10px] tracking-wide text-muted-foreground uppercase">
              Letter Grade
            </p>
            <p className="font-mono text-3xl font-bold text-foreground">
              {grade.gradeLetter ?? "—"}
            </p>
          </div>
          <div>
            <p className="mb-0.5 text-[10px] tracking-wide text-muted-foreground uppercase">
              Grade Points
            </p>
            <p className="font-mono text-3xl font-bold text-foreground">
              {grade.gradePoint?.toFixed(2) ?? "—"}
            </p>
          </div>
          <div>
            <p className="mb-0.5 text-[10px] tracking-wide text-muted-foreground uppercase">
              Status
            </p>
            <StatusBadge {...STATUS_BADGE_MAP[grade.status]} dot />
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">Student</p>
            </div>
            <InfoRow label="Name" value={grade.studentName} />
            <InfoRow
              label="Matric"
              value={<span className="font-mono">{grade.studentMatric}</span>}
            />
            <InfoRow label="Program" value={grade.programName} />
          </div>
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">Course</p>
            </div>
            <InfoRow
              label="Code"
              value={<span className="font-mono">{grade.courseCode}</span>}
            />
            <InfoRow label="Name" value={grade.courseName} />
            <InfoRow label="Units" value={grade.creditUnits} />
          </div>
          <div className="mt-3 sm:col-span-2">
            <div className="mb-2 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">Period</p>
            </div>
            <InfoRow
              label="Semester"
              value={`${grade.semesterName} ${grade.academicYear}`}
            />
            <InfoRow label="Academic Year" value={grade.academicYear} />
            {grade.approvedByName && (
              <InfoRow label="Approved by" value={grade.approvedByName} />
            )}
            {grade.remarks && (
              <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
                <div className="mb-1 flex items-center gap-1.5">
                  <ClipboardList className="h-3 w-3 text-amber-600" />
                  <p className="text-[10px] font-semibold text-amber-700 uppercase dark:text-amber-400">
                    Remarks
                  </p>
                </div>
                <p className="text-xs text-foreground">{grade.remarks}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
