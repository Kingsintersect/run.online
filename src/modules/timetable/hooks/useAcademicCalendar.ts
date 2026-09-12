"use client"

import { useQuery } from "@tanstack/react-query"
import { academicCalendarQueryOptions } from "../services/timetable.service"

export function useAcademicCalendar() {
  return useQuery({
    ...academicCalendarQueryOptions.current(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useActiveSemester() {
  return useQuery({
    ...academicCalendarQueryOptions.activeSemester(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useActiveSession() {
  return useQuery({
    ...academicCalendarQueryOptions.activeSession(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useSessions() {
  return useQuery({
    ...academicCalendarQueryOptions.sessions(),
    staleTime: 10 * 60 * 1000,
  })
}

// One session with all its semesters (GET /academic-calendar/sessions/:id).
export function useSessionDetail(id: number | null) {
  return useQuery({
    ...academicCalendarQueryOptions.sessionDetail(id ?? 0),
    enabled: id !== null && id > 0,
    staleTime: 10 * 60 * 1000,
  })
}

// Portal-side calendar announcements (GET /academic-calendar/events).
export function useAcademicCalendarEvents(params?: {
  page?: number
  limit?: number
}) {
  return useQuery({
    ...academicCalendarQueryOptions.events(params),
    staleTime: 5 * 60 * 1000,
  })
}
