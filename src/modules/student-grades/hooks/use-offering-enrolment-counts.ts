"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { courseOfferingQueryOptions } from "@/services/courseOfferingApi"

// Enrolled students per course offering, from the course-offerings list
// (one request for the whole table, never one per row). A result sheet's own
// `studentCount` only counts rows created by a Moodle pull, so before the
// first pull it reads 0 even when students are enrolled; this lets the
// Results workspace show the real enrolment alongside it.
//
// Best-effort: if the list can't be loaded (e.g. a role without access to
// all offerings), the map is empty and callers simply omit the figure.
export function useOfferingEnrolmentCounts(): Map<number, number> {
  const { data } = useQuery({
    ...courseOfferingQueryOptions.list(),
    staleTime: 60 * 1000,
    retry: false,
  })
  return useMemo(() => {
    const counts = new Map<number, number>()
    for (const o of data?.data ?? []) {
      if (typeof o.enrolled_count === "number")
        counts.set(o.id, o.enrolled_count)
    }
    return counts
  }, [data])
}
