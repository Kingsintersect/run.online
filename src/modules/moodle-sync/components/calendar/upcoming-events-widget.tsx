"use client"

import { useState } from "react"
import { CalendarDays, ExternalLink } from "lucide-react"
import EmptyState from "@/components/custom/EmptyState"
import { useUpcomingCalendarEvents } from "../../hooks/use-sync-calendar"
import { CalendarEventDetail } from "./calendar-event-detail"
import { getEventTypeMeta } from "../../lib/event-type-meta"
import type { CalendarEventResponse } from "../../types"

export function UpcomingEventsWidget() {
  const { data, isLoading } = useUpcomingCalendarEvents()
  const items = data?.data ?? []
  const [selected, setSelected] = useState<CalendarEventResponse | null>(null)

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
          <CalendarDays size={14} className="text-primary" />
        </div>
        <span className="text-sm font-semibold text-foreground">
          Upcoming Sessions & Events
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-xl bg-muted/40"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nothing scheduled"
          description="Upcoming sessions and events will appear here."
          className="py-8"
        />
      ) : (
        <div className="space-y-2">
          {items.map((event) => {
            const Icon = getEventTypeMeta(event.eventType).icon
            return (
              <button
                key={event.id}
                onClick={() => setSelected(event)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2.5 text-left hover:bg-muted/20"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon size={13} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {event.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.startDate).toLocaleString(undefined, {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                {event.meetingUrl && (
                  <ExternalLink size={13} className="shrink-0 text-primary" />
                )}
              </button>
            )
          })}
        </div>
      )}

      <CalendarEventDetail event={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
