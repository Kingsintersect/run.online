import { z } from "zod"

export const GradeResponseSchema = z.object({
  id: z.number(),
  itemName: z.string(),
  grade: z.number().nullable(),
  maxGrade: z.number().nullable(),
  feedback: z.string().nullable(),
  gradedAt: z.string().nullable(),
  course: z.object({
    moodleShortName: z.string(),
    moodleFullName: z.string(),
    courseOffering: z.object({
      course: z.object({ code: z.string(), title: z.string() }),
    }),
  }),
  // Not confirmed live — this schema was written for GET /grades/my (one
  // student, so no identity field needed), then reused as-is for
  // GET /grades/course/:offeringId, which returns EVERY student's grades for
  // that course and therefore needs one. Added optional/best-effort so a
  // tutor-facing course view (see tutor-course-grades.tsx) can group rows by
  // student if the real response includes one of these shapes; if it
  // includes none, that's a genuine backend gap (flagged in
  // BACKEND_DEVIATIONS_2026-09-14.md), not a frontend mapping bug.
  studentId: z.number().nullish(),
  student: z
    .object({
      matricNumber: z.string().nullish(),
      user: z
        .object({
          firstName: z.string().nullish(),
          lastName: z.string().nullish(),
        })
        .nullish(),
    })
    .nullish(),
})

export const GradeListResponseSchema = z.object({
  data: z.array(GradeResponseSchema),
})
