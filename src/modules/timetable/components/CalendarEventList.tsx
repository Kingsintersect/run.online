"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays } from "lucide-react";
import { CalendarEventCard } from "./CalendarEventCard";
import type { CalendarEvent } from "../types/timetable.types";
import { format } from "date-fns";

function groupByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
   const map = new Map<string, CalendarEvent[]>();
   for (const event of events) {
      const label = format(new Date(event.startDate), "EEEE, d MMMM yyyy");
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(event);
   }
   return map;
}

interface CalendarEventListProps {
   events: CalendarEvent[];
   isLoading?: boolean;
   visibilityToggle?: (event: CalendarEvent) => React.ReactNode;
}

export function CalendarEventList({ events, isLoading, visibilityToggle }: CalendarEventListProps) {
   if (isLoading) {
      return (
         <div className="space-y-6">
            {[1, 2, 3].map((i) => (
               <div key={i} className="space-y-2">
                  <Skeleton className="h-5 w-40 rounded" />
                  <Skeleton className="h-24 rounded-lg" />
               </div>
            ))}
         </div>
      );
   }

   if (!events.length) {
      return (
         <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <CalendarDays size={36} className="opacity-30" />
            <p className="text-sm">No events to display.</p>
         </div>
      );
   }

   const grouped = groupByDate(events);

   return (
      <AnimatePresence>
         <div className="space-y-6">
            {Array.from(grouped.entries()).map(([dateLabel, dayEvents], di) => (
               <motion.div
                  key={dateLabel}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: di * 0.06 }}
                  className="space-y-2"
               >
                  {/* Date header */}
                  <div className="flex items-center gap-2">
                     <span className="text-sm font-semibold text-foreground">{dateLabel}</span>
                     <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Event cards */}
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                     {dayEvents.map((event) => (
                        <CalendarEventCard
                           key={event.id}
                           event={event}
                           visibilityToggle={visibilityToggle?.(event)}
                        />
                     ))}
                  </div>
               </motion.div>
            ))}
         </div>
      </AnimatePresence>
   );
}
