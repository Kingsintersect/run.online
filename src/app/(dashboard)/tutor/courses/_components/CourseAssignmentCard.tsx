"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  BookOpen,
  Users,
  Award,
  CalendarClock,
  Edit3,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { ScheduleEditorModal } from "./ScheduleEditorModal"
import { useMyLecturerId } from "@/hooks/use-my-lecturer-id"
import { useSyncSchedule } from "@/modules/tutor-courses/hooks/use-tutor-courses"
import type {
  AssignedCourse,
  ScheduleSlotDraft,
} from "@/modules/tutor-courses/types"
import type { TimetableSlot } from "@/modules/timetable/types/timetable.types"

interface CourseAssignmentCardProps {
  course: AssignedCourse
  index: number
}

function toDraft(slot: TimetableSlot): ScheduleSlotDraft {
  return {
    id: slot.id,
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
    venue: slot.venue,
    classType: slot.classType,
  }
}

function SchedulePills({ schedule }: { schedule: TimetableSlot[] }) {
  if (schedule.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
        <AlertCircle className="h-3 w-3" />
        No schedule set
      </span>
    )
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {schedule.map((s) => (
        <span
          key={s.id}
          className="inline-flex items-center gap-1 rounded-md border border-primary/15 bg-primary/8 px-2 py-0.5 text-[10px] font-medium text-primary"
        >
          {s.dayOfWeek.slice(0, 3)} {s.startTime}–{s.endTime}
          <span className="text-muted-foreground">· {s.venue}</span>
        </span>
      ))}
    </div>
  )
}

export function CourseAssignmentCard({
  course,
  index,
}: CourseAssignmentCardProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const { lecturerId } = useMyLecturerId()
  const syncMutation = useSyncSchedule()

  const handleSave = async (slots: ScheduleSlotDraft[]) => {
    if (lecturerId === null) return
    await syncMutation.mutateAsync({
      offeringId: course.id,
      lecturerId,
      original: course.schedule.map(toDraft),
      next: slots,
    })
    setModalOpen(false)
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
        className="space-y-4 rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-mono text-xs font-semibold text-primary">
                {course.courseCode}
              </p>
              <h3 className="text-sm leading-snug font-bold text-foreground">
                {course.courseTitle}
              </h3>
              {(course.categoryPath.length > 0 ||
                course.departmentName ||
                course.facultyName) && (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {course.categoryPath.length > 0
                    ? course.categoryPath.join(" › ")
                    : [course.facultyName, course.departmentName]
                        .filter(Boolean)
                        .join(" › ")}
                </p>
              )}
            </div>
          </div>

          {/* Schedule status badge */}
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-xl border px-2.5 py-1 text-[10px] font-semibold ${
              course.schedule.length > 0
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-400"
                : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-400"
            }`}
          >
            {course.schedule.length > 0 ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                Scheduled
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3" />
                Unscheduled
              </>
            )}
          </span>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-3">
          {course.creditUnits != null && (
            <>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Award className="h-3.5 w-3.5" />
                <span>
                  {course.creditUnits} credit unit
                  {course.creditUnits !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="h-3.5 w-px bg-border" />
            </>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{course.registeredStudents ?? "—"} students registered</span>
          </div>
          {(course.semesterName || course.academicYear || course.levelName) && (
            <>
              <div className="h-3.5 w-px bg-border" />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" />
                <span>
                  {[course.levelName, course.semesterName, course.academicYear]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Programmes this course belongs to */}
        {course.programmes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {course.programmes.map((p) => (
              <span
                key={p.code}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                title={p.name}
              >
                {p.code}
                <span
                  className={
                    p.isRequired
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground/70"
                  }
                >
                  {p.isRequired ? "required" : "elective"}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Schedule display */}
        <div className="pt-0.5">
          <SchedulePills schedule={course.schedule} />
        </div>

        {/* Save error */}
        {syncMutation.isError && (
          <p className="flex items-center gap-1 text-[11px] text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            Failed to save schedule. Please try again.
          </p>
        )}

        {/* Footer action */}
        <div className="flex justify-end border-t border-border/50 pt-1">
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <Edit3 className="h-3.5 w-3.5" />
            {course.schedule.length > 0 ? "Edit Schedule" : "Set Schedule"}
          </button>
        </div>
      </motion.div>

      {/* Schedule editor */}
      {modalOpen && (
        <ScheduleEditorModal
          course={course}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          saving={syncMutation.isPending}
        />
      )}
    </>
  )
}
