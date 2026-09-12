import { z } from "zod"

export const PrioritySchema = z.enum(["low", "normal", "high", "urgent"])

export const CATEGORY_SUGGESTIONS = [
  "news",
  "event",
  "academic",
  "general",
] as const

export const CreateAnnouncementSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().min(1, "Content is required"),
  category: z.string().min(1, "Category is required").max(30),
  priority: PrioritySchema.default("normal"),
  expiresAt: z.string().optional(),
  isPublished: z.boolean().default(false),
})

export const UpdateAnnouncementSchema = CreateAnnouncementSchema.omit({
  isPublished: true,
}).partial()

export type CreateAnnouncementValues = z.infer<typeof CreateAnnouncementSchema>
export type CreateAnnouncementInputValues = z.input<
  typeof CreateAnnouncementSchema
>
export type UpdateAnnouncementValues = z.infer<typeof UpdateAnnouncementSchema>
