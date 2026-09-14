import { z } from "zod"

// Exam Timetable — sandbox/exam-timetable/API_CONTRACTS.md.

export const venueSchema = z.object({
  name: z.string().min(1, "Venue name is required").max(150),
  capacity: z.number().int().positive("Capacity must be at least 1"),
  location: z.string().optional(),
  isExamHall: z.boolean().optional(),
})

export type VenueFormValues = z.infer<typeof venueSchema>

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/

export const examScheduleSchema = z
  .object({
    courseOfferingId: z.number().int().positive("Select a course offering"),
    venueId: z.number().int().positive("Select a venue"),
    examDate: z.string().min(1, "Exam date is required"),
    startTime: z.string().regex(timeRegex, "Use HH:MM format"),
    endTime: z.string().regex(timeRegex, "Use HH:MM format"),
    examType: z.enum(["REGULAR", "MAKEUP", "RESIT"]),
    invigilatorIds: z.array(z.number().int().positive()).optional(),
    notes: z.string().optional(),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  })

export type ExamScheduleFormValues = z.infer<typeof examScheduleSchema>
