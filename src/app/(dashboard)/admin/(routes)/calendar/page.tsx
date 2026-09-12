"use client"

import { motion } from "framer-motion"
import { CalendarDays } from "lucide-react"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { CalendarEventList } from "@/modules/timetable/components/CalendarEventList"
import { EventVisibilityToggle } from "@/modules/timetable/components/EventVisibilityToggle"
import { useAllCalendarEvents } from "@/modules/timetable/hooks/useCalendarEvents"
import type { CalendarEvent } from "@/modules/timetable/types/timetable.types"

export default function AdminCalendarPage() {
  const { data, isLoading } = useAllCalendarEvents()
  const events = data?.data ?? []
  const total = data?.meta?.total ?? 0

  function visibilityToggle(event: CalendarEvent) {
    return (
      <PermissionGate
        require={{ resource: "calendar-events", action: "manage" }}
      >
        <EventVisibilityToggle eventId={event.id} isVisible={event.isVisible} />
      </PermissionGate>
    )
  }

  return (
    <PermissionGate
      require={{ resource: "calendar-events", action: "view" }}
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
              <h1 className="text-xl font-bold">Calendar Events</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Manage event visibility for students and staff
              </p>
            </div>
          </div>
          {total > 0 && (
            <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
              {total} event{total !== 1 ? "s" : ""}
            </span>
          )}
        </motion.div>

        <CalendarEventList
          events={events}
          isLoading={isLoading}
          visibilityToggle={visibilityToggle}
        />
      </div>
    </PermissionGate>
  )
}
