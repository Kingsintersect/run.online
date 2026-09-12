"use client"

import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useForm, useWatch, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  offeringSchema,
  type OfferingFormValues,
  updateOfferingSchema,
  type UpdateOfferingFormValues,
  assignLecturerSchema,
  type AssignLecturerFormValues,
  classScheduleSchema,
  type ClassScheduleFormValues,
} from "@/schemas/school.schema"
import {
  useCourseOfferings,
  useCourseOffering,
  useCreateOffering,
  useUpdateOffering,
  useCancelOffering,
  useAssignLecturer,
  useRemoveLecturer,
  useCreateSchedule,
  useUpdateSchedule,
  useRemoveSchedule,
} from "@/hooks/useCourseOfferings"
import { useCourses } from "@/hooks/useCourseManagement"
import { useAcademicSessions } from "@/hooks/useAcademicSessions"
import { useSemesters } from "@/hooks/useSemesters"
import { useTutors } from "@/modules/user-management/hooks/useUsersData"
import { formatOfferingCategory } from "@/lib/academic/course-offering-enrichment"
import type {
  ClassSchedule,
  CourseOfferingStatus,
  OfferingLecturerAssignment,
} from "@/types/school"
import Combobox from "@/components/custom/Combobox"
import StatusBadge from "@/components/custom/StatusBadge"
import Modal from "@/components/custom/Modal"
import { EmptyState } from "./EmptyState"

import { Card, CardContent } from "@/components/ui/card"
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
import {
  CalendarRange,
  Plus,
  Loader2,
  Settings2,
  Ban,
  Users,
  Clock,
  Trash2,
  Pencil,
} from "lucide-react"

const statusBadge: Record<
  CourseOfferingStatus,
  { label: string; variant: "info" | "success" | "destructive" | "default" }
