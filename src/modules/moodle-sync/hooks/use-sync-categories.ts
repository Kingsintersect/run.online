"use client"

import { useQuery } from "@tanstack/react-query"
import { deriveCategoryHealth } from "../lib/category-health"
import { moodleSyncService } from "../services/moodle-sync.service"
import type { CategoryHealth } from "../types"
import { moodleSyncKeys } from "./query-keys"

// Major-Program Scoping — sandbox/BACKEND_DEVIATIONS_2026-09-14.md A35.
// `filters.majorProgramId` is a real client-side filter here (see
// moodle-sync.service.ts's listCategories) — passed straight through.
export function useSyncCategories(filters?: { majorProgramId?: number }) {
  return useQuery({
    queryKey: moodleSyncKeys.categories(filters),
    queryFn: () => moodleSyncService.listCategories(filters),
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

export function useCategoriesNeedingMapping(filters?: {
  majorProgramId?: number
}) {
  return useQuery({
    queryKey: moodleSyncKeys.categoriesNeedingMapping(filters),
    queryFn: () => moodleSyncService.getCategoriesNeedingMapping(filters),
    staleTime: 60 * 1000,
  })
}

/**
 * Open category-mapping problems (sandbox/automation §6). `checked` is true
 * when they come from the server's nightly check, false when derived here
 * from the mappings list (which can't see Moodle ID numbers).
 */
export function useCategoryHealth() {
  return useQuery({
    queryKey: moodleSyncKeys.categoryHealth(),
    queryFn: async (): Promise<CategoryHealth & { checked: boolean }> => {
      const live = await moodleSyncService.getCategoryHealth()
      if (live) return { ...live, checked: true }
      const mappings = await moodleSyncService.listCategories()
      return { ...deriveCategoryHealth(mappings), checked: false }
    },
    staleTime: 60 * 1000,
  })
}
