"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarOff } from "lucide-react";
import { ScheduleSlotCard } from "./ScheduleSlotCard";
import type { DayOfWeek, TimetableSlot } from "../types/timetable.types";

const DAY_LABELS: Record<DayOfWeek, string> = {
    MONDAY: "Monday",
    TUESDAY: "Tuesday",
    WEDNESDAY: "Wednesday",
    THURSDAY: "Thursday",
    FRIDAY: "Friday",
    SATURDAY: "Saturday",
    SUNDAY: "Sunday",
};

const DAY_ORDER: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

interface TimetableListProps {
    slots: TimetableSlot[];
    isLoading?: boolean;
    slotActions?: (slot: TimetableSlot) => React.ReactNode;
}

export function TimetableList({ slots, isLoading, slotActions }: TimetableListProps) {
    if (isLoading) {
        return (
            <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                        <Skeleton className="h-5 w-24 rounded" />
                        <Skeleton className="h-20 rounded-lg" />
                        <Skeleton className="h-20 rounded-lg" />
                    </div>
                ))}
            </div>
        );
    }

    if (!slots.length) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
                <CalendarOff size={36} className="opacity-30" />
                <p className="text-sm">No schedule found for this semester.</p>
            </div>
        );
    }

    // Group and sort
    const grouped: Partial<Record<DayOfWeek, TimetableSlot[]>> = {};
    for (const slot of slots) {
        if (!grouped[slot.dayOfWeek]) grouped[slot.dayOfWeek] = [];
        grouped[slot.dayOfWeek]!.push(slot);
    }
    for (const day of DAY_ORDER) {
        grouped[day]?.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }

    const activeDays = DAY_ORDER.filter((d) => grouped[d]?.length);

    return (
        <AnimatePresence>
            <div className="space-y-6">
                {activeDays.map((day, di) => (
                    <motion.div
                        key={day}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: di * 0.06 }}
                        className="space-y-2"
                    >
                        {/* Day label */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{DAY_LABELS[day]}</span>
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-xs text-muted-foreground">{grouped[day]!.length} class{grouped[day]!.length !== 1 ? "es" : ""}</span>
                        </div>

                        {/* Slot cards */}
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {grouped[day]!.map((slot) => (
                                <ScheduleSlotCard key={slot.id} slot={slot} actions={slotActions?.(slot)} />
                            ))}
                        </div>
                    </motion.div>
                ))}
            </div>
        </AnimatePresence>
    );
}
