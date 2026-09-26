// Real backend contract, composed from three already-real endpoints — this
// screen ("My Assigned Courses") doesn't have one dedicated endpoint of its
// own, it's a join of:
//   1. usersApi.getTutorCourses(lecturerId) — GET /courses/offerings?lecturerId=
//   2. timetableService.getSchedulesByOffering(offeringId) — GET /timetable/schedules/offering/:id
//   3. academicCalendarService.getCurrent() — for the current semester's display name
// See CLAUDE.md §13 / MISSING_BACKEND_APIS.md — no backend work needed here,
// this was previously a fully separate, fully mock implementation living
// under app/(dashboard)/tutor/courses/ instead of a module (CLAUDE.md §4
// violation), now consolidated onto the same real data every other schedule
// screen in this app uses.

import apiClient from "@/lib/clients/apiClient"
import { usersApi } from "@/services/usersApi"
import { timetableService } from "@/modules/timetable/services/timetable.service"
import type { CreateScheduleDto } from "@/modules/timetable/types/timetable.types"
import type { AssignedCourse, MoodleLaunchResult } from "../types"

const AUTH = { access_token: true } as const

export const tutorCoursesService = {
  async getAssignedCourses(lecturerId: number): Promise<AssignedCourse[]> {
    const assignmentsRes = await usersApi.getTutorCourses(lecturerId)

    return Promise.all(
      assignmentsRes.data.map(async (assignment) => {
        const offering = assignment.offering
        const schedule = await timetableService
          .getSchedulesByOffering(offering.id)
          .catch(() => [])
        return {
          id: offering.id,
          courseCode: offering.course_code,
          courseTitle: offering.course_title,
          creditUnits: offering.credit_units,
          semesterName: offering.semester_name,
          academicYear: offering.session_name,
          levelName: offering.level_name,
          departmentName: offering.owning_department_name,
          facultyName: offering.owning_faculty_name,
          programmes: offering.programs.map((p) => ({
            name: p.name,
            code: p.code,
            isRequired: p.is_required,
          })),
          categoryPath: offering.category_path.map((c) => c.name),
          majorProgramIds: offering.major_program_ids,
          // All of the above are `null` / `[]` until the enriched
          // GET /courses/offerings response ships (see AssignedCourse and
          // sandbox/course/missing_course_offering_enrichment.readme.md).
          registeredStudents: offering.enrolled_count,
          schedule,
        }
      })
    )
  },

  async addScheduleSlot(
    offeringId: number,
    lecturerId: number,
    dto: Omit<CreateScheduleDto, "offeringId" | "tutorId">
  ) {
    return timetableService.createSchedule({
      ...dto,
      offeringId,
      tutorId: lecturerId,
    })
  },

  async updateScheduleSlot(
    scheduleId: number,
    dto: Omit<CreateScheduleDto, "offeringId" | "tutorId">
  ) {
    return timetableService.updateSchedule(scheduleId, dto)
  },

  async removeScheduleSlot(scheduleId: number) {
    return timetableService.deleteSchedule(scheduleId)
  },

  // Proposed, not yet built backend-side — see
  // sandbox/tutor-moodle-sync/API_CONTRACTS.md §3. Mirrors the real, live
  // student endpoint (`GET /students/me/courses/:offeringId/launch`)
  // exactly, just under the lecturer's own namespace. Until the backend
  // ships it, every call here 404s — the UI treats that the same as "not
  // set up on Moodle yet" (see MoodleLaunchButton), never a broken page.
  async launchMoodleCourse(offeringId: number): Promise<MoodleLaunchResult> {
    return apiClient.get<MoodleLaunchResult>(
      `/users/lecturers/me/courses/${offeringId}/launch`,
      AUTH
    )
  },
}
