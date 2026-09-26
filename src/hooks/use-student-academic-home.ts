"use client"

import { useMyStudent } from "@/hooks/use-my-student-id"
import {
  useDepartment,
  useFaculty,
  useProgram,
} from "@/hooks/useCourseStructure"

const MISSING = new Set(["", "—"])
const known = (value: string | null | undefined) =>
  value != null && !MISSING.has(value) ? value : null

export interface StudentAcademicHome {
  department: string | null
  faculty: string | null
  /**
   * What owns the program. "faculty" means the program sits directly under a
   * faculty, so there is no department to show; null means not known.
   */
  ownedBy: "department" | "faculty" | null
  isLoading: boolean
}

/**
 * The logged-in student's department and faculty.
 *
 * `GET /users/students/me` returns the program without its department or
 * faculty (BACKEND_DEVIATIONS B22), so these are resolved through what a
 * student may read: program → its department (`departmentId`) → that
 * department's faculty. Names on the student record win when the backend
 * sends them.
 *
 * Both stay null when the program isn't linked to a department. Some
 * structures attach a program straight to a faculty in the academic-unit
 * tree, which students can't read (403), so the backend has to return the
 * faculty in that case.
 */
export function useStudentAcademicHome(): StudentAcademicHome {
  const { student, isLoading: loadingStudent } = useMyStudent()
  const recordDepartment = known(student?.department_name)
  const recordFaculty = known(student?.faculty_name)
  const needsLookup = student != null && (!recordDepartment || !recordFaculty)

  const programQ = useProgram(
    needsLookup ? (student?.program_id ?? null) : null
  )
  const departmentId = programQ.data?.data.departmentId ?? null
  const departmentQ = useDepartment(departmentId)
  const facultyId = departmentQ.data?.data.facultyId ?? null
  const facultyQ = useFaculty(facultyId)

  const department = recordDepartment ?? departmentQ.data?.data.name ?? null
  const faculty = recordFaculty ?? facultyQ.data?.data.name ?? null
  return {
    department,
    faculty,
    ownedBy:
      student?.program_owned_by ??
      (department ? "department" : faculty ? "faculty" : null),
    isLoading:
      loadingStudent ||
      (needsLookup &&
        (programQ.isLoading ||
          (departmentId != null && departmentQ.isLoading) ||
          (facultyId != null && facultyQ.isLoading))),
  }
}
