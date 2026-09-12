"use client"

import { useQuery } from "@tanstack/react-query"
import { moodleSyncService } from "../services/moodle-sync.service"
import { moodleSyncKeys } from "./query-keys"

export function useSyncCategories() {
  return useQuery({
    queryKey: moodleSyncKeys.categories(),
    queryFn: moodleSyncService.listCategories,
    staleTime: 60 * 1000,
  })
}

export function useSyncCategory(id: number) {
  return useQuery({
    queryKey: moodleSyncKeys.category(id),
    queryFn: () => moodleSyncService.getCategory(id),
    enabled: !!id,
  })
}

export function useCategoriesNeedingMapping() {
  return useQuery({
    queryKey: moodleSyncKeys.categoriesNeedingMapping(),
    queryFn: moodleSyncService.getCategoriesNeedingMapping,
    staleTime: 60 * 1000,
  })
}
