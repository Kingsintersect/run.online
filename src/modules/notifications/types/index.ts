import type { z } from "zod"
import type {
  notificationItemSchema,
  notificationListResponseSchema,
  unreadCountResponseSchema,
  markReadResponseSchema,
  markAllReadResponseSchema,
  notificationDetailResponseSchema,
  notificationFilterSchema,
  notificationChannelSchema,
  notificationStatusSchema,
  sendNotificationSchema,
  bulkNotificationSchema,
  sendNotificationResponseSchema,
  bulkSendResponseSchema,
  notificationTemplateSchema,
  templateListResponseSchema,
  templateResponseSchema,
  createTemplateSchema,
  updateTemplateSchema,
} from "../schemas"

export type NotificationChannel = z.infer<typeof notificationChannelSchema>
export type NotificationStatus = z.infer<typeof notificationStatusSchema>
export type NotificationItem = z.infer<typeof notificationItemSchema>
export type NotificationListResponse = z.infer<
  typeof notificationListResponseSchema
>
export type UnreadCountResponse = z.infer<typeof unreadCountResponseSchema>
export type MarkReadResponse = z.infer<typeof markReadResponseSchema>
export type NotificationDetailResponse = z.infer<
  typeof notificationDetailResponseSchema
>
export type MarkAllReadResponse = z.infer<typeof markAllReadResponseSchema>
export type NotificationFilter = z.infer<typeof notificationFilterSchema>

export type SendNotificationPayload = z.infer<typeof sendNotificationSchema>
export type BulkNotificationPayload = z.infer<typeof bulkNotificationSchema>
export type SendNotificationResponse = z.infer<
  typeof sendNotificationResponseSchema
>
export type BulkSendResponse = z.infer<typeof bulkSendResponseSchema>

export type NotificationTemplate = z.infer<typeof notificationTemplateSchema>
export type TemplateListResponse = z.infer<typeof templateListResponseSchema>
export type TemplateResponse = z.infer<typeof templateResponseSchema>
export type CreateTemplatePayload = z.infer<typeof createTemplateSchema>
export type UpdateTemplatePayload = z.infer<typeof updateTemplateSchema>

export type PaginationMeta = {
  total: number
  page: number
  limit: number
  unreadCount: number
}
