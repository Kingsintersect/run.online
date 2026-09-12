"use client"

import { motion } from "framer-motion"
import {
  Send,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Users,
  BookOpen,
  TrendingUp,
  Banknote,
} from "lucide-react"
import Modal from "@/components/custom/Modal"
import type { Grade, PublishSummary } from "../../types/grades.types"
import { gradesService } from "../../services/grades.service"

interface StatChipProps {
  icon: React.ReactNode
  label: string
  value: string | number
  colour: string
}
function StatChip({ icon, label, value, colour }: StatChipProps) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${colour}`}
    >
      <div className="shrink-0">{icon}</div>
      <div>
        <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <p className="text-sm font-bold text-foreground tabular-nums">
          {value}
        </p>
      </div>
    </div>
  )
}

interface PublishConfirmModalProps {
  open: boolean
  onClose: () => void
  /** The currently-loaded course/semester preview — informational only. The
   * real publish action is semester-wide, not scoped to these rows. */
  previewGrades: Grade[]
  onConfirm: () => Promise<void>
  publishing: boolean
  courseName: string
  courseCode: string
  semesterLabel: string
  academicYear: string
  withheldCount?: number
}

export function PublishConfirmModal({
  open,
  onClose,
  previewGrades,
  onConfirm,
  publishing,
  courseName,
  courseCode,
  semesterLabel,
  academicYear,
  withheldCount = 0,
}: PublishConfirmModalProps) {
  const summary: PublishSummary =
    gradesService.buildPublishSummary(previewGrades)
  const approvedCount = previewGrades.filter(
    (g) => g.status === "APPROVED"
  ).length

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Confirm Publication"
      subtitle={`${courseCode} — ${courseName}`}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={publishing}
            className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onConfirm}
            disabled={publishing}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {publishing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Publishing…
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                Publish Semester Results
              </>
            )}
          </motion.button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        {/* Semester-wide scope warning */}
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/50 dark:bg-amber-950/30">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              This publishes every approved grade in {semesterLabel} ·{" "}
              {academicYear}
            </p>
            <p className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-500">
              Not just {courseCode} — the backend publish action is
              semester-wide, across every course. The numbers below are only a
              preview of this course&apos;s currently loaded results.
            </p>
          </div>
        </div>

        {/* Context */}
        <div className="flex items-start gap-3 rounded-xl bg-muted/30 p-3">
          <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="text-xs font-semibold text-foreground">
              {courseCode} — {courseName} (preview)
            </p>
            <p className="text-[11px] text-muted-foreground">
              {semesterLabel} · {academicYear}
            </p>
          </div>
        </div>

        {/* Stats chips */}
        <div className="grid grid-cols-2 gap-2">
          <StatChip
            icon={<Users className="h-4 w-4 text-primary" />}
            label="Students"
            value={previewGrades.length}
            colour="border-border"
          />
          <StatChip
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
            label="Pass Rate"
            value={`${summary.passRate}%`}
            colour="border-emerald-200 dark:border-emerald-900/50"
          />
          <StatChip
            icon={<TrendingUp className="h-4 w-4 text-blue-500" />}
            label="Avg Score"
            value={summary.avgScore !== null ? `${summary.avgScore}` : "—"}
            colour="border-blue-200 dark:border-blue-900/50"
          />
          <StatChip
            icon={<CheckCircle2 className="h-4 w-4 text-violet-500" />}
            label="Approved"
            value={approvedCount}
            colour="border-violet-200 dark:border-violet-900/50"
          />
        </div>

        {/* Warning for fee-withheld students */}
        {withheldCount > 0 && (
          <div className="flex items-start gap-2.5 rounded-xl border border-orange-200 bg-orange-50 p-3 dark:border-orange-800/40 dark:bg-orange-950/20">
            <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />
            <div>
              <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">
                {withheldCount} student{withheldCount !== 1 ? "s" : ""} excluded
                — outstanding fees
              </p>
              <p className="mt-0.5 text-[11px] text-orange-600 dark:text-orange-500">
                These results are withheld and will not be published until the
                fee balance is cleared.
              </p>
            </div>
          </div>
        )}

        {/* Confirm note */}
        <p className="text-xs text-muted-foreground">
          Once published, students will be able to view these results. This
          action can only be reversed by an administrator.
        </p>
      </div>
    </Modal>
  )
}
