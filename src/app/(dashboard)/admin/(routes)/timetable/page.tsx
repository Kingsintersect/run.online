"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import {
  CalendarDays,
  LayoutGrid,
  List,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { Button } from "@/components/ui/button"
import { TimetableGrid } from "@/modules/timetable/components/TimetableGrid"
import { TimetableList } from "@/modules/timetable/components/TimetableList"
import { ScheduleFormDialog } from "@/modules/timetable/components/ScheduleFormDialog"
import {
  useAllSchedules,
  useSchedulesByLecturer,
  useSchedulesBySemester,
  useDeleteSchedule,
} from "@/modules/timetable/hooks/useTimetable"
import { academicCalendarQueryOptions } from "@/modules/timetable/services/timetable.service"
import { usersQueryOptions } from "@/services/usersApi"
import { useTimetableUIStore } from "@/modules/timetable/store/useTimetableUIStore"
import type { TimetableSlot } from "@/modules/timetable/types/timetable.types"

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

  const [lecturerId, setLecturerId] = useState<number | null>(null)
  const [semesterId, setSemesterId] = useState<number | null>(null)

  const { data: calendar } = useQuery(academicCalendarQueryOptions.current())
  const { data: tutorsRes } = useQuery(usersQueryOptions.tutors.list())
  const semesters = calendar?.semesters ?? []
  const tutors = tutorsRes?.data ?? []

  // One filter at a time drives the data source: a dedicated lecturer/semester
  // endpoint when scoped, the full paginated list otherwise.
  const allQuery = useAllSchedules()
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
      </div>

      <ScheduleFormDialog
        open={scheduleDialogOpen}
        onOpenChange={closeDialog}
        editingScheduleId={editingScheduleId}
      />
    </PermissionGate>
  )
}
