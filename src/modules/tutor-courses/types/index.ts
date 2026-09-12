import type {
  ClassType,
  DayOfWeek,
  TimetableSlot,
} from "@/modules/timetable/types/timetable.types"

// A slot being edited in the schedule form — `id` present means it's an
// existing real ClassSchedule row (PUT on save), absent means it's new
// (POST on save). Slots removed from the array entirely are DELETEd.
export interface ScheduleSlotDraft {
  id?: number
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
  venue: string
  classType: ClassType
}

export interface CourseProgramme {
  name: string
  code: string
  isRequired: boolean
}

export interface AssignedCourse {
  id: number // CourseOffering id
  courseCode: string
  courseTitle: string
  // Credit units, term names, level, department/faculty, programmes and the
  // category breadcrumb are all filled in from the enriched
  // `GET /courses/offerings` response (see
  // sandbox/course/missing_course_offering_enrichment.readme.md); `null` / `[]`
  // until that ships.
  creditUnits: number | null
  semesterName: string | null
  academicYear: string | null
  levelName: string | null
  departmentName: string | null
  facultyName: string | null
  programmes: CourseProgramme[]
  categoryPath: string[]
  registeredStudents: number | null
  schedule: TimetableSlot[]
}
