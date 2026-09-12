"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Trash2, Save, Loader2, X, CalendarClock } from "lucide-react"
import Modal from "@/components/custom/Modal"
import {
  DayOfWeekEnum,
  ClassTypeEnum,
} from "@/modules/timetable/schemas/schedule.schema"
import type {
  DayOfWeek,
  ClassType,
} from "@/modules/timetable/types/timetable.types"
import type {
  AssignedCourse,
  ScheduleSlotDraft,
} from "@/modules/tutor-courses/types"

const DAYS = DayOfWeekEnum.options
const CLASS_TYPES = ClassTypeEnum.options

const EMPTY_SLOT: ScheduleSlotDraft = {
  dayOfWeek: "MONDAY",
  startTime: "08:00",
  endTime: "10:00",
  venue: "",
  classType: "LECTURE",
}

interface ScheduleEditorModalProps {
  course: AssignedCourse
  open: boolean
  onClose: () => void
  onSave: (slots: ScheduleSlotDraft[]) => void
  saving: boolean
}

export function ScheduleEditorModal({
  course,
  open,
  onClose,
  onSave,
  saving,
}: ScheduleEditorModalProps) {
  const [slots, setSlots] = useState<ScheduleSlotDraft[]>(() =>
    course.schedule.length > 0
      ? course.schedule.map((s) => ({
          id: s.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          venue: s.venue,
          classType: s.classType,
        }))
      : [{ ...EMPTY_SLOT }]
  )

  const addSlot = () => setSlots((prev) => [...prev, { ...EMPTY_SLOT }])

  const removeSlot = (i: number) =>
    setSlots((prev) => prev.filter((_, idx) => idx !== i))

  const updateSlot = (i: number, patch: Partial<ScheduleSlotDraft>) =>
    setSlots((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s))
    )

  const isValid = slots.every((s) => s.venue.trim() && s.startTime < s.endTime)

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Set Class Schedule"
      subtitle={`${course.courseCode} — ${course.courseTitle}`}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSave(slots)}
            disabled={saving || !isValid}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save Schedule
              </>
            )}
          </motion.button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        <AnimatePresence initial={false}>
          {slots.map((slot, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_auto] items-end gap-2"
            >
              {/* Day */}
              <div className="flex min-w-27.5 flex-col gap-1">
                {i === 0 && (
                  <label className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Day
                  </label>
                )}
                <select
                  value={slot.dayOfWeek}
                  onChange={(e) =>
                    updateSlot(i, { dayOfWeek: e.target.value as DayOfWeek })
                  }
                  className="rounded-xl border border-border bg-card px-2.5 py-2 text-xs text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d.charAt(0) + d.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class type */}
              <div className="flex flex-col gap-1">
                {i === 0 && (
                  <label className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Type
                  </label>
                )}
                <select
                  value={slot.classType}
                  onChange={(e) =>
                    updateSlot(i, { classType: e.target.value as ClassType })
                  }
                  className="rounded-xl border border-border bg-card px-2.5 py-2 text-xs text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                >
                  {CLASS_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0) + t.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start time */}
              <div className="flex flex-col gap-1">
                {i === 0 && (
                  <label className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Start
                  </label>
                )}
                <input
                  type="time"
                  value={slot.startTime}
                  onChange={(e) => updateSlot(i, { startTime: e.target.value })}
                  className="rounded-xl border border-border bg-card px-2.5 py-2 text-xs text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>

              {/* End time */}
              <div className="flex flex-col gap-1">
                {i === 0 && (
                  <label className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    End
                  </label>
                )}
                <input
                  type="time"
                  value={slot.endTime}
                  onChange={(e) => updateSlot(i, { endTime: e.target.value })}
                  className={`rounded-xl border bg-card px-2.5 py-2 text-xs text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none ${
                    slot.endTime <= slot.startTime
                      ? "border-destructive focus:border-destructive"
                      : "border-border"
                  }`}
                />
              </div>

              {/* Venue */}
              <div className="flex flex-col gap-1">
                {i === 0 && (
                  <label className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Venue
                  </label>
                )}
                <input
                  type="text"
                  value={slot.venue}
                  onChange={(e) => updateSlot(i, { venue: e.target.value })}
                  placeholder="e.g. LT-A Block 1"
                  className="rounded-xl border border-border bg-card px-2.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>

              {/* Remove */}
              <div className={i === 0 ? "pt-5" : ""}>
                <button
                  onClick={() => removeSlot(i)}
                  disabled={slots.length === 1}
                  className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <button
          onClick={addSlot}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <Plus className="h-3.5 w-3.5" />
          Add another slot
        </button>

        {!isValid && slots.some((s) => s.endTime <= s.startTime) && (
          <p className="flex items-center gap-1 text-[11px] text-destructive">
            <CalendarClock className="h-3.5 w-3.5" />
            End time must be after start time in each slot.
          </p>
        )}
        {!isValid && slots.some((s) => !s.venue.trim()) && (
          <p className="flex items-center gap-1 text-[11px] text-destructive">
            <CalendarClock className="h-3.5 w-3.5" />
            All slots need a venue.
          </p>
        )}

        {/* Delete all / clear */}
        {slots.length > 0 && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => setSlots([{ ...EMPTY_SLOT }])}
              className="flex items-center gap-1 text-[11px] text-muted-foreground transition hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
              Reset all slots
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
