"use client"

import { useQuery } from "@tanstack/react-query"
import { moodleSyncService } from "../services/moodle-sync.service"
import { moodleSyncKeys } from "./query-keys"

export function useSyncCalendarEvents() {
  return useQuery({
    queryKey: moodleSyncKeys.calendar(),
    queryFn: moodleSyncService.listCalendarEvents,
    staleTime: 5 * 60 * 1000,
  })
}

export function useSyncCalendarEventsByCourse(courseOfferingId: number) {
  return useQuery({
    queryKey: moodleSyncKeys.calendarByCourse(courseOfferingId),
    queryFn: () =>
      moodleSyncService.listCalendarEventsByCourse(courseOfferingId),
    enabled: !!courseOfferingId,
  })
}

export function useUpcomingCalendarEvents() {
  return useQuery({
    queryKey: moodleSyncKeys.calendarUpcoming(),
    queryFn: moodleSyncService.listUpcomingEvents,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCalendarEvent(id: number) {
  return useQuery({
    queryKey: moodleSyncKeys.calendarEvent(id),
    queryFn: () => moodleSyncService.getCalendarEvent(id),
    enabled: !!id,
  })
}
