import type { AnnouncementQueryFilters } from "../types"

export const contentKeys = {
  all: ["content", "announcements"] as const,

  published: (filters?: AnnouncementQueryFilters) =>
    [...contentKeys.all, "published", filters] as const,
  list: (filters?: AnnouncementQueryFilters) =>
    [...contentKeys.all, "list", filters] as const,
  detail: (id: number) => [...contentKeys.all, "detail", id] as const,
} as const
