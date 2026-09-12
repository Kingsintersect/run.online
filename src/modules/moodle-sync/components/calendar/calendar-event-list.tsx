"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CalendarDays } from "lucide-react"
import EmptyState from "@/components/custom/EmptyState"
import { useSyncCalendarEvents } from "../../hooks/use-sync-calendar"
import { usePullCalendar } from "../../hooks/use-sync-mutations"
import { PushPullToolbar } from "../shared/push-pull-toolbar"
import { CalendarEventDetail } from "./calendar-event-detail"
import { getEventTypeMeta } from "../../lib/event-type-meta"
import type { CalendarEventResponse } from "../../types"

export function CalendarEventList() {
  const { data, isLoading, isError } = useSyncCalendarEvents()
  const pullAll = usePullCalendar()
  const [selected, setSelected] = useState<CalendarEventResponse | null>(null)

  const handlePullAll = async () => {
    try {
      const result = await pullAll.mutateAsync()
      toast.success(`Pulled ${result.pulled} calendar event(s) from Moodle`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Pull failed")
    }
  }

  const items = data?.data ?? []

  return (
    <div className="space-y-3">
      <PushPullToolbar
        title="Calendar & Zoom Events"
        subtitle="Read-only — pulled from Moodle's calendar and Zoom activity module."
        onPull={handlePullAll}
        pullLabel="Pull All"
        pullPending={pullAll.isPending}
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-muted/40"
            />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title="Couldn't load calendar events"
          description="Please try again."
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No calendar events"
          description="Nothing has been pulled from Moodle yet."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {items.map((event) => {
            const Icon = getEventTypeMeta(event.eventType).icon
            return (
              <button
                key={event.id}
                onClick={() => setSelected(event)}
                className="flex w-full items-center justify-between gap-3 border-b border-border/60 px-4 py-3 text-left last:border-none hover:bg-muted/20"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {event.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {event.course
                        ? `${event.course.courseOffering.course.code} · `
                        : ""}
                      {new Date(event.startDate).toLocaleString(undefined, {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <CalendarEventDetail event={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
