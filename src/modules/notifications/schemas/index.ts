import { z } from "zod"

export const notificationChannelSchema = z.enum([
  "IN_APP",
  "EMAIL",
  "SMS",
  "PUSH",
])

export const notificationStatusSchema = z.enum([
  "PENDING",
  "SENT",
  "FAILED",
  "READ",
])

export const notificationItemSchema = z.object({
  id: z.number(),
  subject: z.string(),
  body: z.string(),
  channel: notificationChannelSchema,
  status: notificationStatusSchema,
  sentAt: z.string().nullable(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
})

export const notificationListResponseSchema = z.object({
  data: z.array(notificationItemSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    unreadCount: z.number(),
  }),
})

// GET /notifications/unread-count -> { data: { unreadCount } }
export const unreadCountResponseSchema = z.object({
  data: z.object({ unreadCount: z.number() }),
})

// PATCH /notifications/:id/read -> the full serialized notification, wrapped
export const markReadResponseSchema = z.object({
  data: notificationItemSchema,
})

// GET /notifications/:id -> { data: Notification } (own notification only)
export const notificationDetailResponseSchema = z.object({
  data: notificationItemSchema,
})

// PATCH /notifications/read-all -> no count is returned by the backend
export const markAllReadResponseSchema = z.object({
  data: z.object({ status: z.literal("READ") }),
})

export const notificationFilterSchema = z.object({
  status: notificationStatusSchema.optional(),
  channel: notificationChannelSchema.optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
})

// ── Send / bulk-send ─────────────────────────────────────────────────────────

export const sendNotificationSchema = z.object({
  userId: z.number().int().positive(),
  templateId: z.number().int().positive().optional(),
  subject: z.string().min(1, "Subject required").max(200),
  body: z.string().min(1, "Body required"),
  channel: notificationChannelSchema,
})

export const bulkNotificationSchema = z.object({
  userIds: z
    .array(z.number().int().positive())
    .min(1, "Enter at least one user ID"),
  templateId: z.number().int().positive().optional(),
  subject: z.string().min(1, "Subject required").max(200),
  body: z.string().min(1, "Body required"),
  channel: notificationChannelSchema,
})

export const sendNotificationResponseSchema = z.object({
  data: notificationItemSchema,
})

export const bulkSendResponseSchema = z.object({
  data: z.object({
    sent: z.number(),
    errors: z.array(z.object({ userId: z.number(), message: z.string() })),
  }),
})

// ── Templates ────────────────────────────────────────────────────────────────
// The backend's serialize() does not currently return createdAt/updatedAt —
// kept optional here in case that's added later, but never rendered today.

export const notificationTemplateSchema = z.object({
  id: z.number(),
  name: z.string(),
  subject: z.string(),
  body: z.string(),
  channel: notificationChannelSchema,
  isActive: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export const templateListResponseSchema = z.object({
  data: z.array(notificationTemplateSchema),
})

export const templateResponseSchema = z.object({
  data: notificationTemplateSchema,
})

// name format (lowercase_snake_case) is a client-side UX convention, not a
// backend-enforced rule — the real validation is only `unique` + `max:50`.
export const createTemplateSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(50, "Name too long")
    .regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers and underscores"),
  subject: z.string().min(5, "Subject required").max(200, "Subject too long"),
  body: z.string().min(10, "Body required"),
  channel: notificationChannelSchema,
})

// no `isActive` field — there is no reactivate endpoint, only deactivate via DELETE
export const updateTemplateSchema = createTemplateSchema.partial()
