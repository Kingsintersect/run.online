// ──────────────────────────────────────────────
// Content (Announcements) Domain Types
// Mirrors the Laravel `AnnouncementController::serialize()` response shape —
// note `isPublished` is always present there, even though content_README.md's
// documented GET response omits it.
// ──────────────────────────────────────────────

export type Priority = "low" | "normal" | "high" | "urgent"

// Categories are free-text strings server-side (max 30 chars), not an enum.
// "news" | "event" | "academic" | "general" are just the common values
// surfaced as suggestions in the create/edit form.
export type Category = string

export interface Announcement {
  id: number
  title: string
  content: string
  category: string
  priority: Priority
  publishedBy: number
  isPublished: boolean
  publishedAt: string | null
  expiresAt: string | null
  createdAt: string
}

export interface CreateAnnouncementDto {
  title: string
  content: string
  category: string
  priority?: Priority
  expiresAt?: string
  isPublished?: boolean
}

// All fields optional server-side. Note: the backend cannot currently clear
// `expiresAt` back to null once set (an explicit null is dropped the same as
// an absent field) — don't build a "clear expiry" affordance around this DTO.
export interface UpdateAnnouncementDto {
  title?: string
  content?: string
  category?: string
  priority?: Priority
  expiresAt?: string
}

export interface AnnouncementQueryFilters {
  category?: string
  priority?: Priority
  page?: number
  limit?: number
}

export interface PublishResponse {
  id: number
  isPublished: true
  publishedAt: string
}
