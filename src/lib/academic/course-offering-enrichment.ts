import apiClient from "@/lib/clients/apiClient"
import { dedupeAsync } from "@/lib/utils/dedupe-async"

// Shared mapping for the enriched `GET /courses/offerings` response — used by
// both `@/services/usersApi` (tutor course-assignment) and
// `@/services/courseOfferingApi` (admin offerings, timetable, enrollment,
// grades). Backend contract:
// sandbox/course/missing_course_offering_enrichment.readme.md
//
// Everything here is populated only once that enrichment ships. Until then the
// mapper falls back to `GET /academic-calendar` for the term names and leaves
// the rest `null` / `[]`, so no consumer breaks.

const AUTH = { access_token: true } as const

export type CourseOfferingCourseType =
  | "GENERAL"
  | "FACULTY"
  | "DEPARTMENTAL"
  | "ELECTIVE"

// One node of a course's academic category tree (Faculty › Department › Level),
// mirroring the Moodle category hierarchy. `moodle_category_id` is set once
// that node has been pushed to Moodle.
export interface CourseCategoryNode {
  entity_type: "faculty" | "department" | "program" | "level"
  entity_id: number
  name: string
  moodle_category_id: number | null
}

// A programme this course is mapped to, with whether it's required/elective for
// that programme and the programme's own department → faculty chain.
export interface CourseProgramLink {
  id: number
  name: string
  code: string
  degree_type: string
  is_required: boolean
  department_name: string
  faculty_name: string
}

// The fields the enriched offering response adds on top of the base offering.
// Composed into both `@/types/users` and `@/types/school` `CourseOffering`.
export interface CourseOfferingEnrichment {
  credit_units: number | null
  course_type: CourseOfferingCourseType | null
  level_name: string | null
  session_name: string | null
  semester_name: string | null
  enrolled_count: number | null
  owning_department_name: string | null
  owning_faculty_name: string | null
  programs: CourseProgramLink[]
  category_path: CourseCategoryNode[]
}

// ── wire (camelCase subset of the raw offering item) ──────────────────────────

export interface WireEnrichedCourseFields {
  id?: number
  creditUnits?: number
  courseType?: CourseOfferingCourseType
  level?: { id: number; name: string; numericValue: number }
  owningDepartment?: {
    id: number
    name: string
    code: string
    faculty: { id: number; name: string; code: string }
  } | null
  programs?: {
    id: number
    name: string
    code: string
    degreeType: string
    isRequired: boolean
    department: { id: number; name: string; code: string }
    faculty: { id: number; name: string; code: string }
  }[]
  categoryPath?: {
    entityType: CourseCategoryNode["entity_type"]
    entityId: number
    name: string
    moodleCategoryId: number | null
  }[]
}

export interface WireOfferingEnrichmentInput {
  academicSessionId: number
  semesterId: number
  session?: { id: number; name: string }
  semester?: { id: number; name: string }
  enrolledCount?: number
  course?: WireEnrichedCourseFields
}

// ── academic-calendar fallback for term names ────────────────────────────────

export interface AcademicTermNames {
  sessionId: number | null
  sessionName: string | null
  semesterNamesById: Map<number, string>
}

// Resolved from `GET /academic-calendar` (active session + its semesters) to
// turn an offering's bare session/semester ids into display names. Non-fatal —
// on failure, offerings still render with ids/status, just without names.
//
// `dedupeAsync`: this is called from every offering mapper in both
// `courseOfferingApi` and `usersApi`, so a page listing offerings from a
// couple of angles would otherwise hit `/academic-calendar` several times per
// load. The active session/semesters barely change, so a 60s shared result
// is safe.
export const fetchAcademicTermNames = dedupeAsync(
  async (): Promise<AcademicTermNames> => {
    try {
      const res = await apiClient.get<{
        data: {
          session: { id: number; name: string } | null
          semesters: { id: number; name: string }[]
        }
      }>("/academic-calendar", AUTH)
      return {
        sessionId: res.data.session?.id ?? null,
        sessionName: res.data.session?.name ?? null,
        semesterNamesById: new Map(
          (res.data.semesters ?? []).map((s) => [s.id, s.name])
        ),
      }
    } catch {
      return {
        sessionId: null,
        sessionName: null,
        semesterNamesById: new Map(),
      }
    }
  },
  60_000
)

export function mapCourseOfferingEnrichment(
  o: WireOfferingEnrichmentInput,
  terms?: AcademicTermNames
): CourseOfferingEnrichment {
  return {
    credit_units: o.course?.creditUnits ?? null,
    course_type: o.course?.courseType ?? null,
    level_name: o.course?.level?.name ?? null,
    session_name:
      o.session?.name ??
      (terms && terms.sessionId === o.academicSessionId
        ? terms.sessionName
        : null),
    semester_name:
      o.semester?.name ?? terms?.semesterNamesById.get(o.semesterId) ?? null,
    enrolled_count: o.enrolledCount ?? null,
    owning_department_name: o.course?.owningDepartment?.name ?? null,
    owning_faculty_name: o.course?.owningDepartment?.faculty?.name ?? null,
    programs: (o.course?.programs ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      degree_type: p.degreeType,
      is_required: p.isRequired,
      department_name: p.department?.name ?? "—",
      faculty_name: p.faculty?.name ?? "—",
    })),
    category_path: (o.course?.categoryPath ?? []).map((c) => ({
      entity_type: c.entityType,
      entity_id: c.entityId,
      name: c.name,
      moodle_category_id: c.moodleCategoryId ?? null,
    })),
  }
}

// Faculty › Department › Level breadcrumb for an offering — prefers the explicit
// category path, falls back to the course's owning faculty/department.
export function formatOfferingCategory(o: {
  owning_department_name: string | null
  owning_faculty_name: string | null
  category_path: { name: string }[]
}): string {
  if (o.category_path.length)
    return o.category_path.map((c) => c.name).join(" › ")
  return [o.owning_faculty_name, o.owning_department_name]
    .filter(Boolean)
    .join(" › ")
}

// "3 CU · 200 Level · First Semester · 2025/2026" from whatever enrichment
// fields are present. Status is left to the caller (usually shown as a badge).
export function formatOfferingMeta(o: {
  credit_units: number | null
  level_name: string | null
  semester_name: string | null
  session_name: string | null
}): string {
  return [
    o.credit_units != null ? `${o.credit_units} CU` : null,
    o.level_name,
    o.semester_name,
    o.session_name,
  ]
    .filter(Boolean)
    .join(" · ")
}
