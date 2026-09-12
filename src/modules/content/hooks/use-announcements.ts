"use client"

import { useQuery } from "@tanstack/react-query"
import { contentService } from "../services/content.service"
import { contentKeys } from "./query-keys"
import type { AnnouncementQueryFilters } from "../types"

export function usePublishedAnnouncements(filters?: AnnouncementQueryFilters) {
  return useQuery({
    queryKey: contentKeys.published(filters),
    queryFn: () => contentService.listPublished(filters),
  })
}

export function useAllAnnouncements(filters?: AnnouncementQueryFilters) {
  return useQuery({
    queryKey: contentKeys.list(filters),
    queryFn: () => contentService.listAll(filters),
  })
}

export function useAnnouncement(id: number) {
  return useQuery({
    queryKey: contentKeys.detail(id),
    queryFn: () => contentService.get(id),
    enabled: id > 0,
  })
}
