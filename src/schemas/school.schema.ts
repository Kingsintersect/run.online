import { z } from "zod"

// ── Academic Session ────────────────────────

export const academicSessionSchema = z
  .object({
    name: z.string().min(1, "Session name is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    isActive: z.boolean(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  })

export type AcademicSessionFormValues = z.infer<typeof academicSessionSchema>

// ── Semester ────────────────────────────────

export const semesterSchema = z
  .object({
    name: z.string().min(1, "Semester name is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    registrationStart: z.string().optional(),
    registrationEnd: z.string().optional(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  })

export type SemesterFormValues = z.infer<typeof semesterSchema>

// ── Fee Structure ───────────────────────────

export const feeStructureSchema = z.object({
  academic_session_id: z.string().min(1, "Academic session is required"),
  program_id: z.string().min(1, "Program is required"),
  level: z.number().int().min(100, "Level is required"),
  total_amount: z.number().positive("Amount must be greater than 0"),
  description: z.string(),
})

export type FeeStructureFormValues = z.infer<typeof feeStructureSchema>

// ── Fresher Fee ─────────────────────────────

export const fresherFeeSchema = z.object({
  academic_session_id: z.string().min(1, "Academic session is required"),
  name: z.string().min(1, "Fee name is required"),
  amount: z.number().positive("Amount must be greater than 0"),
})

export type FresherFeeFormValues = z.infer<typeof fresherFeeSchema>

// ── Other Fee ───────────────────────────────

export const otherFeeSchema = z.object({
  academic_session_id: z.string().min(1, "Academic session is required"),
  semester_id: z.string(), // "" = All Semesters
  level: z.number().int().min(0, "Level is required"), // 0 = All Levels
  name: z.string().min(1, "Fee name is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  description: z.string(),
})

export type OtherFeeFormValues = z.infer<typeof otherFeeSchema>

// ── Admission Cycle ─────────────────────────

export const admissionCycleSchema = z.object({
  academic_session_id: z.string().min(1, "Academic session is required"),
  application_start_date: z.string().min(1, "Start date is required"),
  application_end_date: z.string(), // "" = no deadline
  late_application_allowed: z.boolean(),
  late_application_fee: z.number().min(0, "Fee cannot be negative"),
  max_applications: z
    .number()
    .int()
    .min(0, "Must be 0 (unlimited) or positive"),
  require_documents: z.boolean(),
  required_documents: z.array(z.string()),
  notification_email: z.string().email("Must be a valid email"),
  instructions: z.string(),
})

export type AdmissionCycleFormValues = z.infer<typeof admissionCycleSchema>

// ── Admission Requirement ───────────────────

export const admissionRequirementSchema = z.object({
  admission_cycle_id: z.string().min(1, "Admission cycle is required"),
  program_id: z.string(), // "" = all programs
  min_age: z.number().int().min(0),
  max_age: z.number().int().min(0),
  min_credits: z.number().int().min(0, "Credits must be 0 or more"),
  required_subjects: z.array(z.string()),
  description: z.string().min(1, "Description is required"),
})

export type AdmissionRequirementFormValues = z.infer<
  typeof admissionRequirementSchema
>

// ── Admission Offer ──────────────────────────

export const createAdmissionOfferSchema = z.object({
  admissionNumber: z.string().min(1, "Admission number is required").max(30),
  programId: z.number().int().positive("Select a program"),
  levelId: z.number().int().positive("Select a level"),
  sessionId: z.number().int().positive("Select a session"),
  admissionDate: z.string().min(1, "Admission date is required"),
  admissionType: z.string().min(1, "Admission type is required").max(20),
  expiryDate: z.string().optional(),
})

export type CreateAdmissionOfferFormValues = z.infer<
  typeof createAdmissionOfferSchema
>

// Bulk offer creation shares one level / type / date / expiry across every
// selected application; program and session are derived per-application from
// its own program choice + admission cycle, and admission numbers are
// auto-generated, so none of those appear here.
export const bulkCreateAdmissionOffersSchema = z.object({
  levelId: z.number().int().positive("Select a level"),
  admissionDate: z.string().min(1, "Admission date is required"),
  admissionType: z.string().min(1, "Admission type is required").max(20),
  expiryDate: z.string().optional(),
})

export type BulkCreateAdmissionOffersFormValues = z.infer<
  typeof bulkCreateAdmissionOffersSchema
>

// ── Course Structure ────────────────────────

export const facultySchema = z.object({
  name: z.string().min(1, "Faculty name is required").max(200),
  code: z
    .string()
    .min(1, "Code is required")
    .max(10, "Code must be 10 characters or less"),
  description: z.string().optional(),
  deanUserId: z.number().int().positive().optional(),
  email: z.string().email("Must be a valid email").or(z.literal("")).optional(),
  phoneNumber: z.string().optional(),
})

export type FacultyFormValues = z.infer<typeof facultySchema>

export const departmentSchema = z.object({
  name: z.string().min(1, "Department name is required").max(200),
  code: z
    .string()
    .min(1, "Code is required")
    .max(10, "Code must be 10 characters or less"),
  description: z.string().optional(),
  hodUserId: z.number().int().positive().optional(),
  email: z.string().email("Must be a valid email").or(z.literal("")).optional(),
  phoneNumber: z.string().optional(),
})

export type DepartmentFormValues = z.infer<typeof departmentSchema>

export const programSchema = z.object({
  name: z.string().min(1, "Program name is required").max(200),
  code: z
    .string()
    .min(1, "Code is required")
    .max(20, "Code must be 20 characters or less"),
  degreeType: z.string().min(1, "Degree type is required").max(30),
  durationYears: z.number().int().min(1, "Duration must be at least 1 year"),
  description: z.string().optional(),
  admissionRequirements: z.string().optional(),
  minCreditUnits: z.number().int().min(1, "Minimum credit units required"),
  // Multi-Program Platform — sandbox/multi-program-platform/. Defaults to
  // DEGREE server-side when omitted, matching every existing Program's
  // current behavior.
  programCategory: z
    .enum([
      "DEGREE",
      "POSTGRADUATE",
      "CERTIFICATE",
      "DIPLOMA",
      "SECONDARY_SCHOOL",
      "FOUNDATIONAL",
      "PART_TIME",
    ])
    .optional(),
})

export type ProgramFormValues = z.infer<typeof programSchema>

export const curriculumLevelSchema = z.object({
  name: z.string().min(1, "Level name is required").max(20),
  numericValue: z.number().int().min(100, "Level must be at least 100"),
})

export type CurriculumLevelFormValues = z.infer<typeof curriculumLevelSchema>

// ── Course Management ───────────────────────

export const courseSchema = z.object({
  code: z
    .string()
    .min(1, "Course code is required")
    .max(15, "Code must be 15 characters or less"),
  title: z.string().min(1, "Course title is required"),
  description: z.string().optional(),
  credit_units: z
    .number()
    .int()
    .min(1, "Credit units must be at least 1")
    .max(12, "Credit units must be 12 or less"),
  course_type: z.enum(
    [
      "GENERAL",
      "FACULTY",
      "DEPARTMENTAL",
      "ELECTIVE",
      "SUBJECT",
      "RESEARCH_PROJECT",
    ],
    { message: "Course type is required" }
  ),
  level_id: z.number().int().positive("Level is required"),
  owning_department_id: z.number().int().positive().nullable().optional(),
  syllabus: z.string().optional(),
})

export type CourseFormValues = z.infer<typeof courseSchema>

export const programCourseAssignSchema = z.object({
  course_id: z.number().int().positive("Course is required"),
  is_required: z.boolean(),
})

export type ProgramCourseAssignFormValues = z.infer<
  typeof programCourseAssignSchema
>

// ── Course Prerequisites ─────────────────────

export const addPrerequisiteSchema = z.object({
  prerequisite_id: z.number().int().positive("Select a prerequisite course"),
})

export type AddPrerequisiteFormValues = z.infer<typeof addPrerequisiteSchema>

// ── Course Offerings ─────────────────────────

export const offeringSchema = z.object({
  course_id: z.number().int().positive("Select a course"),
  academic_session_id: z.number().int().positive("Select a session"),
  semester_id: z.number().int().positive("Select a semester"),
  max_capacity: z.number().int().min(0).optional(),
  status: z.enum(["PLANNED", "OPEN", "CLOSED", "CANCELLED"]),
})

export type OfferingFormValues = z.infer<typeof offeringSchema>

export const updateOfferingSchema = z.object({
  max_capacity: z.number().int().min(0).optional(),
  status: z.enum(["PLANNED", "OPEN", "CLOSED", "CANCELLED"]),
})

export type UpdateOfferingFormValues = z.infer<typeof updateOfferingSchema>

export const assignLecturerSchema = z.object({
  lecturer_id: z.number().int().positive("Select a lecturer"),
  role: z.enum(["primary", "assistant", "tutorial"]),
})

export type AssignLecturerFormValues = z.infer<typeof assignLecturerSchema>

export const classScheduleSchema = z
  .object({
    lecturer_id: z.number().int().positive("Select a lecturer"),
    day_of_week: z.string().min(1, "Day is required"),
    start_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM format"),
    end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM format"),
    venue: z.string().min(1, "Venue is required").max(100),
    class_type: z.string().min(1, "Class type is required").max(20),
  })
  .refine((data) => data.end_time > data.start_time, {
    message: "End time must be after start time",
    path: ["end_time"],
  })

export type ClassScheduleFormValues = z.infer<typeof classScheduleSchema>
