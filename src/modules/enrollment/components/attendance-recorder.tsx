"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { CalendarCheck, Loader2, Save } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import EmptyState from "@/components/custom/EmptyState"
import { useMyTimetable } from "@/modules/timetable/hooks/useTimetable"
import { useEnrollmentsByOffering } from "../hooks/use-enrollments"
import { useAttendanceBySchedule } from "../hooks/use-attendance"
import { useBulkRecordAttendance } from "../hooks/use-attendance-mutations"
import type { AttendanceStatus } from "../types"

const STATUS_OPTIONS: {
  value: AttendanceStatus
  label: string
  colour: string
}[] = [
  {
    value: "present",
    label: "Present",
    colour: "bg-emerald-500 text-white border-emerald-500",
  },
  {
    value: "late",
    label: "Late",
    colour: "bg-amber-500 text-white border-amber-500",
  },
  {
    value: "absent",
    label: "Absent",
    colour: "bg-red-500 text-white border-red-500",
  },
  {
    value: "excused",
    label: "Excused",
    colour: "bg-slate-500 text-white border-slate-500",
  },
]

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function AttendanceRecorder() {
  const { data, isLoading: schedulesLoading } = useMyTimetable()
  const slots = Array.isArray(data) ? data : Object.values(data ?? {}).flat()

  const [scheduleId, setScheduleId] = useState<number | null>(null)
  const [attendanceDate, setAttendanceDate] = useState(todayISO())
  const [marks, setMarks] = useState<Record<number, AttendanceStatus>>({})
  const [saved, setSaved] = useState<{ recorded: number } | null>(null)

  const selectedSlot = slots.find((s) => s.id === scheduleId) ?? null

  const { data: roster = [], isLoading: rosterLoading } =
    useEnrollmentsByOffering(selectedSlot?.offeringId ?? null)
  const { data: existing = [] } = useAttendanceBySchedule(
    scheduleId,
    attendanceDate
  )
  const bulkRecord = useBulkRecordAttendance()

  const activeRoster = useMemo(
    () => roster.filter((r) => r.status === "ENROLLED"),
    [roster]
  )

  const existingByStudent = useMemo(
    () => new Map(existing.map((e) => [e.studentId, e.status])),
    [existing]
  )

  const statusFor = (studentId: number): AttendanceStatus =>
    marks[studentId] ?? existingByStudent.get(studentId) ?? "present"

  const setMark = (studentId: number, status: AttendanceStatus) =>
    setMarks((prev) => ({ ...prev, [studentId]: status }))

  const handleSave = async () => {
    if (!scheduleId) return
    const records = activeRoster.map((r) => ({
      studentId: r.studentId,
      status: statusFor(r.studentId),
    }))
    const res = await bulkRecord.mutateAsync({
      scheduleId,
      attendanceDate,
      records,
    })
    setSaved({ recorded: res.recorded })
    setMarks({})
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Class Session</Label>
            <Select
              value={scheduleId ? String(scheduleId) : undefined}
              onValueChange={(v) => {
                setScheduleId(Number(v))
                setSaved(null)
              }}
              disabled={schedulesLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    schedulesLoading
                      ? "Loading your schedule…"
                      : "Select a class session"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {slots.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.courseCode} —{" "}
                    {s.dayOfWeek.charAt(0) + s.dayOfWeek.slice(1).toLowerCase()}{" "}
                    {s.startTime}–{s.endTime} ({s.venue})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="attendanceDate" className="text-xs">
              Date
            </Label>
            <input
              id="attendanceDate"
              type="date"
              value={attendanceDate}
              onChange={(e) => {
                setAttendanceDate(e.target.value)
                setSaved(null)
              }}
              className="h-9 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {!scheduleId ? (
        <EmptyState
          icon={CalendarCheck}
          title="Pick a class session"
          description="Select one of your scheduled classes and a date to take attendance."
        />
      ) : rosterLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : activeRoster.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No students enrolled"
          description="This course offering has no active enrollments yet."
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-2xl border border-border bg-card"
        >
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
            <p className="text-sm font-semibold text-foreground">
              {activeRoster.length} students
            </p>
            {saved && (
              <p className="text-xs text-emerald-600">
                Saved attendance for {saved.recorded} student
                {saved.recorded !== 1 ? "s" : ""}.
              </p>
            )}
          </div>
          <div className="divide-y divide-border/50">
            {activeRoster.map((r) => (
              <div
                key={r.studentId}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div>
                  <p className="text-xs font-medium text-foreground">
                    {r.studentName}
                  </p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {r.studentMatric}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setMark(r.studentId, opt.value)}
                      className={cn(
                        "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition",
                        statusFor(r.studentId) === opt.value
                          ? opt.colour
                          : "border-border bg-transparent text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end border-t border-border bg-muted/10 px-5 py-3">
            <Button
              onClick={() => void handleSave()}
              disabled={bulkRecord.isPending}
              className="min-w-32 gap-2"
            >
              {bulkRecord.isPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Save size={13} />
              )}
              Save Attendance
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
