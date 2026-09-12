"use client";

import { cn } from "@/lib/utils";
import { MapPin, Clock } from "lucide-react";
import type { TimetableSlot } from "../types/timetable.types";

const CLASS_TYPE_COLORS: Record<string, string> = {
    LECTURE: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    LAB: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    TUTORIAL: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    SEMINAR: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

interface ScheduleSlotCardProps {
    slot: TimetableSlot;
    compact?: boolean;
    actions?: React.ReactNode;
    className?: string;
}

export function ScheduleSlotCard({ slot, compact = false, actions, className }: ScheduleSlotCardProps) {
    return (
        <div
            className={cn(
                "rounded-lg border border-border bg-card p-3 space-y-1.5 hover:shadow-sm transition-shadow",
                className
            )}
        >
            {/* Course code + class type */}
            <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground truncate">{slot.courseCode}</span>
                <span
                    className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0",
                        CLASS_TYPE_COLORS[slot.classType] ?? "bg-muted text-muted-foreground"
                    )}
                >
                    {slot.classType}
                </span>
            </div>

            {/* Course title */}
            {!compact && (
                <p className="text-xs text-muted-foreground leading-snug line-clamp-1">{slot.courseTitle}</p>
            )}

            {/* Time + Venue */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {slot.startTime}–{slot.endTime}
                </span>
                <span className="flex items-center gap-1">
                    <MapPin size={11} />
                    {slot.venue}
                </span>
            </div>

            {/* Tutor */}
            {!compact && (
                <p className="text-xs text-muted-foreground truncate">{slot.tutorName}</p>
            )}

            {/* Optional actions (edit/delete for admin) */}
            {actions && <div className="pt-1">{actions}</div>}
        </div>
    );
}
