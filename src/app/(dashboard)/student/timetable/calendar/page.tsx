"use client"

import { useMemo, useState } from "react"
import { CalendarDays, Search, Filter } from "lucide-react"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { CalendarEventList } from "@/modules/timetable/components/CalendarEventList"
import {
  useMyCalendarEvents,
  useCalendarEventsByCourse,
} from "@/modules/timetable/hooks/useCalendarEvents"
import { useAcademicCalendarEvents } from "@/modules/timetable/hooks/useAcademicCalendar"
import { useMyCourses } from "@/modules/enrollment/hooks/use-enrollments"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function MyCalendarPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [eventType, setEventType] = useState<
    "all" | "course" | "site" | "user" | "zoom"
  >("all")
  const [courseId, setCourseId] = useState<number | null>(null)

  const { data: myCoursesData } = useMyCourses()
  const myCourses = useMemo(() => myCoursesData ?? [], [myCoursesData])

  // Default view: my events across every course + personal/site events.
  // Pick a course and the source switches to that offering's full event list
  // (GET /calendar/events/course/:offeringId) — includes events that aren't
  // personally assigned to me.
  const { data: myEventsData, isLoading: myEventsLoading } =
    useMyCalendarEvents()
  const { data: courseEventsData, isLoading: courseEventsLoading } =
    useCalendarEventsByCourse(courseId)

  const events = useMemo(
    () => (courseId ? (courseEventsData ?? []) : (myEventsData?.data ?? [])),
    [courseId, courseEventsData, myEventsData]
  )
  const isLoading = courseId ? courseEventsLoading : myEventsLoading

  // Portal-wide academic calendar announcements (session start/end,
  // registration windows, exams). Separate endpoint, separate shape —
  // shown as its own list. Degrades to nothing on 404 / empty.
  const { data: academicEventsPage } = useAcademicCalendarEvents({ limit: 30 })
  const academicEvents = academicEventsPage?.data ?? []

  const filteredEvents = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()
    return events.filter((event) => {
      const matchesType = eventType === "all" || event.eventType === eventType
      const matchesSearch =
        !search ||
        `${event.name} ${event.description ?? ""} ${event.courseCode ?? ""} ${event.courseTitle ?? ""}`
          .toLowerCase()
          .includes(search)
      return matchesType && matchesSearch
    })
  }, [events, searchTerm, eventType])

  const todayCount = filteredEvents.filter((event) => {
    const date = new Date(event.startDate)
    const now = new Date()
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    )
  }).length

  return (
    <PermissionGate
      require={{ resource: "calendar-events", action: "view" }}
      denyBehavior="screen"
    >
      <div className="space-y-6">
        <section className="rounded-3xl border border-primary/20 bg-linear-to-br from-primary/15 via-background to-cyan-500/10 p-6">
          <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Calendar Hub
          </p>
          <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
            Calendar &amp; Events
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Track academic events, live sessions, and announcements in one
            place.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
              <p className="text-xs text-muted-foreground">Visible Events</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {filteredEvents.length}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
              <p className="text-xs text-muted-foreground">Today</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {todayCount}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
              <p className="text-xs text-muted-foreground">Type Filter</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {eventType === "all" ? "All" : eventType}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border/70 bg-card/95 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Filter size={16} className="text-primary" />
            <p className="text-sm font-semibold text-foreground">
              Filter Events
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Event Type</p>
              <Select
                value={eventType}
                onValueChange={(value) =>
                  setEventType(value as typeof eventType)
                }
              >
                <SelectTrigger className="w-full justify-between">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="course">Course</SelectItem>
                  <SelectItem value="zoom">Zoom</SelectItem>
                  <SelectItem value="site">Site</SelectItem>
                  <SelectItem value="user">Notice</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="mb-1 text-xs text-muted-foreground">Course</p>
              <Select
                value={courseId === null ? "all" : String(courseId)}
                onValueChange={(value) =>
                  setCourseId(value === "all" ? null : Number(value))
                }
              >
                <SelectTrigger className="w-full justify-between">
                  <SelectValue placeholder="All my events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All my events</SelectItem>
                  {myCourses.map((c) => (
                    <SelectItem key={c.offeringId} value={String(c.offeringId)}>
                      {c.courseCode ||
                        c.courseTitle ||
                        `Offering #${c.offeringId}`}
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
                  placeholder="Event title, course code, keywords"
                  className="h-10 w-full rounded-xl border border-input bg-background pr-3 pl-9 text-sm text-foreground transition-shadow outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays size={14} />
            Showing {filteredEvents.length} events
          </div>
        </section>

        <CalendarEventList events={filteredEvents} isLoading={isLoading} />

        {academicEvents.length > 0 && (
          <section className="rounded-3xl border border-border/70 bg-card/95 p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <CalendarDays size={16} className="text-primary" />
              <p className="text-sm font-semibold text-foreground">
                Academic Calendar
              </p>
            </div>
            <ul className="divide-y divide-border/60">
              {academicEvents.map((ev) => (
                <li
                  key={ev.id}
                  className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {ev.title}
                    </p>
                    {ev.body && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {ev.body}
                      </p>
                    )}
                  </div>
                  {(ev.startDate ?? ev.publishedAt) && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(
                        ev.startDate ?? (ev.publishedAt as string)
                      ).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </PermissionGate>
  )
}
