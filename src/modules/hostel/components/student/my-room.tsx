"use client"

import { BedDouble, Building2 } from "lucide-react"
import { motion } from "framer-motion"
import EmptyState from "@/components/custom/EmptyState"
import { useMyStudentId } from "@/hooks/use-my-student-id"
import { useStudentAllocations } from "../../hooks/use-allocations"
import { AllocationStatusBadge } from "../shared/status-badges"

export function MyRoom() {
  const { studentId } = useMyStudentId()
  const {
    data: allocations = [],
    isLoading,
    isError,
  } = useStudentAllocations(studentId ?? 0)

  if (!studentId) {
    return (
      <EmptyState
        icon={Building2}
        title="Can't load your room yet"
        description="Your student record couldn't be resolved. Try again later."
      />
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/40" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <EmptyState
        title="Couldn't load your allocation"
        description="Please try again."
      />
    )
  }

  if (allocations.length === 0) {
    return (
      <EmptyState
        icon={BedDouble}
        title="No room allocated yet"
        description="You haven't been assigned a hostel room."
      />
    )
  }

  const active = allocations.find((a) => a.status === "active")

  return (
    <div className="space-y-4">
      {active && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <p className="text-xs font-semibold tracking-wide text-emerald-700 uppercase dark:text-emerald-400">
            Current Room
          </p>
          <p className="mt-1 text-lg font-bold text-foreground">
            {active.room
              ? `${active.room.block.hostel.name} — ${active.room.block.name} — ${active.room.roomNumber}`
              : `Room #${active.roomId}`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Allocated {new Date(active.allocatedAt).toLocaleDateString()}
          </p>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Allocation History
        </p>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {allocations.map((allocation, idx) => (
            <motion.div
              key={allocation.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.03 }}
              className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 last:border-none"
            >
              <span className="text-sm text-foreground">
                {allocation.room
                  ? `${allocation.room.block.hostel.name} · ${allocation.room.roomNumber}`
                  : `Room #${allocation.roomId}`}
              </span>
              <AllocationStatusBadge status={allocation.status} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
