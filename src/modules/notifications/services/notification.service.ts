import apiClient from "@/lib/clients/apiClient"
import type {
  NotificationListResponse,
  UnreadCountResponse,
  MarkReadResponse,
  MarkAllReadResponse,
  NotificationDetailResponse,
  NotificationFilter,
  SendNotificationPayload,
  BulkNotificationPayload,
  SendNotificationResponse,
  BulkSendResponse,
  TemplateListResponse,
  TemplateResponse,
  CreateTemplatePayload,
  UpdateTemplatePayload,
} from "../types"

const BASE = "/notifications"
const AUTH = { access_token: true } as const

// ── Query key factory ─────────────────────────────────────────────────────────

export const notificationKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationKeys.all, "list"] as const,
  list: (filters: NotificationFilter) =>
    [...notificationKeys.lists(), filters] as const,
  detail: (id: number) => [...notificationKeys.all, "detail", id] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
}

export const templateKeys = {
  all: ["notifications", "templates"] as const,
  lists: () => [...templateKeys.all, "list"] as const,
  detail: (id: number) => [...templateKeys.all, "detail", id] as const,
}

// ── Notifications ("my notifications" + admin send) ───────────────────────────

export const notificationService = {
  listMine: (filters: NotificationFilter = {}) =>
    apiClient.get<NotificationListResponse>(BASE, {
      ...AUTH,
      params: filters as Record<string, unknown>,
    }),

  getUnreadCount: () =>
    apiClient.get<UnreadCountResponse>(`${BASE}/unread-count`, AUTH),

  // GET /notifications/:id — own notification only (403 otherwise). Used by
  // the reading pane to show the full, un-truncated body + delivery metadata.
  getById: (id: number) =>
    apiClient.get<NotificationDetailResponse>(`${BASE}/${id}`, AUTH),

  markRead: (id: number) =>
    apiClient.patch<MarkReadResponse>(`${BASE}/${id}/read`, undefined, AUTH),

  markAllRead: () =>
    apiClient.patch<MarkAllReadResponse>(`${BASE}/read-all`, undefined, AUTH),

  send: (dto: SendNotificationPayload) =>
    apiClient.post<SendNotificationResponse>(BASE, dto, AUTH),

  sendBulk: (dto: BulkNotificationPayload) =>
    apiClient.post<BulkSendResponse>(`${BASE}/bulk`, dto, AUTH),
}

// ── Templates (admin only) ─────────────────────────────────────────────────────

export const templateService = {
  list: () => apiClient.get<TemplateListResponse>(`${BASE}/templates`, AUTH),

  get: (id: number) =>
    apiClient.get<TemplateResponse>(`${BASE}/templates/${id}`, AUTH),

  create: (dto: CreateTemplatePayload) =>
    apiClient.post<TemplateResponse>(`${BASE}/templates`, dto, AUTH),

  update: (id: number, dto: UpdateTemplatePayload) =>
    apiClient.patch<TemplateResponse>(`${BASE}/templates/${id}`, dto, AUTH),

  // Soft deactivate — there is no reactivate endpoint or hard delete.
  deactivate: (id: number) =>
    apiClient.delete<void>(`${BASE}/templates/${id}`, AUTH),
}
