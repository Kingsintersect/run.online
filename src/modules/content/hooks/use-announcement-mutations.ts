"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { contentService } from "../services/content.service"
import { contentKeys } from "./query-keys"
import type { CreateAnnouncementDto, UpdateAnnouncementDto } from "../types"

export function useCreateAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateAnnouncementDto) => contentService.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contentKeys.all })
      toast.success("Announcement created")
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to create announcement"
      )
    },
  })
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateAnnouncementDto }) =>
      contentService.update(id, dto),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: contentKeys.detail(id) })
      qc.invalidateQueries({ queryKey: contentKeys.all })
      toast.success("Announcement updated")
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to update announcement"
      )
    },
  })
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => contentService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contentKeys.all })
      toast.success("Announcement deleted")
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete announcement"
      )
    },
  })
}

export function usePublishAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => contentService.publish(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contentKeys.all })
      toast.success("Announcement published")
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to publish announcement"
      )
    },
  })
}

export function useUnpublishAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => contentService.unpublish(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contentKeys.all })
      toast.success("Announcement unpublished")
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to unpublish announcement"
      )
    },
  })
}
