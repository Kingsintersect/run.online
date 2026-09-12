"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { templateService, templateKeys } from "../services/notification.service"
import type { CreateTemplatePayload, UpdateTemplatePayload } from "../types"

export function useCreateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreateTemplatePayload) => templateService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() })
      toast.success("Template created")
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to create template"
      )
    },
  })
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateTemplatePayload }) =>
      templateService.update(id, dto),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() })
      toast.success("Template updated")
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to update template"
      )
    },
  })
}

export function useDeactivateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => templateService.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() })
      toast.success("Template deactivated")
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to deactivate template"
      )
    },
  })
}
