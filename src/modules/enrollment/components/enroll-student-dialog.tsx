"use client"

import { useForm, useWatch } from "react-hook-form"
import type { SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import Modal from "@/components/custom/Modal"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { CreateEnrollmentSchema } from "../schemas"
import type { CreateEnrollmentDto } from "../types"
import { useCreateEnrollment } from "../hooks/use-enrollment-mutations"
import { usersQueryOptions } from "@/services/usersApi"
import { courseOfferingQueryOptions } from "@/services/courseOfferingApi"
import { useAcademicCalendar } from "@/modules/timetable/hooks/useAcademicCalendar"

interface EnrollStudentDialogProps {
  open: boolean
  onClose: () => void
}

export function EnrollStudentDialog({
  open,
  onClose,
}: EnrollStudentDialogProps) {
  const { data: studentsRes, isLoading: studentsLoading } = useQuery(
    usersQueryOptions.students.list()
  )
  const { data: offeringsRes, isLoading: offeringsLoading } = useQuery(
    courseOfferingQueryOptions.list()
  )
  const { data: calendar } = useAcademicCalendar()
  const createMutation = useCreateEnrollment()

  const students = studentsRes?.data ?? []
  const offerings = offeringsRes?.data ?? []
  const semesters = calendar?.semesters ?? []

  const {
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateEnrollmentDto>({
    resolver: zodResolver(CreateEnrollmentSchema),
  })

  const [studentId, offeringId, semesterId] = useWatch({
    control,
    name: ["studentId", "offeringId", "semesterId"],
  })

  const onSubmit: SubmitHandler<CreateEnrollmentDto> = (dto) => {
    createMutation.mutate(dto, {
      onSuccess: () => {
        reset()
        onClose()
      },
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Enroll a Student"
      subtitle="Add a student to a course offering"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-5">
        {createMutation.isError && (
          <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {createMutation.error?.status === 409
              ? "This student is already enrolled in that offering."
              : (createMutation.error?.message ?? "Failed to enroll student.")}
          </p>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs">Student</Label>
          <Select
            value={studentId ? String(studentId) : undefined}
            onValueChange={(v) => setValue("studentId", Number(v))}
            disabled={studentsLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  studentsLoading ? "Loading students…" : "Select student"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.matric_number} — {s.user.first_name} {s.user.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.studentId && (
            <p className="text-xs text-destructive">
              {errors.studentId.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Course Offering</Label>
          <Select
            value={offeringId ? String(offeringId) : undefined}
            onValueChange={(v) => setValue("offeringId", Number(v))}
            disabled={offeringsLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  offeringsLoading
                    ? "Loading offerings…"
                    : "Select course offering"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {offerings.map((o) => (
                <SelectItem key={o.id} value={String(o.id)}>
                  {o.course_code} — {o.course_title}
                  {o.max_capacity ? ` (max ${o.max_capacity})` : ""}
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

        <div className="space-y-1.5">
          <Label className="text-xs">Semester</Label>
          <Select
            value={semesterId ? String(semesterId) : undefined}
            onValueChange={(v) => setValue("semesterId", Number(v))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select semester" />
            </SelectTrigger>
            <SelectContent>
              {semesters.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.semesterId && (
            <p className="text-xs text-destructive">
              {errors.semesterId.message}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="min-w-24 gap-2"
          >
            {createMutation.isPending && (
              <Loader2 size={13} className="animate-spin" />
            )}
            Enroll
          </Button>
        </div>
      </form>
    </Modal>
  )
}
