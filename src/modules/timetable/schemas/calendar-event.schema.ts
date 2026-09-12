import { z } from "zod"

export const CalendarEventFilterSchema = z.object({
  eventType: z.enum(["course", "site", "user", "zoom"]).optional(),
  courseOfferingId: z.number().int().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  isVisible: z.boolean().optional(),
  days: z.number().int().min(1).max(90).optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
})
