"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  notificationService,
  notificationKeys,
} from "../services/notification.service"
import type { SendNotificationPayload, BulkNotificationPayload } from "../types"

export function useMarkRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => notificationService.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
      queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(),
      })
    },
  })
}

export function useMarkAllRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
      queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(),
      })
    },
  })
}

export function useSendNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: SendNotificationPayload) => notificationService.send(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to send notification"
      )
    },
  })
}

export function useSendBulkNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: BulkNotificationPayload) =>
      notificationService.sendBulk(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to send bulk notification"
      )
    },
  })
}
