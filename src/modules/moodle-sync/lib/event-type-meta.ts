import { Bell, BookOpen, CalendarDays, Globe, Video } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface EventTypeMeta {
  icon: LucideIcon
  label: string
  classes: string
}

// The four event types documented in moodle-sync-api.md / calendar.schema.ts
// — but Moodle's real calendar isn't limited to them (module-specific native
// types like "due"/"open"/"close"/"gradingdue" pass straight through from
// the LMS). A closed `Record<CalendarEventResponse["eventType"], ...>` map
// indexed directly by `event.eventType` crashes the moment a real event
// carries one of those — this is only ever accessed through
// `getEventTypeMeta`, which falls back instead of returning `undefined`.
const KNOWN_EVENT_TYPE_META: Record<string, EventTypeMeta> = {
  zoom: { icon: Video, label: "Zoom", classes: "bg-primary/10 text-primary" },
  course: {
    icon: BookOpen,
    label: "Course",
    classes: "bg-success/10 text-success",
  },
  site: {
    icon: Globe,
    label: "Site-wide",
    classes: "bg-muted text-muted-foreground",
  },
  user: {
    icon: Bell,
    label: "Notice",
    classes: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
}

const FALLBACK_EVENT_TYPE_META: EventTypeMeta = {
  icon: CalendarDays,
  label: "Event",
  classes: "bg-muted text-muted-foreground",
}

export function getEventTypeMeta(eventType: string): EventTypeMeta {
  return KNOWN_EVENT_TYPE_META[eventType] ?? FALLBACK_EVENT_TYPE_META
}
