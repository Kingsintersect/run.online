// Exam Timetable — contract per sandbox/exam-timetable/API_CONTRACTS.md.

export type ExamType = "REGULAR" | "MAKEUP" | "RESIT"
export type ExamScheduleStatus =
  | "SCHEDULED"
  | "ONGOING"
  | "COMPLETED"
  | "CANCELLED"

export interface Venue {
  id: number
  name: string
  capacity: number
  location: string | null
  isExamHall: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateVenuePayload {
  name: string
  capacity: number
  location?: string
  isExamHall?: boolean
}

export type UpdateVenuePayload = Partial<CreateVenuePayload> & {
  isActive?: boolean
}

export interface ExamScheduleVenue {
  id: number
  name: string
  capacity: number
}

export interface ExamSchedule {
  id: number
  courseOfferingId: number
  courseCode: string
  courseTitle: string
  venue: ExamScheduleVenue
  examDate: string // YYYY-MM-DD
  startTime: string // HH:MM
  endTime: string // HH:MM
  examType: ExamType
  status: ExamScheduleStatus
  invigilatorIds: number[]
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateExamSchedulePayload {
  courseOfferingId: number
  venueId: number
  examDate: string
  startTime: string
  endTime: string
  examType?: ExamType
  invigilatorIds?: number[]
  notes?: string
}

export type UpdateExamSchedulePayload = Partial<
  Omit<CreateExamSchedulePayload, "courseOfferingId">
> & {
  status?: ExamScheduleStatus
}

export interface ExamScheduleFilters {
  semesterId?: number
  venueId?: number
  courseOfferingId?: number
  from?: string
  to?: string
  page?: number
  limit?: number
}

export interface ExamConflictCheckParams {
  venueId: number
  examDate: string
  startTime: string
  endTime: string
  invigilatorIds?: number[]
  excludeExamId?: number
}

export interface ExamConflictSummary {
  hasConflict: boolean
  conflictingExams: {
    id: number
    courseCode: string
    startTime: string
    endTime: string
  }[]
}

export interface InvigilatorConflict {
  userId: number
  conflictingExams: { id: number; courseCode: string }[]
}

export interface ExamConflictCheckResult {
  venueConflict: ExamConflictSummary
  invigilatorConflicts: InvigilatorConflict[]
}
