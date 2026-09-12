"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarOff } from "lucide-react";
import { ScheduleSlotCard } from "./ScheduleSlotCard";
import type { DayOfWeek, TimetableSlot } from "../types/timetable.types";

const WEEKDAYS: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
const DAY_SHORT: Record<DayOfWeek, string> = {
    MONDAY: "Mon",
    TUESDAY: "Tue",
    WEDNESDAY: "Wed",
    THURSDAY: "Thu",
    FRIDAY: "Fri",
    SATURDAY: "Sat",
    SUNDAY: "Sun",
};

interface TimetableGridProps {
    slots: TimetableSlot[];
    isLoading?: boolean;
    slotActions?: (slot: TimetableSlot) => React.ReactNode;
    showWeekends?: boolean;
}

export function TimetableGrid({ slots, isLoading, slotActions, showWeekends }: TimetableGridProps) {
    const days = showWeekends ? (Object.keys(DAY_SHORT) as DayOfWeek[]) : WEEKDAYS;

    if (isLoading) {
        return (
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
                {days.map((d) => (
                    <div key={d} className="space-y-2">
                        <Skeleton className="h-6 w-12 rounded-md" />
                        <Skeleton className="h-24 rounded-lg" />
                        <Skeleton className="h-20 rounded-lg" />
                    </div>
                ))}
            </div>
        );
    }

    const grouped: Partial<Record<DayOfWeek, TimetableSlot[]>> = {};
    for (const s of slots) {
        if (!grouped[s.dayOfWeek]) grouped[s.dayOfWeek] = [];
        grouped[s.dayOfWeek]!.push(s);
    }
    for (const day of days) {
        grouped[day]?.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }

    const hasAnySlots = slots.length > 0;

    if (!hasAnySlots) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
                <CalendarOff size={36} className="opacity-30" />
                <p className="text-sm">No schedule found for this semester.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <div
                className="grid gap-3 min-w-[640px]"
                style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
            >
                {days.map((day) => (
                    <div key={day} className="space-y-2">
                        {/* Day header */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                                {DAY_SHORT[day]}
                            </span>
                            {grouped[day]?.length ? (
                                <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
                                    {grouped[day]!.length}
                                </span>
                            ) : null}
                        </div>

                        {/* Slots */}
                        <AnimatePresence>
                            {grouped[day]?.length ? (
                                grouped[day]!.map((slot, i) => (
                                    <motion.div
                                        key={slot.id}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.04 }}
                                    >
                                        <ScheduleSlotCard slot={slot} actions={slotActions?.(slot)} />
                                    </motion.div>
                                ))
                            ) : (
                                <div className="h-16 rounded-lg border border-dashed border-border flex items-center justify-center">
                                    <span className="text-[11px] text-muted-foreground/50">No classes</span>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>
        </div>
    );
}
