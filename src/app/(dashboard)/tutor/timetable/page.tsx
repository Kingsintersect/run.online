"use client"

import { motion } from "framer-motion"
import { CalendarDays, LayoutGrid, List } from "lucide-react"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { Button } from "@/components/ui/button"
import { TimetableGrid } from "@/modules/timetable/components/TimetableGrid"
import { TimetableList } from "@/modules/timetable/components/TimetableList"
import { useMyTimetable } from "@/modules/timetable/hooks/useTimetable"
import { useTimetableUIStore } from "@/modules/timetable/store/useTimetableUIStore"
import type { TimetableSlot } from "@/modules/timetable/types/timetable.types"

export default function TutorTimetablePage() {
  const { viewMode, setViewMode } = useTimetableUIStore()
  // /timetable/my resolves the current session's own timetable server-side
  // for both students and tutors — no client-side lecturer id needed.
  const { data, isLoading } = useMyTimetable()
  const slots: TimetableSlot[] = Array.isArray(data)
    ? data
    : data
      ? Object.values(data).flat()
      : []

  return (
    <PermissionGate
      require={{ resource: "timetable", action: "view" }}
      denyBehavior="screen"
    >
      <div className="space-y-6 p-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-start justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <CalendarDays size={18} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">My Teaching Schedule</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Weekly timetable for your assigned courses
              </p>
            </div>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1 px-2.5 text-xs"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid size={13} />
              Grid
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1 px-2.5 text-xs"
              onClick={() => setViewMode("list")}
            >
              <List size={13} />
              List
            </Button>
          </div>
        </motion.div>

        {viewMode === "grid" ? (
          <TimetableGrid slots={slots} isLoading={isLoading} />
        ) : (
          <TimetableList slots={slots} isLoading={isLoading} />
        )}
      </div>
    </PermissionGate>
  )
}
