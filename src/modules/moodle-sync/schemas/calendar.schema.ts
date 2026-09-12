import { z } from "zod"

export const CalendarEventTypeSchema = z.enum([
  "course",
  "site",
  "user",
  "zoom",
])

export const CalendarEventResponseSchema = z.object({
  id: z.number(),
  eventType: CalendarEventTypeSchema,
  name: z.string(),
  description: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  meetingUrl: z.string().nullable(),
  course: z
    .object({
      moodleShortName: z.string(),
      courseOffering: z.object({
        course: z.object({ code: z.string(), title: z.string() }),
      }),
    })
    .nullable(),
})

export const CalendarEventListResponseSchema = z.object({
  data: z.array(CalendarEventResponseSchema),
})
