"use client"

import { useEffect, useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { AlertTriangle, Loader2 } from "lucide-react"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCourseOfferings } from "@/hooks/useCourseOfferings"
import { useVenues } from "../hooks/useExamTimetable"
import {
  useCreateExamSchedule,
  useUpdateExamSchedule,
  useCheckExamConflict,
} from "../hooks/useExamTimetable"
import {
  examScheduleSchema,
  type ExamScheduleFormValues,
} from "../schemas/exam-schedule.schema"
import type { ExamSchedule } from "../types/exam-timetable.types"

interface Tutor {
  id: number
  name: string
}

interface ExamScheduleFormDialogProps {
  open: boolean
  onClose: () => void
  examSchedule?: ExamSchedule | null
  tutors: Tutor[]
}

// Exam Timetable — sandbox/exam-timetable/API_CONTRACTS.md §2–3.
export function ExamScheduleFormDialog({
  open,
  onClose,
  examSchedule,
  tutors,
}: ExamScheduleFormDialogProps) {
  const isEditing = !!examSchedule
  const { data: offeringsData } = useCourseOfferings()
  const { data: venuesData } = useVenues({ isExamHall: true, isActive: true })
  const createExam = useCreateExamSchedule()
  const updateExam = useUpdateExamSchedule()
  const checkConflict = useCheckExamConflict()
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)

  const offerings = offeringsData?.data ?? []
  const venues = venuesData?.data ?? []
  const isPending = createExam.isPending || updateExam.isPending

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ExamScheduleFormValues>({
    resolver: zodResolver(examScheduleSchema),
    defaultValues: {
      courseOfferingId: 0,
      venueId: 0,
      examDate: "",
      startTime: "09:00",
      endTime: "11:00",
      examType: "REGULAR",
      invigilatorIds: [],
      notes: "",
    },
  })

  useEffect(() => {
    if (!open) return
    setConflictWarning(null)
    reset({
      courseOfferingId: examSchedule?.courseOfferingId ?? 0,
      venueId: examSchedule?.venue.id ?? 0,
      examDate: examSchedule?.examDate ?? "",
      startTime: examSchedule?.startTime ?? "09:00",
      endTime: examSchedule?.endTime ?? "11:00",
      examType: examSchedule?.examType ?? "REGULAR",
      invigilatorIds: examSchedule?.invigilatorIds ?? [],
      notes: examSchedule?.notes ?? "",
    })
  }, [open, examSchedule, reset])

  const [venueId, examDate, startTime, endTime, invigilatorIds] = watch([
    "venueId",
    "examDate",
    "startTime",
    "endTime",
    "invigilatorIds",
  ])

  const handleCheckConflict = async () => {
    if (!venueId || !examDate || !startTime || !endTime) {
      toast.error("Fill in venue, date, and time first.")
      return
    }
    try {
      const result = await checkConflict.mutateAsync({
        venueId,
        examDate,
        startTime,
        endTime,
        invigilatorIds,
        excludeExamId: examSchedule?.id,
      })
      const issues: string[] = []
      if (result.venueConflict.hasConflict) {
        issues.push(
          `Venue already booked: ${result.venueConflict.conflictingExams
            .map((e) => e.courseCode)
            .join(", ")}`
        )
      }
      if (result.invigilatorConflicts.length > 0) {
        issues.push(
          `Invigilator conflict for ${result.invigilatorConflicts.length} person(s)`
        )
      }
      setConflictWarning(issues.length > 0 ? issues.join(" · ") : null)
      if (issues.length === 0) toast.success("No conflicts found")
    } catch {
      // Not a blocking error, since this check is advisory only (see
      // README.md §3).
      toast.error("Couldn't check conflicts right now.")
    }
  }

  const onSubmit = async (values: ExamScheduleFormValues) => {
    try {
      if (isEditing) {
        await updateExam.mutateAsync({ id: examSchedule.id, payload: values })
        toast.success("Exam schedule updated")
      } else {
        await createExam.mutateAsync(values)
        toast.success("Exam scheduled")
      }
      onClose()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save exam schedule"
      )
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Exam Schedule" : "Schedule Exam"}
      subtitle="Date, time, venue and invigilators for one exam"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isPending}>
            {isPending && (
              <Loader2
                className="size-4 animate-spin"
                data-icon="inline-start"
              />
            )}
            {isEditing ? "Save Changes" : "Schedule Exam"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Course Offering</Label>
          <Controller
            control={control}
            name="courseOfferingId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : undefined}
                onValueChange={(v) => field.onChange(Number(v))}
                disabled={isEditing}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select course offering" />
                </SelectTrigger>
                <SelectContent>
                  {offerings.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.course_code} — {o.course_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.courseOfferingId && (
            <p className="text-sm text-destructive">
              {errors.courseOfferingId.message}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Venue</Label>
            <Controller
              control={control}
              name="venueId"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : undefined}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select venue" />
                  </SelectTrigger>
                  <SelectContent>
                    {venues.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.name} ({v.capacity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.venueId && (
              <p className="text-sm text-destructive">
                {errors.venueId.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Exam Type</Label>
            <Controller
              control={control}
              name="examType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REGULAR">Regular</SelectItem>
                    <SelectItem value="MAKEUP">Makeup</SelectItem>
                    <SelectItem value="RESIT">Resit</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="exam-date">Exam Date</Label>
            <Input
              id="exam-date"
              type="date"
              aria-invalid={!!errors.examDate}
              {...register("examDate")}
            />
            {errors.examDate && (
              <p className="text-sm text-destructive">
                {errors.examDate.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exam-start">Start Time</Label>
            <Input id="exam-start" type="time" {...register("startTime")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exam-end">End Time</Label>
            <Input id="exam-end" type="time" {...register("endTime")} />
            {errors.endTime && (
              <p className="text-sm text-destructive">
                {errors.endTime.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>
            Invigilators
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              (optional)
            </span>
          </Label>
          <Controller
            control={control}
            name="invigilatorIds"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {tutors.map((t) => {
                  const selected = (field.value ?? []).includes(t.id)
                  return (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => {
                        const current = field.value ?? []
                        field.onChange(
                          selected
                            ? current.filter((id) => id !== t.id)
                            : [...current, t.id]
                        )
                      }}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {t.name}
                    </button>
                  )
                })}
              </div>
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exam-notes">
            Notes
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              (optional)
            </span>
          </Label>
          <Textarea
            id="exam-notes"
            rows={2}
            placeholder="Bring calculators, no phones…"
            {...register("notes")}
          />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2">
          <p className="text-xs text-muted-foreground">
            Advisory check — won&apos;t block a deliberate double-booking.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCheckConflict}
            disabled={checkConflict.isPending}
          >
            {checkConflict.isPending && (
              <Loader2
                className="size-3.5 animate-spin"
                data-icon="inline-start"
              />
            )}
            Check Conflicts
          </Button>
        </div>
        {conflictWarning && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            {conflictWarning}
          </div>
        )}
      </div>
    </Modal>
  )
}
