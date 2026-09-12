"use client"

import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useForm, useWatch } from "react-hook-form"
import type { SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { DayOfWeekEnum, ClassTypeEnum } from "../schemas/schedule.schema"
import {
  useCreateSchedule,
  useUpdateSchedule,
  useScheduleById,
} from "../hooks/useTimetable"
import { courseOfferingQueryOptions } from "@/services/courseOfferingApi"
import { usersQueryOptions } from "@/services/usersApi"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"

// Use base object schema without the refine for the form
const FormSchema = z.object({
  offeringId: z.number().min(1, "Required"),
  tutorId: z.number().min(1, "Required"),
  dayOfWeek: DayOfWeekEnum,
  startTime: z.string().min(1, "Required"),
  endTime: z.string().min(1, "Required"),
  venue: z.string().min(1, "Required"),
  classType: ClassTypeEnum,
})
type FormValues = z.infer<typeof FormSchema>

const DAYS = DayOfWeekEnum.options
const CLASS_TYPES = ClassTypeEnum.options

interface ScheduleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingScheduleId?: number | null
}

export function ScheduleFormDialog({
  open,
  onOpenChange,
  editingScheduleId,
}: ScheduleFormDialogProps) {
  const isEdit = !!editingScheduleId

  const { data: existing } = useScheduleById(editingScheduleId ?? 0)
  const { data: offeringsRes, isLoading: offeringsLoading } = useQuery(
    courseOfferingQueryOptions.list()
  )
  const { data: tutorsRes, isLoading: tutorsLoading } = useQuery(
    usersQueryOptions.tutors.list()
  )
  const offerings = offeringsRes?.data ?? []
  const tutors = tutorsRes?.data ?? []

  const createMutation = useCreateSchedule()
  const updateMutation = useUpdateSchedule()
  const isPending = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      classType: "LECTURE",
      dayOfWeek: "MONDAY",
    },
  })

  // Populate form when editing
  useEffect(() => {
    if (existing) {
      reset({
        offeringId: existing.offeringId,
        tutorId: existing.tutorId,
        dayOfWeek: existing.dayOfWeek,
        startTime: existing.startTime,
        endTime: existing.endTime,
        venue: existing.venue,
        classType: existing.classType,
      })
    } else if (!isEdit) {
      reset({ classType: "LECTURE", dayOfWeek: "MONDAY" })
    }
  }, [existing, isEdit, reset])

  const selectedOfferingId = useWatch({ control, name: "offeringId" })
  const selectedTutorId = useWatch({ control, name: "tutorId" })

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    const dto = {
      offeringId: values.offeringId,
      tutorId: values.tutorId,
      dayOfWeek: values.dayOfWeek,
      startTime: values.startTime,
      endTime: values.endTime,
      venue: values.venue,
      classType: values.classType,
    }

    if (isEdit && editingScheduleId) {
      updateMutation.mutate(
        { id: editingScheduleId, dto },
        {
          onSuccess: () => {
            onOpenChange(false)
            reset()
          },
        }
      )
    } else {
      createMutation.mutate(dto, {
        onSuccess: () => {
          onOpenChange(false)
          reset()
        },
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Schedule" : "Create Schedule"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* Conflict / save error — the real endpoint rejects an
                   overlapping venue/lecturer booking with a 409 */}
          {(createMutation.error ?? updateMutation.error) && (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {(createMutation.error ?? updateMutation.error)?.status === 409
                ? "This venue or lecturer is already booked for that day and time."
                : (createMutation.error ?? updateMutation.error)?.message}
            </p>
          )}

          {/* Course Offering */}
          <div className="space-y-1">
            <Label className="text-xs">Course Offering</Label>
            <Select
              value={
                selectedOfferingId ? selectedOfferingId.toString() : undefined
              }
              onValueChange={(v) => setValue("offeringId", Number(v))}
              disabled={offeringsLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    offeringsLoading ? "Loading courses…" : "Select course"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {offerings.map((o) => (
                  <SelectItem key={o.id} value={o.id.toString()}>
                    {o.course_code} – {o.course_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.offeringId && (
              <p className="text-xs text-destructive">
                {errors.offeringId.message}
              </p>
            )}
          </div>

          {/* Lecturer */}
          <div className="space-y-1">
            <Label className="text-xs">Lecturer</Label>
            <Select
              value={selectedTutorId ? selectedTutorId.toString() : undefined}
              onValueChange={(v) => setValue("tutorId", Number(v))}
              disabled={tutorsLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    tutorsLoading ? "Loading lecturers…" : "Select lecturer"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {tutors.map((t) => (
                  <SelectItem key={t.id} value={t.id.toString()}>
                    {t.user.first_name} {t.user.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tutorId && (
              <p className="text-xs text-destructive">
                {errors.tutorId.message}
              </p>
            )}
          </div>

          {/* Day of week + Class type side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Day of Week</Label>
              <Select
                defaultValue="MONDAY"
                onValueChange={(v) =>
                  setValue("dayOfWeek", v as (typeof DAYS)[0])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d.charAt(0) + d.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Class Type</Label>
              <Select
                defaultValue="LECTURE"
                onValueChange={(v) =>
                  setValue("classType", v as (typeof CLASS_TYPES)[0])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLASS_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0) + t.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Start + End time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="startTime" className="text-xs">
                Start Time
              </Label>
              <Input id="startTime" type="time" {...register("startTime")} />
              {errors.startTime && (
                <p className="text-xs text-destructive">
                  {errors.startTime.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="endTime" className="text-xs">
                End Time
              </Label>
              <Input id="endTime" type="time" {...register("endTime")} />
              {errors.endTime && (
                <p className="text-xs text-destructive">
                  {errors.endTime.message}
                </p>
              )}
            </div>
          </div>

          {/* Venue */}
          <div className="space-y-1">
            <Label htmlFor="venue" className="text-xs">
              Venue
            </Label>
            <Input id="venue" placeholder="e.g. LT-1" {...register("venue")} />
            {errors.venue && (
              <p className="text-xs text-destructive">{errors.venue.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="min-w-24 gap-2"
            >
              {isPending && <Loader2 size={13} className="animate-spin" />}
              {isEdit ? "Save Changes" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
