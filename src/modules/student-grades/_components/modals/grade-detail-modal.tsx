"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  CheckCircle2,
  XCircle,
  BookOpen,
  User,
  Calendar,
  Hash,
  ClipboardList,
  Loader2,
  Send,
} from "lucide-react"
import Modal from "@/components/custom/Modal"
import StatusBadge from "@/components/custom/StatusBadge"
import type { GradeStatus } from "../../types/grades.types"
import { useGradesStore } from "../../store/gradesStore"
import { useGrade } from "../../hooks/use-grades-data"
import {
  useSubmitGrade,
  useApproveGrade,
  useRejectGrade,
} from "../../hooks/use-grades-mutations"

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

interface GradeDetailModalProps {
  open: boolean
  onClose: () => void
  canManage?: boolean
}

export function GradeDetailModal({
  open,
  onClose,
  canManage = false,
}: GradeDetailModalProps) {
  const { selectedGrade, updateGradeInStore } = useGradesStore()
  const [rejectRemarks, setRejectRemarks] = useState("")
  const [showRejectForm, setShowRejectForm] = useState(false)

  const submitMutation = useSubmitGrade()
  const approveMutation = useApproveGrade()
  const rejectMutation = useRejectGrade()

  // Refresh the row against server state while the modal is open — the list
  // row is the instant fallback (and what's used if GET /results/grades/:id
  // 404s).
  const { data: fetchedGrade } = useGrade(
    open ? (selectedGrade?.id ?? null) : null
  )

  if (!selectedGrade) return null
  const grade = fetchedGrade ?? selectedGrade

  const handleSubmit = async () => {
    const result = await submitMutation.mutateAsync(grade.id)
    updateGradeInStore({ ...grade, ...result })
  }

  const handleApprove = async () => {
    const result = await approveMutation.mutateAsync({ id: grade.id })
    updateGradeInStore({ ...grade, ...result })
  }

  const handleReject = async () => {
    if (!rejectRemarks.trim()) return
    const result = await rejectMutation.mutateAsync({
      id: grade.id,
      remarks: rejectRemarks.trim(),
    })
    updateGradeInStore({ ...grade, ...result })
    setRejectRemarks("")
    setShowRejectForm(false)
  }

  const loading =
    submitMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending
  // Only show submit if the user manages this grade and it's still a DRAFT
  const canSubmit = canManage && grade.status === "DRAFT"
  // Only show approve/reject if user has manage permission AND grade is in SUBMITTED status
  const canApprove = canManage && grade.status === "SUBMITTED"
  const canReject = canManage && grade.status === "SUBMITTED"

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
      footer={
        canSubmit || canApprove || canReject ? (
          <div className="flex flex-wrap items-center gap-2">
            {canSubmit && (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="ml-auto flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Submit for Approval
              </button>
            )}
            {canReject && (
              <button
                onClick={() => setShowRejectForm((v) => !v)}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-xl border border-destructive/30 px-4 py-2 text-xs font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </button>
            )}
            {canApprove && (
              <button
                onClick={handleApprove}
                disabled={loading}
                className="ml-auto flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Approve Grade
              </button>
            )}
          </div>
        ) : null
      }
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

        {/* Reject form - only show if user can manage */}
        {showRejectForm && canReject && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="rounded-xl border border-destructive/30 bg-destructive/5 p-4"
          >
            <div className="mb-2 flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 text-destructive" />
              <p className="text-xs font-semibold text-destructive">
                Rejection Reason
              </p>
            </div>
            <textarea
              value={rejectRemarks}
              onChange={(e) => setRejectRemarks(e.target.value)}
              rows={3}
              placeholder="Explain why this grade is being rejected…"
              className="w-full resize-none rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => {
                  setShowRejectForm(false)
                  setRejectRemarks("")
                }}
                className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectRemarks.trim() || loading}
                className="flex items-center gap-1.5 rounded-xl bg-destructive px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Confirm Reject
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </Modal>
  )
}
