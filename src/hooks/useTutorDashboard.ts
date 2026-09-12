"use client"

import { useMemo } from "react"
import { useAssignedCourses } from "@/modules/tutor-courses/hooks/use-tutor-courses"
import { useMyTimetable } from "@/modules/timetable/hooks/useTimetable"
import { useUnreadCount } from "@/modules/notifications/hooks/use-notifications"
import type { DayOfWeek } from "@/modules/timetable/types/timetable.types"

const TODAY_KEY: DayOfWeek[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
]

export function useTutorDashboardData() {
  const { courses, loading: coursesLoading } = useAssignedCourses()
  const { data: timetableData, isLoading: timetableLoading } = useMyTimetable()
  const { data: unreadRes, isLoading: unreadLoading } = useUnreadCount()

  const slots = useMemo(
    () =>
      Array.isArray(timetableData)
        ? timetableData
        : Object.values(timetableData ?? {}).flat(),
    [timetableData]
  )

  const today = TODAY_KEY[new Date().getDay()]
  const todaysSessions = useMemo(
    () =>
      slots
        .filter((s) => s.dayOfWeek === today)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [slots, today]
  )

  return {
    assignedCourseCount: courses.length,
    todaysSessions,
    unreadNotifications: unreadRes?.data?.unreadCount ?? null,
    isLoading: coursesLoading || timetableLoading || unreadLoading,
  }
}
