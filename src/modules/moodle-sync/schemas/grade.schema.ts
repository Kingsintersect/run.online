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
})

export const GradeListResponseSchema = z.object({
  data: z.array(GradeResponseSchema),
})
