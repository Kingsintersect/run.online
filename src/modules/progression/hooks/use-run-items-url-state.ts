"use client"

import { useCallback, useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { StandingOutcomeSchema } from "../schemas"
import type { RunItemFilters } from "../types"

// Run workspace table state (filters, search, page) lives in the URL so a
// filtered view can be shared, reloaded and navigated with Back/Forward. It
// is UI state only — the items themselves stay in the React Query cache and
// are always filtered/paginated server-side (30,000-row runs).
//
// Uses useSearchParams, so render consumers inside <Suspense>.

export const RUN_ITEMS_PER_PAGE_OPTIONS = [25, 50, 100] as const
const DEFAULT_PER_PAGE = 50

function positiveInt(raw: string | null): number | undefined {
  if (!raw) return undefined
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : undefined
}

function bool(raw: string | null): boolean | undefined {
  if (raw === "true") return true
  if (raw === "false") return false
  return undefined
}

/** Filter keys a summary card / filter control can change (not paging). */
export type RunItemFilterPatch = Partial<
  Omit<RunItemFilters, "page" | "per_page">
>

export function useRunItemsUrlState() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const filters = useMemo<RunItemFilters>(() => {
    const outcome = StandingOutcomeSchema.safeParse(params.get("outcome"))
    const perPage = positiveInt(params.get("per_page"))
    return {
      outcome: outcome.success ? outcome.data : undefined,
      program_id: positiveInt(params.get("program_id")),
      level_id: positiveInt(params.get("level_id")),
      has_exception: bool(params.get("has_exception")),
      is_overridden: bool(params.get("is_overridden")),
      search: params.get("search")?.trim() || undefined,
      page: positiveInt(params.get("page")) ?? 1,
      per_page:
        perPage &&
        (RUN_ITEMS_PER_PAGE_OPTIONS as readonly number[]).includes(perPage)
          ? perPage
          : DEFAULT_PER_PAGE,
    }
  }, [params])

  const write = useCallback(
    (next: RunItemFilters) => {
      const sp = new URLSearchParams()
      const entries: [string, string | number | boolean | undefined][] = [
        ["outcome", next.outcome],
        ["program_id", next.program_id],
        ["level_id", next.level_id],
        ["has_exception", next.has_exception],
        ["is_overridden", next.is_overridden],
        ["search", next.search],
        ["page", next.page && next.page > 1 ? next.page : undefined],
        [
          "per_page",
          next.per_page && next.per_page !== DEFAULT_PER_PAGE
            ? next.per_page
            : undefined,
        ],
      ]
      for (const [k, v] of entries)
        if (v !== undefined && v !== "") sp.set(k, String(v))
      const qs = sp.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname]
  )

  /** Change filters; any filter change returns to page 1. */
  const setFilters = useCallback(
    (patch: RunItemFilterPatch) => write({ ...filters, ...patch, page: 1 }),
    [filters, write]
  )

  /** Replace every filter at once (summary cards), keeping the page size. */
  const replaceFilters = useCallback(
    (next: RunItemFilterPatch) =>
      write({ ...next, page: 1, per_page: filters.per_page }),
    [filters.per_page, write]
  )

  const setPage = useCallback(
    (page: number) => write({ ...filters, page }),
    [filters, write]
  )

  const setPerPage = useCallback(
    (perPage: number) => write({ ...filters, per_page: perPage, page: 1 }),
    [filters, write]
  )

  const clear = useCallback(
    () => write({ page: 1, per_page: filters.per_page }),
    [filters.per_page, write]
  )

  const hasActiveFilters =
    filters.outcome !== undefined ||
    filters.program_id !== undefined ||
    filters.level_id !== undefined ||
    filters.has_exception !== undefined ||
    filters.is_overridden !== undefined ||
    filters.search !== undefined

  return {
    filters,
    setFilters,
    replaceFilters,
    setPage,
    setPerPage,
    clear,
    hasActiveFilters,
  }
}
