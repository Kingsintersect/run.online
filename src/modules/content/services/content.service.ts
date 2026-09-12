import apiClient from "@/lib/clients/apiClient"
import type {
  Announcement,
  AnnouncementQueryFilters,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  PublishResponse,
} from "../types"

const BASE = "/content/announcements"
const AUTH = { access_token: true } as const

interface ListResponse {
  data: Announcement[]
  meta: { total: number; page: number; limit: number }
}

export const contentService = {
  // Public — published, non-expired announcements only.
  listPublished: (filters?: AnnouncementQueryFilters) =>
    apiClient.get<ListResponse>(BASE, {
      params: filters as Record<string, unknown>,
    }),

  // Admin/staff — includes drafts. Requires auth.
  listAll: (filters?: AnnouncementQueryFilters) =>
    apiClient.get<ListResponse>(`${BASE}/all`, {
      ...AUTH,
      params: filters as Record<string, unknown>,
    }),

  get: (id: number) =>
    apiClient.get<{ data: Announcement }>(`${BASE}/${id}`, AUTH),

  // Response is a FLAT Announcement, not wrapped in `data` — unlike every
  // other mutation endpoint here. Confirmed via bruno/content/Announcements
  // - Create.bru's docs block.
  create: (dto: CreateAnnouncementDto) =>
    apiClient.post<Announcement>(BASE, dto, AUTH),

  update: (id: number, dto: UpdateAnnouncementDto) =>
    apiClient.patch<{ data: Announcement }>(`${BASE}/${id}`, dto, AUTH),

  // Response is flat `{ id, isPublished, publishedAt }`, not a full
  // Announcement and not wrapped in `data`.
  publish: (id: number) =>
    apiClient.patch<PublishResponse>(`${BASE}/${id}/publish`, undefined, AUTH),

  unpublish: (id: number) =>
    apiClient.patch<{ data: Announcement }>(
      `${BASE}/${id}/unpublish`,
      undefined,
      AUTH
    ),

  remove: (id: number) => apiClient.delete<void>(`${BASE}/${id}`, AUTH),
}
