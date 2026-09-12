"use client"

import { format } from "date-fns"
import { ExternalLink } from "lucide-react"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { getEventTypeMeta } from "../../lib/event-type-meta"
import type { CalendarEventResponse } from "../../types"

interface CalendarEventDetailProps {
  event: CalendarEventResponse | null
  onClose: () => void
}

export function CalendarEventDetail({
  event,
  onClose,
}: CalendarEventDetailProps) {
  if (!event) return null
  const meta = getEventTypeMeta(event.eventType)
  const Icon = meta.icon

  return (
    <Modal open={!!event} onClose={onClose} title={event.name} size="md">
      <div className="space-y-4">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.classes}`}
        >
          <Icon size={12} />
          {meta.label}
        </span>

        {event.description && (
          <p className="text-sm text-muted-foreground">{event.description}</p>
        )}

        <div className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Starts: </span>
            {format(new Date(event.startDate), "PPP p")}
          </p>
          {event.endDate && (
            <p>
              <span className="text-muted-foreground">Ends: </span>
              {format(new Date(event.endDate), "PPP p")}
            </p>
          )}
          {event.course && (
            <p>
              <span className="text-muted-foreground">Course: </span>
              {event.course.courseOffering.course.code} —{" "}
              {event.course.courseOffering.course.title}
            </p>
          )}
        </div>

        {event.meetingUrl && (
          <Button asChild className="w-full gap-2">
            <a
              href={event.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={14} />
              Join Meeting
            </a>
          </Button>
        )}
      </div>
    </Modal>
  )
}
