"use client"

import { motion } from "framer-motion"
import { toast } from "sonner"
import { CalendarClock, Loader2, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import StatusBadge from "@/components/custom/StatusBadge"
import { useRemoveExamSchedule } from "../hooks/useExamTimetable"
import type {
  ExamSchedule,
  ExamScheduleStatus,
} from "../types/exam-timetable.types"

const STATUS_VARIANT: Record<
  ExamScheduleStatus,
  "info" | "warning" | "success" | "destructive"
> = {
  SCHEDULED: "info",
  ONGOING: "warning",
  COMPLETED: "success",
  CANCELLED: "destructive",
}

interface ExamScheduleListProps {
  exams: ExamSchedule[]
  isLoading: boolean
  canManage?: boolean
  onEdit: (exam: ExamSchedule) => void
}

// Exam Timetable — sandbox/exam-timetable/API_CONTRACTS.md §2.
export function ExamScheduleList({
  exams,
  isLoading,
  canManage = false,
  onEdit,
}: ExamScheduleListProps) {
  const removeExam = useRemoveExamSchedule()

  const handleRemove = async (id: number) => {
    try {
      await removeExam.mutateAsync(id)
      toast.success("Exam schedule removed")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove exam schedule"
      )
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  if (exams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-10 text-center">
        <CalendarClock className="mb-2 size-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No exams scheduled yet.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {exams.map((exam, index) => (
        <motion.div
          key={exam.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {exam.courseCode}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {exam.courseTitle}
                  </p>
                </div>
                <StatusBadge
                  label={exam.status}
                  variant={STATUS_VARIANT[exam.status]}
                  dot
                />
              </div>
              <p className="mb-1 text-xs text-muted-foreground">
                {exam.examDate} · {exam.startTime}–{exam.endTime}
              </p>
              <p className="mb-3 text-xs text-muted-foreground">
                {exam.venue.name} (cap. {exam.venue.capacity})
                {exam.examType !== "REGULAR" ? ` · ${exam.examType}` : ""}
              </p>
              {canManage && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => onEdit(exam)}
                  >
                    <Pencil className="size-3.5" data-icon="inline-start" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => handleRemove(exam.id)}
                    disabled={removeExam.isPending}
                    title="Remove exam schedule"
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
