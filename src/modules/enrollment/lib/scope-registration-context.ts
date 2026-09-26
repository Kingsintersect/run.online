import type { ProgramCourse } from "@/types/school"
import type { RegistrationContext } from "../types"

// "First Semester" → 1, "Second Semester" → 2, "Third …" → 3. Null when the
// name doesn't say, in which case semester isn't used to narrow.
export function semesterOrdinal(name: string): number | null {
  const n = name.toLowerCase()
  if (/\b(first|1st)\b/.test(n)) return 1
  if (/\b(second|2nd)\b/.test(n)) return 2
  if (/\b(third|3rd)\b/.test(n)) return 3
  const digit = n.match(/\b([1-9])\b/)
  return digit ? Number(digit[1]) : null
}

interface ScopeInput {
  context: RegistrationContext
  /** The student's own program curriculum (GET /courses/programs/{id}). */
  curriculum: ProgramCourse[]
  /** The student's current level (Student.current_level_id). */
  levelId: number | null
}

/**
 * Narrows a registration context to what this student can actually take,
 * while the backend returns every course at the level system-wide
 * (BACKEND_DEVIATIONS B21):
 *
 * - This level's courses: only the student's own program's curriculum courses
 *   for their current level, and for the semester being registered when the
 *   curriculum says which semester a course runs in (unset = either).
 * - Carryovers: a `NOT_TAKEN` carryover means "a required course from an
 *   *earlier* level", so one that is in the current level's curriculum is not
 *   a carryover and is dropped (it stays in this level's list). A `FAILED`
 *   course being retaken stays a locked carryover and is not listed twice.
 *
 * It only removes rows the backend should not have sent; it never adds a
 * course or decides eligibility, credit limits or prerequisites. Once the
 * backend scopes `level_courses` itself, this changes nothing.
 */
export function scopeRegistrationContext({
  context,
  curriculum,
  levelId,
}: ScopeInput): RegistrationContext {
  if (curriculum.length === 0) return context

  const ordinal = semesterOrdinal(context.semester.name)
  const currentLevel = curriculum.filter(
    (c) =>
      (levelId == null || c.level_id == null || c.level_id === levelId) &&
      (ordinal == null ||
        c.curriculum_semester == null ||
        c.curriculum_semester === ordinal)
  )
  const currentCodes = new Set(currentLevel.map((c) => c.code))
  // Same level, any semester: for telling a real carryover from a
  // current-level course that simply runs in the other semester.
  const levelCodes = new Set(
    curriculum
      .filter(
        (c) => levelId == null || c.level_id == null || c.level_id === levelId
      )
      .map((c) => c.code)
  )

  const carryovers = context.carryover_courses.filter(
    (c) => !(c.reason === "NOT_TAKEN" && levelCodes.has(c.course.code))
  )
  const carryoverCodes = new Set(carryovers.map((c) => c.course.code))

  const levelCourses = context.level_courses.filter(
    (c) => currentCodes.has(c.course.code) && !carryoverCodes.has(c.course.code)
  )

  return {
    ...context,
    carryover_courses: carryovers,
    level_courses: levelCourses,
  }
}
