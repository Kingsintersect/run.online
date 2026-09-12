"use client"

import { UpcomingEventsWidget } from "@/modules/moodle-sync/components/calendar/upcoming-events-widget"

export default function StudentMoodleCalendarPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">
          Moodle Sessions & Zoom
        </h1>
        <p className="text-xs text-muted-foreground">
          Upcoming calendar events and Zoom meeting links from your Moodle
          courses.
        </p>
      </div>
      <UpcomingEventsWidget />
    </div>
  )
}
