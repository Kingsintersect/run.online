"use client"

import { useMemo } from "react"
import { useMajorPrograms } from "@/hooks/useCourseStructure"
import type { AssignedCourse } from "../types"

export interface MajorProgramCourseGroup {
  /** null collects courses whose owning major program isn't known. */
  majorProgramId: number | null
  name: string
  courses: AssignedCourse[]
}

const UNKNOWN = "Other courses"

// A tutor can teach in several major programs at once (B.Sc, postgraduate,
// business school…), so their courses are grouped by the major program each
// offering belongs to. An offering shared by two major programs appears in
// both groups. Groups are sorted by name, with unknown owners last.
export function useCourseMajorPrograms(courses: AssignedCourse[]) {
  const { data } = useMajorPrograms()

  return useMemo(() => {
    const names = new Map(
      (data?.data ?? []).map((mp) => [mp.id, mp.name] as const)
    )
    const groups = new Map<number | null, AssignedCourse[]>()
    for (const course of courses) {
      const owners = course.majorProgramIds.length
        ? course.majorProgramIds
        : [null]
      for (const id of owners) {
        const list = groups.get(id) ?? []
        list.push(course)
        groups.set(id, list)
      }
    }
    const result: MajorProgramCourseGroup[] = [...groups.entries()].map(
      ([majorProgramId, list]) => ({
        majorProgramId,
        name:
          majorProgramId == null
            ? UNKNOWN
            : (names.get(majorProgramId) ?? `Major program #${majorProgramId}`),
        courses: list,
      })
    )
    return result.sort((a, b) =>
      a.majorProgramId == null
        ? 1
        : b.majorProgramId == null
          ? -1
          : a.name.localeCompare(b.name)
    )
  }, [courses, data])
}
