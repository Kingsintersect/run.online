"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import {
  CalendarClock,
  CalendarDays,
  LayoutGrid,
  List,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { usePermissions } from "@/lib/permissions/usePermissions"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MajorProgramTabs } from "@/components/custom/MajorProgramTabs"
import { TimetableGrid } from "@/modules/timetable/components/TimetableGrid"
import { TimetableList } from "@/modules/timetable/components/TimetableList"
import { ScheduleFormDialog } from "@/modules/timetable/components/ScheduleFormDialog"
import { VenueManager } from "@/modules/timetable/components/VenueManager"
import { ExamScheduleList } from "@/modules/timetable/components/ExamScheduleList"
import { ExamScheduleFormDialog } from "@/modules/timetable/components/ExamScheduleFormDialog"
import {
  useAllSchedules,
  useSchedulesByLecturer,
  useSchedulesBySemester,
  useDeleteSchedule,
} from "@/modules/timetable/hooks/useTimetable"
import { useExamSchedules } from "@/modules/timetable/hooks/useExamTimetable"
import { useAcademicSessions } from "@/hooks/useAcademicSessions"
import { useSemesters } from "@/hooks/useSemesters"
import { useMajorPrograms } from "@/hooks/useCourseStructure"
import { resolveActiveSession } from "@/lib/academic/resolve-active-session"
import { usersQueryOptions } from "@/services/usersApi"
import { useTimetableUIStore } from "@/modules/timetable/store/useTimetableUIStore"
import type { TimetableSlot } from "@/modules/timetable/types/timetable.types"
import type { ExamSchedule } from "@/modules/timetable/types/exam-timetable.types"

