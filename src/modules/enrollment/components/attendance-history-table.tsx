"use client"

import { useState } from "react"
import { CalendarX2, Loader2, Pencil } from "lucide-react"
import { useAttendanceBySchedule } from "../hooks/use-attendance"
import { useUpdateAttendance } from "../hooks/use-attendance-mutations"
import StatusBadge from "@/components/custom/StatusBadge"
import EmptyState from "@/components/custom/EmptyState"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { AttendanceStatus } from "../types"

type StatusVariant = "success" | "warning" | "destructive" | "info" | "default"
const STATUS_BADGE: Record<
  AttendanceStatus,
  { label: string; variant: StatusVariant }
> = {
  present: { label: "Present", variant: "success" },
  late: { label: "Late", variant: "warning" },
  absent: { label: "Absent", variant: "destructive" },
  excused: { label: "Excused", variant: "info" },
}

interface AttendanceHistoryTableProps {
  scheduleId: number | null
  attendanceDate?: string
}

export function AttendanceHistoryTable({
  scheduleId,
  attendanceDate,
}: AttendanceHistoryTableProps) {
  const { data = [], isLoading } = useAttendanceBySchedule(
    scheduleId,
    attendanceDate
  )
  const updateAttendance = useUpdateAttendance()
  const [editingId, setEditingId] = useState<number | null>(null)

  if (!scheduleId) {
    return (
      <EmptyState
        icon={CalendarX2}
        title="Select a class session"
        description="Choose a class session to view its recorded attendance history."
      />
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={CalendarX2}
        title="No attendance recorded"
        description="No attendance has been recorded for this class session yet."
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="divide-y divide-border/50">
        {data.map((record) => (
          <div
            key={record.id}
            className="flex items-center justify-between gap-3 px-5 py-3"
          >
            <div>
              <p className="text-xs font-medium text-foreground">
                {record.studentName}
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {record.studentMatric}
              </p>
              {record.remarks && (
                <p className="mt-0.5 text-[11px] text-muted-foreground italic">
                  {record.remarks}
                </p>
              )}
            </div>
            {editingId === record.id ? (
              <div className="flex items-center gap-2">
                <Select
                  value={record.status}
                  onValueChange={(v) => {
                    updateAttendance.mutate(
                      { id: record.id, dto: { status: v as AttendanceStatus } },
                      { onSettled: () => setEditingId(null) }
                    )
                  }}
                >
                  <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_BADGE) as AttendanceStatus[]).map(
                      (s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_BADGE[s].label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                {updateAttendance.isPending && (
                  <Loader2
                    size={13}
                    className="animate-spin text-muted-foreground"
                  />
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <StatusBadge {...STATUS_BADGE[record.status]} dot />
                <button
                  onClick={() => setEditingId(record.id)}
                  className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  title="Edit attendance"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
