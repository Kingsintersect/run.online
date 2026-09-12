"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  calendarKeys,
  calendarMutationOptions,
  calendarQueryOptions,
} from "../services/timetable.service"
import type { CalendarEventFilter } from "../types/timetable.types"

export function useMyCalendarEvents(params?: CalendarEventFilter) {
  return useQuery({
    ...calendarQueryOptions.my(params),
    staleTime: 3 * 60 * 1000,
  })
}

export function useMyUpcomingEvents() {
  return useQuery({
    ...calendarQueryOptions.myUpcoming(),
    staleTime: 3 * 60 * 1000,
  })
}

export function useUpcomingEvents(days?: number) {
  return useQuery({
    ...calendarQueryOptions.upcoming(days),
    staleTime: 3 * 60 * 1000,
  })
}

export function useAllCalendarEvents(filters?: CalendarEventFilter) {
  return useQuery({
    ...calendarQueryOptions.admin(filters),
    staleTime: 3 * 60 * 1000,
  })
}

export function useCalendarEventById(id: number) {
  return useQuery({
    ...calendarQueryOptions.byId(id),
    staleTime: 3 * 60 * 1000,
    enabled: id > 0,
  })
}

// Every calendar event linked to one course offering
// (GET /calendar/events/course/:offeringId).
export function useCalendarEventsByCourse(offeringId: number | null) {
  return useQuery({
    ...calendarQueryOptions.byCourse(offeringId ?? 0),
    staleTime: 3 * 60 * 1000,
    enabled: offeringId !== null && offeringId > 0,
  })
}

export function useToggleEventVisibility() {
  const qc = useQueryClient()
  return useMutation({
    ...calendarMutationOptions.toggleVisibility(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: calendarKeys.all })
    },
  })
}