export default function AdminTimetablePage() {
  const {
    viewMode,
    setViewMode,
    scheduleDialogOpen,
    editingScheduleId,
    openCreateDialog,
    openEditDialog,
    closeDialog,
  } = useTimetableUIStore()

  const { can } = usePermissions()
  const canManageTimetable = can({ resource: "timetable", action: "manage" })

  // Major-Program Scoping — sessions (and therefore semesters) can now run
  // independent calendars per major program (sandbox/major-program-scoping/
  // README.md §4.B), so "the current semester" is meaningless without
  // knowing which major program's calendar is meant. Resolve it the same
  // way ChoiceProgramSection does for the applicant side, instead of the
  // single institution-wide `/academic-calendar` "current" endpoint this
  // page used before — that endpoint has no concept of "current for major
  // program X" at all.
  const [majorProgramFilter, setMajorProgramFilter] = useState<number | null>(
    null
  )
  const { data: majorProgramsRes } = useMajorPrograms()
  const majorPrograms = useMemo(
    () => (majorProgramsRes?.data ?? []).filter((mp) => mp.isActive),
    [majorProgramsRes]
  )

  const [lecturerId, setLecturerId] = useState<number | null>(null)
  const [semesterId, setSemesterId] = useState<number | null>(null)

  const { data: sessions } = useAcademicSessions()
  const activeSession = resolveActiveSession(sessions, majorProgramFilter)
  const { data: semestersRes } = useSemesters(activeSession?.id ?? null)
  const { data: tutorsRes } = useQuery(usersQueryOptions.tutors.list())
  const semesters = semestersRes ?? []
  const tutors = tutorsRes?.data ?? []
  const invigilatorOptions = tutors.map((t) => ({
    id: t.id,
    name:
      [t.user.first_name, t.user.last_name].filter(Boolean).join(" ") ||
      t.staff_number,
  }))

  // Exam Timetable — sandbox/exam-timetable/. Major-Program Scoping — same
  // reuse-the-existing-tab reasoning as the class-schedules query above
  // (sandbox/BACKEND_DEVIATIONS_2026-09-14.md A35).
  const [examDialogOpen, setExamDialogOpen] = useState(false)
  const [editingExam, setEditingExam] = useState<ExamSchedule | null>(null)
  const { data: examsData, isLoading: examsLoading } = useExamSchedules(
    majorProgramFilter != null ? { majorProgramId: majorProgramFilter } : {}
  )
  const exams = examsData?.data ?? []

  // One filter at a time drives the data source: a dedicated lecturer/semester
  // endpoint when scoped, the full paginated list otherwise.
  //
  // Major-Program Scoping — sandbox/BACKEND_DEVIATIONS_2026-09-14.md A35.
  // This page already has a major-program tab (`majorProgramFilter` above,
  // via `MajorProgramTabs`) for resolving the active session/semester — sent
  // through here too as `majorProgramId` rather than adding a second,
  // competing filter bar. Only wired on the "all schedules" fallback (the
  // dedicated lecturer/semester endpoints below take no query params at
  // all), which is exactly the case where results can otherwise span every
  // major program's lecturers/semesters at once.
  const allQuery = useAllSchedules(
    majorProgramFilter != null ? { majorProgramId: majorProgramFilter } : {}
  )
  const lecturerQuery = useSchedulesByLecturer(lecturerId)
  const semesterQuery = useSchedulesBySemester(lecturerId ? null : semesterId)

  const { slots, isLoading } = lecturerId
    ? { slots: lecturerQuery.data ?? [], isLoading: lecturerQuery.isLoading }
    : semesterId
      ? { slots: semesterQuery.data ?? [], isLoading: semesterQuery.isLoading }
      : { slots: allQuery.data?.data ?? [], isLoading: allQuery.isLoading }

  const deleteMutation = useDeleteSchedule()

  function handleDelete(slot: TimetableSlot) {
    if (confirm(`Delete ${slot.courseCode} on ${slot.dayOfWeek}?`)) {
      deleteMutation.mutate(slot.id)
    }
  }

  function slotActions(slot: TimetableSlot) {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => openEditDialog(slot.id)}
        >
          <Pencil size={12} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={() => handleDelete(slot)}
        >
          <Trash2 size={12} />
        </Button>
      </div>
    )
  }

  return (
    <PermissionGate
      require={{ resource: "timetable", action: "view" }}
      denyBehavior="screen"
    >
      <div className="space-y-6 p-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-start justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <CalendarDays size={18} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Class Schedules</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Manage all course timetable slots
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 gap-1 px-2.5 text-xs"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid size={13} />
                Grid
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 gap-1 px-2.5 text-xs"
                onClick={() => setViewMode("list")}
              >
                <List size={13} />
                List
              </Button>
            </div>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
            >
              <Link href="/admin/timetable/venue-check">Venue Checker</Link>
            </Button>

            <PermissionGate
              require={{ resource: "timetable", action: "manage" }}
            >
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={openCreateDialog}
              >
                <Plus size={13} />
                Add Slot
              </Button>
            </PermissionGate>
          </div>
        </motion.div>

        {/* Major-program filter — resolves which major program's active
            session (and therefore which semesters) the Class Schedules
            filters below offer, since each major program can now run its
            own independent calendar. */}
        <MajorProgramTabs
          programs={majorPrograms}
          value={majorProgramFilter}
          onChange={(id) => {
            setMajorProgramFilter(id)
            setLecturerId(null)
            setSemesterId(null)
          }}
        />

        <Tabs defaultValue="classes" className="space-y-6">
          <TabsList>
            <TabsTrigger value="classes" className="gap-1.5">
              <CalendarDays className="size-4" />
              Class Schedules
            </TabsTrigger>
            <TabsTrigger value="exams" className="gap-1.5">
              <CalendarClock className="size-4" />
              Exams
            </TabsTrigger>
          </TabsList>

          <TabsContent value="classes" className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={lecturerId ?? ""}
                onChange={(e) => {
                  setLecturerId(e.target.value ? Number(e.target.value) : null)
                  setSemesterId(null)
                }}
                className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs outline-none focus-visible:border-ring"
              >
                <option value="">All lecturers</option>
                {tutors.map((t) => (
                  <option key={t.id} value={t.id}>
                    {[t.user.first_name, t.user.last_name]
                      .filter(Boolean)
                      .join(" ") || t.staff_number}
                  </option>
                ))}
              </select>
              <select
                value={semesterId ?? ""}
                disabled={!!lecturerId}
                onChange={(e) =>
                  setSemesterId(e.target.value ? Number(e.target.value) : null)
                }
                className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs outline-none focus-visible:border-ring disabled:opacity-50"
              >
                <option value="">All semesters</option>
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.isActive ? " (active)" : ""}
                  </option>
                ))}
              </select>
              {(lecturerId || semesterId) && (
                <button
                  type="button"
                  onClick={() => {
                    setLecturerId(null)
                    setSemesterId(null)
                  }}
                  className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>

            {viewMode === "grid" ? (
              <TimetableGrid
                slots={slots}
                isLoading={isLoading}
                slotActions={slotActions}
              />
            ) : (
              <TimetableList
                slots={slots}
                isLoading={isLoading}
                slotActions={slotActions}
              />
            )}
          </TabsContent>

          <TabsContent value="exams" className="space-y-6">
            <VenueManager canManage={canManageTimetable} />

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Exam Schedules
                </h3>
                <p className="text-xs text-muted-foreground">
                  Exam dates, venues and invigilators for the semester.
                </p>
              </div>
              {canManageTimetable && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingExam(null)
                    setExamDialogOpen(true)
                  }}
                >
                  <Plus className="size-3.5" data-icon="inline-start" />
                  Schedule Exam
                </Button>
              )}
            </div>

            <ExamScheduleList
              exams={exams}
              isLoading={examsLoading}
              canManage={canManageTimetable}
              onEdit={(exam) => {
                setEditingExam(exam)
                setExamDialogOpen(true)
              }}
            />
          </TabsContent>
        </Tabs>
      </div>

      <ScheduleFormDialog
        open={scheduleDialogOpen}
        onOpenChange={closeDialog}
        editingScheduleId={editingScheduleId}
      />

      <ExamScheduleFormDialog
        open={examDialogOpen}
        onClose={() => setExamDialogOpen(false)}
        examSchedule={editingExam}
        tutors={invigilatorOptions}
      />
    </PermissionGate>
  )
}
