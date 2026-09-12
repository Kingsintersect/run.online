"use client"

import { useMemo, useState } from "react"
import { LayoutGrid, List, Search, GraduationCap, Filter } from "lucide-react"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TimetableGrid } from "@/modules/timetable/components/TimetableGrid"
import { TimetableList } from "@/modules/timetable/components/TimetableList"
import { useMyTimetable } from "@/modules/timetable/hooks/useTimetable"
import { useAcademicCalendar } from "@/modules/timetable/hooks/useAcademicCalendar"
import { useTimetableUIStore } from "@/modules/timetable/store/useTimetableUIStore"
import type {
  DayOfWeek,
  TimetableSlot,
  ClassType,
} from "@/modules/timetable/types/timetable.types"

const DAY_OPTIONS: { label: string; value: DayOfWeek }[] = [
  { label: "Monday", value: "MONDAY" },
  { label: "Tuesday", value: "TUESDAY" },
  { label: "Wednesday", value: "WEDNESDAY" },
  { label: "Thursday", value: "THURSDAY" },
  { label: "Friday", value: "FRIDAY" },
  { label: "Saturday", value: "SATURDAY" },
  { label: "Sunday", value: "SUNDAY" },
]

const CLASS_TYPE_OPTIONS: { label: string; value: ClassType }[] = [
  { label: "Lecture", value: "LECTURE" },
  { label: "Lab", value: "LAB" },
  { label: "Tutorial", value: "TUTORIAL" },
  { label: "Seminar", value: "SEMINAR" },
]

export default function MyTimetablePage() {
  const {
    viewMode,
    selectedDay,
    selectedClassType,
    selectedSemesterId,
    setViewMode,
    setSelectedDay,
    setSelectedClassType,
  } = useTimetableUIStore()

  const [searchTerm, setSearchTerm] = useState("")

  const { data: calendarMeta } = useAcademicCalendar()
  const activeSemester = calendarMeta?.currentSemester
  const effectiveSemesterId = selectedSemesterId ?? activeSemester?.id

  const { data, isLoading } = useMyTimetable({
    semesterId: effectiveSemesterId,
  })

  const filteredSlots = useMemo(() => {
    const slots: TimetableSlot[] = Array.isArray(data)
      ? data
      : data
        ? Object.values(data).flat()
        : []
    const search = searchTerm.trim().toLowerCase()
    return slots.filter((slot) => {
      const matchesDay = !selectedDay || slot.dayOfWeek === selectedDay
      const matchesClassType =
        !selectedClassType || slot.classType === selectedClassType
      const matchesSearch =
        !search ||
        `${slot.courseCode} ${slot.courseTitle} ${slot.tutorName} ${slot.venue}`
          .toLowerCase()
          .includes(search)
      return matchesDay && matchesClassType && matchesSearch
    })
  }, [data, selectedDay, selectedClassType, searchTerm])

  const uniqueCoursesCount = new Set(
    filteredSlots.map((slot) => slot.courseCode)
  ).size
  const totalHours = filteredSlots.reduce((sum, slot) => {
    const [startHour, startMinute] = slot.startTime.split(":").map(Number)
    const [endHour, endMinute] = slot.endTime.split(":").map(Number)
    const start = startHour * 60 + startMinute
    const end = endHour * 60 + endMinute
    return sum + Math.max(0, end - start)
  }, 0)
  const totalHoursLabel = `${Math.floor(totalHours / 60)}h ${totalHours % 60}m`

  return (
    <PermissionGate
      require={{ resource: "my-timetable", action: "view" }}
      denyBehavior="screen"
    >
      <div className="space-y-6">
        <section className="overflow-hidden rounded-3xl border border-primary/20 bg-linear-to-br from-primary/15 via-background to-cyan-500/10 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
                Weekly Planner
              </p>
              <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
                My Timetable
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Plan classes, track lecture load, and quickly pivot between
                calendar and upcoming sessions.
              </p>
            </div>

            {/* <div className="flex gap-2">
                     <Link
                        href="/student/timetable/calendar"
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/70 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/40"
                     >
                        <CalendarDays size={16} />
                        Calendar
                     </Link>
                     <Link
                        href="/student/timetable/upcoming"
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/70 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/40"
                     >
                        <Clock3 size={16} />
                        Upcoming
                     </Link>
                  </div> */}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
              <p className="text-xs text-muted-foreground">Scheduled Slots</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {filteredSlots.length}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
              <p className="text-xs text-muted-foreground">Distinct Courses</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {uniqueCoursesCount}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
              <p className="text-xs text-muted-foreground">
                Weekly Contact Time
              </p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {totalHoursLabel}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border/70 bg-card/95 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Filter size={16} className="text-primary" />
            <p className="text-sm font-semibold text-foreground">
              Filter Timetable
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Day</p>
              <Select
                value={selectedDay ?? "all"}
                onValueChange={(value) =>
                  setSelectedDay(value === "all" ? null : (value as DayOfWeek))
                }
              >
                <SelectTrigger className="w-full justify-between">
                  <SelectValue placeholder="All days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All days</SelectItem>
                  {DAY_OPTIONS.map((day) => (
                    <SelectItem key={day.value} value={day.value}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="mb-1 text-xs text-muted-foreground">Class Type</p>
              <Select
                value={selectedClassType ?? "all"}
                onValueChange={(value) =>
                  setSelectedClassType(
                    value === "all" ? null : (value as ClassType)
                  )
                }
              >
                <SelectTrigger className="w-full justify-between">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {CLASS_TYPE_OPTIONS.map((classType) => (
                    <SelectItem key={classType.value} value={classType.value}>
                      {classType.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="mb-1 text-xs text-muted-foreground">Search</p>
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Course, tutor, venue"
                  className="h-10 w-full rounded-xl border border-input bg-background pr-3 pl-9 text-sm text-foreground transition-shadow outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <GraduationCap size={14} />
              Showing {filteredSlots.length} slots
            </p>
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
          </div>
        </section>

        {viewMode === "grid" ? (
          <TimetableGrid slots={filteredSlots} isLoading={isLoading} />
        ) : (
          <TimetableList slots={filteredSlots} isLoading={isLoading} />
        )}
      </div>
    </PermissionGate>
  )
}
