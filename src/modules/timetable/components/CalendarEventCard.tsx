"use client";

import { format, isToday, isTomorrow, isPast } from "date-fns";
import { cn } from "@/lib/utils";
import { Video, Bell, BookOpen, Globe, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CalendarEvent } from "../types/timetable.types";

const EVENT_TYPE_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
    zoom: { icon: Video, label: "Zoom", color: "text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400" },
    course: { icon: BookOpen, label: "Course", color: "text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400" },
    site: { icon: Globe, label: "Site", color: "text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400" },
    user: { icon: Bell, label: "Notice", color: "text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400" },
};

function formatEventDate(dateStr: string): string {
    const d = new Date(dateStr);
    if (isToday(d)) return `Today, ${format(d, "h:mm a")}`;
    if (isTomorrow(d)) return `Tomorrow, ${format(d, "h:mm a")}`;
    return format(d, "EEE d MMM, h:mm a");
}

interface CalendarEventCardProps {
    event: CalendarEvent;
    visibilityToggle?: React.ReactNode;
}

export function CalendarEventCard({ event, visibilityToggle }: CalendarEventCardProps) {
    const meta = EVENT_TYPE_META[event.eventType] ?? EVENT_TYPE_META.site;
    const TypeIcon = meta.icon;
    const past = isPast(new Date(event.startDate));

    return (
        <div
            className={cn(
                "rounded-lg border border-border bg-card p-4 space-y-2 transition-opacity",
                past && "opacity-60"
            )}
        >
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <span className={cn("flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0", meta.color)}>
                        <TypeIcon size={10} />
                        {meta.label}
                    </span>
                    {event.courseCode && (
                        <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full truncate">
                            {event.courseCode}
                        </span>
                    )}
                </div>
                {visibilityToggle}
            </div>

            {/* Event name */}
            <p className="text-sm font-semibold text-foreground leading-snug">{event.name}</p>

            {/* Description */}
            {event.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{event.description}</p>
            )}

            {/* Footer: date + Zoom link */}
            <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-xs text-muted-foreground">{formatEventDate(event.startDate)}</span>
                {event.meetingUrl && (
                    <Button asChild variant="outline" size="sm" className="h-7 text-xs gap-1 px-2">
                        <a href={event.meetingUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink size={11} />
                            Join
                        </a>
                    </Button>
                )}
            </div>
        </div>
    );
}