> = {
  PLANNED: { label: "Planned", variant: "default" },
  OPEN: { label: "Open", variant: "success" },
  CLOSED: { label: "Closed", variant: "info" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
}

const roleBadgeVariant: Record<string, "success" | "info" | "purple"> = {
  primary: "success",
  assistant: "info",
  tutorial: "purple",
}

interface OfferingsManagerProps {
  canManage?: boolean
}

export function OfferingsManager({ canManage = false }: OfferingsManagerProps) {
  const { data: sessions } = useAcademicSessions()
  const [sessionId, setSessionId] = useState<number | null>(null)
  const { data: semesters } = useSemesters(sessionId)
  const [semesterId, setSemesterId] = useState<number | null>(null)

  const { data: offeringsData, isLoading } = useCourseOfferings(
    sessionId && semesterId ? { sessionId, semesterId } : undefined
  )
  const { data: coursesData } = useCourses()

  const [showCreate, setShowCreate] = useState(false)
  const [managingId, setManagingId] = useState<number | null>(null)

  const offerings = offeringsData?.data ?? []
  const courses = useMemo(() => coursesData?.data ?? [], [coursesData])

  const courseOptions = useMemo(
    () =>
      [...courses]
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((c) => ({ value: c.id, label: c.code, description: c.title })),
    [courses]
  )

  const createOffering = useCreateOffering()
  const updateOffering = useUpdateOffering()
  const cancelOffering = useCancelOffering()
  const [editingId, setEditingId] = useState<number | null>(null)

  const {
    control,
    handleSubmit,
    reset,
    register,
    formState: { errors },
  } = useForm<OfferingFormValues>({
    resolver: zodResolver(offeringSchema),
    defaultValues: {
      course_id: 0,
      academic_session_id: 0,
      semester_id: 0,
      max_capacity: undefined,
      status: "PLANNED",
    },
  })

  const openCreate = () => {
    reset({
      course_id: 0,
      academic_session_id: sessionId ?? 0,
      semester_id: semesterId ?? 0,
      max_capacity: undefined,
      status: "PLANNED",
    })
    setShowCreate(true)
  }

  const onCreate = async (values: OfferingFormValues) => {
    await createOffering.mutateAsync(values)
    setShowCreate(false)
  }

  const handleCancel = async (id: number) => {
    await cancelOffering.mutateAsync(id)
  }

  const editForm = useForm<UpdateOfferingFormValues>({
    resolver: zodResolver(updateOfferingSchema),
    defaultValues: { max_capacity: undefined, status: "PLANNED" },
  })

  const openEdit = (offering: (typeof offerings)[number]) => {
    editForm.reset({
      max_capacity: offering.max_capacity ?? undefined,
      status: offering.status,
    })
    setEditingId(offering.id)
  }

  const onEditSubmit = async (values: UpdateOfferingFormValues) => {
    if (!editingId) return
    await updateOffering.mutateAsync({ id: editingId, payload: values })
    setEditingId(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Course Offerings
        </h2>
        <p className="text-sm text-muted-foreground">
          Offer courses for a session and semester, assign lecturers, and set
          the weekly class schedule.
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-3 pt-4 pb-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Academic Session</Label>
            <Select
              value={sessionId ? String(sessionId) : ""}
              onValueChange={(v) => {
                setSessionId(Number(v))
                setSemesterId(null)
              }}
            >
              <SelectTrigger className="h-10 w-full rounded-xl border-transparent bg-muted">
                <SelectValue placeholder="Select session" />
              </SelectTrigger>
              <SelectContent>
                {(sessions ?? []).map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                    {s.isActive ? " (Active)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Semester</Label>
            <Select
              value={semesterId ? String(semesterId) : ""}
              onValueChange={(v) => setSemesterId(Number(v))}
              disabled={!sessionId}
            >
              <SelectTrigger className="h-10 w-full rounded-xl border-transparent bg-muted">
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent>
                {(semesters ?? []).map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                    {s.isActive ? " (Active)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {canManage && (
            <div className="flex items-end">
              <Button
                onClick={openCreate}
                disabled={!sessionId || !semesterId}
                className="w-full"
              >
                <Plus className="size-4" data-icon="inline-start" />
                New Offering
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {!sessionId || !semesterId ? (
        <EmptyState
          icon={CalendarRange}
          title="Select a session and semester"
          description="Choose an academic session and semester above to view or create offerings."
        />
      ) : isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : offerings.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="No offerings yet"
          description="Offer a course for this session and semester to get started."
          action={
            canManage ? (
              <Button onClick={openCreate}>
                <Plus className="size-4" data-icon="inline-start" />
                New Offering
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {offerings.map((o, index) => (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.04 }}
            >
              <Card>
                <CardContent className="space-y-3 pt-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-sm font-semibold text-foreground">
                        {o.course_code}
                      </p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {o.course_title}
                      </p>
                      {formatOfferingCategory(o) && (
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground/80">
                          {formatOfferingCategory(o)}
                        </p>
                      )}
                    </div>
                    <StatusBadge
                      label={statusBadge[o.status].label}
                      variant={statusBadge[o.status].variant}
                      dot
                    />
                  </div>
                  {(o.credit_units != null ||
                    o.level_name ||
                    o.course_type) && (
                    <p className="text-[11px] text-muted-foreground">
                      {[
                        o.credit_units != null ? `${o.credit_units} CU` : null,
                        o.level_name,
                        o.course_type,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="size-3.5" />
                    {o.enrolled_count !== null
                      ? `Enrolled: ${o.enrolled_count}`
                      : "Enrolled: —"}
                    {o.max_capacity ? ` / ${o.max_capacity}` : " (unlimited)"}
                  </div>
                  {o.programs.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {o.programs.map((p) => (
                        <span
                          key={p.id}
                          className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                          title={`${p.name}${p.is_required ? " · required" : " · elective"}`}
                        >
                          {p.code}
                          {p.is_required ? "" : " (elective)"}
                        </span>
                      ))}
                    </div>
                  )}
                  {canManage && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setManagingId(o.id)}
                      >
                        <Settings2
                          className="size-3.5"
                          data-icon="inline-start"
                        />
                        Manage
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(o)}
                        title="Edit capacity/status"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      {o.status !== "CANCELLED" && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleCancel(o.id)}
                          disabled={cancelOffering.isPending}
                          title="Cancel offering"
                        >
                          <Ban className="size-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Offering Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="New Course Offering"
        subtitle="Offer a course for the selected session and semester"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit(onCreate)}
              disabled={createOffering.isPending}
            >
              {createOffering.isPending && (
                <Loader2
                  className="size-4 animate-spin"
                  data-icon="inline-start"
                />
              )}
              Create Offering
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Course</Label>
            <Controller
              control={control}
              name="course_id"
              render={({ field }) => (
                <Combobox
                  options={courseOptions}
                  value={field.value || null}
                  onChange={(v) => field.onChange(Number(v))}
                  placeholder="Select a course"
                  searchPlaceholder="Search by code or title…"
                />
              )}
            />
            {errors.course_id && (
              <p className="text-sm text-destructive">
                {errors.course_id.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Max Capacity (optional)</Label>
              <Input
                type="number"
                min={0}
                placeholder="0 = unlimited"
                {...register("max_capacity", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-10 w-full rounded-xl border-transparent bg-muted">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLANNED">Planned</SelectItem>
                      <SelectItem value="OPEN">Open</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Offering Modal (capacity/status only — the only fields PATCH accepts) */}
      <Modal
        open={!!editingId}
        onClose={() => setEditingId(null)}
        title="Edit Offering"
        subtitle="Update capacity or status"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
            <Button
              onClick={editForm.handleSubmit(onEditSubmit)}
              disabled={updateOffering.isPending}
            >
              {updateOffering.isPending && (
                <Loader2
                  className="size-4 animate-spin"
                  data-icon="inline-start"
                />
              )}
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Max Capacity (optional)</Label>
            <Input
              type="number"
              min={0}
              placeholder="0 = unlimited"
              {...editForm.register("max_capacity", { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Controller
              control={editForm.control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-10 w-full rounded-xl border-transparent bg-muted">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLANNED">Planned</SelectItem>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </Modal>

      {/* Manage Offering Modal (Lecturers + Schedule) */}
      {managingId && (
        <OfferingDetailModal
          offeringId={managingId}
          onClose={() => setManagingId(null)}
          canManage={canManage}
        />
      )}
    </div>
  )
}

function OfferingDetailModal({
  offeringId,
  onClose,
  canManage,
}: {
  offeringId: number
  onClose: () => void
  canManage: boolean
}) {
  const { data: offeringData, isLoading } = useCourseOffering(offeringId)
  const { data: tutorsData } = useTutors()
  const offering = offeringData?.data
  const tutors = useMemo(() => tutorsData?.data ?? [], [tutorsData])

  const lecturerName = (lecturerId: number) => {
    const t = tutors.find((x) => x.id === lecturerId)
    return t
      ? `${t.user.first_name ?? ""} ${t.user.last_name ?? ""}`.trim()
      : `Lecturer #${lecturerId}`
  }

  const assignLecturer = useAssignLecturer()
  const removeLecturer = useRemoveLecturer()
  const createSchedule = useCreateSchedule()
  const updateSchedule = useUpdateSchedule(offeringId)
  const removeSchedule = useRemoveSchedule(offeringId)

  const [showAssign, setShowAssign] = useState(false)
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | null>(
    null
  )

  const assignedLecturerIds = useMemo(
    () => new Set((offering?.lecturers ?? []).map((l) => l.lecturer_id)),
    [offering]
  )
  const availableLecturers = useMemo(
    () =>
      tutors
        .filter((t) => !assignedLecturerIds.has(t.id))
        .map((t) => ({
          value: t.id,
          label: `${t.user.first_name ?? ""} ${t.user.last_name ?? ""}`.trim(),
          description: t.designation,
        })),
    [tutors, assignedLecturerIds]
  )

  const assignForm = useForm<AssignLecturerFormValues>({
    resolver: zodResolver(assignLecturerSchema),
    defaultValues: { lecturer_id: 0, role: "primary" },
  })

  const onAssign = async (values: AssignLecturerFormValues) => {
    await assignLecturer.mutateAsync({
      offering_id: offeringId,
      lecturer_id: values.lecturer_id,
      role: values.role,
    })
    assignForm.reset({ lecturer_id: 0, role: "primary" })
    setShowAssign(false)
  }

  const scheduleForm = useForm<ClassScheduleFormValues>({
    resolver: zodResolver(classScheduleSchema),
    defaultValues: {
      lecturer_id: 0,
      day_of_week: "Monday",
      start_time: "09:00",
      end_time: "11:00",
      venue: "",
      class_type: "lecture",
    },
  })
  const watchedDayOfWeek = useWatch({
    control: scheduleForm.control,
    name: "day_of_week",
  })
  const watchedClassType = useWatch({
    control: scheduleForm.control,
    name: "class_type",
  })

  const openAddSchedule = () => {
    setEditingSchedule(null)
    scheduleForm.reset({
      lecturer_id: 0,
      day_of_week: "Monday",
      start_time: "09:00",
      end_time: "11:00",
      venue: "",
      class_type: "lecture",
    })
    setShowScheduleForm(true)
  }

  const openEditSchedule = (s: ClassSchedule) => {
    setEditingSchedule(s)
    scheduleForm.reset({
      lecturer_id: s.lecturer_id,
      day_of_week: s.day_of_week,
      start_time: s.start_time,
      end_time: s.end_time,
      venue: s.venue,
      class_type: s.class_type,
    })
    setShowScheduleForm(true)
  }

  const onSubmitSchedule = async (values: ClassScheduleFormValues) => {
    if (editingSchedule) {
      await updateSchedule.mutateAsync({
        id: editingSchedule.id,
        payload: values,
      })
    } else {
      await createSchedule.mutateAsync({ offering_id: offeringId, ...values })
    }
    setShowScheduleForm(false)
    setEditingSchedule(null)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={
        offering
          ? `${offering.course_code} — ${offering.course_title}`
          : "Offering"
      }
      size="lg"
    >
      {isLoading || !offering ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="max-h-[65vh] space-y-6 overflow-y-auto pr-1">
          {/* Offering context */}
          <div className="space-y-1.5 rounded-xl border border-border bg-muted/30 p-3">
            {formatOfferingCategory(offering) && (
              <p className="text-xs text-muted-foreground">
                {formatOfferingCategory(offering)}
              </p>
            )}
            <p className="text-xs text-foreground">
              {[
                offering.credit_units != null
                  ? `${offering.credit_units} CU`
                  : null,
                offering.level_name,
                offering.course_type,
                [offering.semester_name, offering.session_name]
                  .filter(Boolean)
                  .join(", ") || null,
                offering.enrolled_count != null
                  ? `${offering.enrolled_count} enrolled`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ") || "No additional details"}
            </p>
            {offering.programs.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {offering.programs.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center rounded-md bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                    title={`${p.name} · ${p.degree_type}${p.is_required ? " · required" : " · elective"}`}
                  >
                    {p.code}
                    {p.is_required ? "" : " (elective)"}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Lecturers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                Assigned Lecturers
              </h3>
              {canManage && (
                <Button
                  size="sm"
                  onClick={() => setShowAssign(true)}
                  disabled={availableLecturers.length === 0}
                >
                  <Plus className="size-3.5" data-icon="inline-start" />
                  Assign
                </Button>
              )}
            </div>
            {offering.lecturers.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No lecturers assigned yet.
              </p>
            ) : (
              <div className="space-y-2">
                {offering.lecturers.map((l: OfferingLecturerAssignment) => (
                  <div
                    key={l.lecturer_id}
                    className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {lecturerName(l.lecturer_id)}
                      </span>
                      <StatusBadge
                        label={l.role}
                        variant={roleBadgeVariant[l.role] ?? "info"}
                      />
                    </div>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          removeLecturer.mutate({
                            offeringId,
                            lecturerId: l.lecturer_id,
                          })
                        }
                        disabled={removeLecturer.isPending}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Schedule */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                Weekly Schedule
              </h3>
              {canManage && (
                <Button size="sm" onClick={openAddSchedule}>
                  <Plus className="size-3.5" data-icon="inline-start" />
                  Add Schedule
                </Button>
              )}
            </div>
            {offering.schedules.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No class schedule set yet.
              </p>
            ) : (
              <div className="space-y-2">
                {offering.schedules.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2"
                  >
                    <div className="flex items-center gap-2 text-xs text-foreground">
                      <Clock className="size-3.5 text-muted-foreground" />
                      <span className="font-medium">{s.day_of_week}</span>
                      <span>
                        {s.start_time}–{s.end_time}
                      </span>
                      <span className="text-muted-foreground">
                        · {s.venue} · {s.class_type} ·{" "}
                        {lecturerName(s.lecturer_id)}
                      </span>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditSchedule(s)}
                        >
                          <Settings2 className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeSchedule.mutate(s.id)}
                          disabled={removeSchedule.isPending}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assign Lecturer sub-modal */}
      <AnimatePresence>
        {showAssign && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 space-y-3 rounded-xl border border-border bg-muted/30 p-4"
          >
            <p className="text-sm font-semibold text-foreground">
              Assign Lecturer
            </p>
            <Controller
              control={assignForm.control}
              name="lecturer_id"
              render={({ field }) => (
                <Combobox
                  options={availableLecturers}
                  value={field.value || null}
                  onChange={(v) => field.onChange(Number(v))}
                  placeholder="Select a lecturer"
                  searchPlaceholder="Search lecturers…"
                />
              )}
            />
            <Controller
              control={assignForm.control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-10 w-full rounded-xl border-transparent bg-muted">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary</SelectItem>
                    <SelectItem value="assistant">Assistant</SelectItem>
                    <SelectItem value="tutorial">Tutorial</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAssign(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={assignForm.handleSubmit(onAssign)}
                disabled={assignLecturer.isPending}
              >
                {assignLecturer.isPending && (
                  <Loader2
                    className="size-3.5 animate-spin"
                    data-icon="inline-start"
                  />
                )}
                Assign
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Schedule sub-modal */}
      <AnimatePresence>
        {showScheduleForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 space-y-3 rounded-xl border border-border bg-muted/30 p-4"
          >
            <p className="text-sm font-semibold text-foreground">
              {editingSchedule ? "Edit" : "Add"} Class Schedule
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Controller
                control={scheduleForm.control}
                name="lecturer_id"
                render={({ field }) => (
                  <Combobox
                    options={(offering?.lecturers ?? []).map((l) => ({
                      value: l.lecturer_id,
                      label: lecturerName(l.lecturer_id),
                    }))}
                    value={field.value || null}
                    onChange={(v) => field.onChange(Number(v))}
                    placeholder="Select lecturer"
                  />
                )}
              />
              <Select
                value={watchedDayOfWeek}
                onValueChange={(v) => scheduleForm.setValue("day_of_week", v)}
              >
                <SelectTrigger className="h-10 w-full rounded-xl border-transparent bg-muted">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                  ].map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="time" {...scheduleForm.register("start_time")} />
              <Input type="time" {...scheduleForm.register("end_time")} />
              <Input
                placeholder="Venue (e.g. LT1)"
                {...scheduleForm.register("venue")}
              />
              <Select
                value={watchedClassType}
                onValueChange={(v) => scheduleForm.setValue("class_type", v)}
              >
                <SelectTrigger className="h-10 w-full rounded-xl border-transparent bg-muted">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lecture">Lecture</SelectItem>
                  <SelectItem value="tutorial">Tutorial</SelectItem>
                  <SelectItem value="lab">Lab</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(scheduleForm.formState.errors.end_time ||
              scheduleForm.formState.errors.venue ||
              scheduleForm.formState.errors.lecturer_id) && (
              <p className="text-xs text-destructive">
                {scheduleForm.formState.errors.lecturer_id?.message ||
                  scheduleForm.formState.errors.venue?.message ||
                  scheduleForm.formState.errors.end_time?.message}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowScheduleForm(false)
                  setEditingSchedule(null)
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={scheduleForm.handleSubmit(onSubmitSchedule)}
                disabled={createSchedule.isPending || updateSchedule.isPending}
              >
                {(createSchedule.isPending || updateSchedule.isPending) && (
                  <Loader2
                    className="size-3.5 animate-spin"
                    data-icon="inline-start"
                  />
                )}
                {editingSchedule ? "Save" : "Add"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  )
}
