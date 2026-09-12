"use client"

import { useMemo, useState } from "react"
import { Clock, Search, Filter } from "lucide-react"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { CalendarEventList } from "@/modules/timetable/components/CalendarEventList"
import { useMyUpcomingEvents } from "@/modules/timetable/hooks/useCalendarEvents"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function UpcomingEventsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [eventType, setEventType] = useState<
    "all" | "course" | "site" | "user" | "zoom"
  >("all")

  const { data, isLoading } = useMyUpcomingEvents()
  const events = useMemo(() => data ?? [], [data])

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

  return (
    <PermissionGate
      require={{ resource: "calendar-events", action: "view" }}
      denyBehavior="screen"
    >
      <div className="space-y-6">
        <section className="rounded-3xl border border-primary/20 bg-linear-to-br from-primary/15 via-background to-cyan-500/10 p-6">
          <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Next 14 Days
          </p>
          <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
            Upcoming Events
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Stay ahead of classes, deadlines, and notices coming up soon.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
              <p className="text-xs text-muted-foreground">Upcoming Events</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {filteredEvents.length}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
              <p className="text-xs text-muted-foreground">Window</p>
              <p className="mt-1 text-2xl font-bold text-foreground">14 Days</p>
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
              Filter Upcoming
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
              <p className="mb-1 text-xs text-muted-foreground">Search</p>
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search upcoming events"
                  className="h-10 w-full rounded-xl border border-input bg-background pr-3 pl-9 text-sm text-foreground transition-shadow outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock size={14} />
            Showing {filteredEvents.length} upcoming events
          </div>
        </section>

        <CalendarEventList events={filteredEvents} isLoading={isLoading} />
      </div>
    </PermissionGate>
  )
}
