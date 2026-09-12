"use client"

import { useQuery } from "@tanstack/react-query"
import {
  notificationService,
  templateService,
  notificationKeys,
  templateKeys,
} from "../services/notification.service"
import type { NotificationFilter } from "../types"

export function useNotifications(filters: NotificationFilter = {}) {
  return useQuery({
    queryKey: notificationKeys.list(filters),
    queryFn: () => notificationService.listMine(filters),
    staleTime: 1000 * 60 * 2,
  })
}

export function useNotification(id: number | null) {
  return useQuery({
    queryKey: notificationKeys.detail(id ?? 0),
    queryFn: () => notificationService.getById(id as number),
    enabled: id !== null && id > 0,
    staleTime: 1000 * 30,
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationService.getUnreadCount(),
    staleTime: 1000 * 30,
    refetchInterval: 60 * 1000,
  })
}

export function useNotificationTemplates() {
  return useQuery({
    queryKey: templateKeys.lists(),
    queryFn: () => templateService.list(),
    staleTime: 1000 * 60 * 5,
  })
}

export function useNotificationTemplate(id: number) {
  return useQuery({
    queryKey: templateKeys.detail(id),
    queryFn: () => templateService.get(id),
    enabled: id > 0,
  })
}
