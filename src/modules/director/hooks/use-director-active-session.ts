"use client"

import { useMemo } from "react"
import { useAcademicSessions } from "@/hooks/useAcademicSessions"
import { resolveActiveSession } from "@/lib/academic/resolve-active-session"
import type { AcademicSession } from "@/types/school"

/**
 * The active session's name for the Director's university-wide header, from
 * the real `GET /academic/sessions` list (replaces a hardcoded "2024/2025").
 * Prefers the institution-wide active session; failing that, uses the name
 * every active major-program session shares. `null` while loading, on error,
 * or when there's no single answer — the caller then drops the year.
 */
export function useDirectorActiveSessionName(): string | null {
  return useDirectorSessionOptions().activeName
}

function activeNameOf(sessions: AcademicSession[] | undefined): string | null {
  const shared = resolveActiveSession(sessions, null)
  if (shared) return shared.name
  const names = new Set(
    (sessions ?? []).filter((s) => s.isActive).map((s) => s.name)
  )
  return names.size === 1 ? [...names][0] : null
}

export interface DirectorSessionOptions {
  /** Distinct session names, newest first (by start date). */
  names: string[]
  /** See useDirectorActiveSessionName. */
  activeName: string | null
  isLoading: boolean
  /** The sessions list was refused or failed — no options to offer. */
  isError: boolean
}

/**
 * The Director filter bar's academic-year options, from the real
 * `GET /academic/sessions` list (replaces a hardcoded 2020/2021–2024/2025
 * list). Major-program-scoped sessions often share a name, so names are
 * de-duplicated. On error there are no options; the bar then offers only
 * "All sessions" and says why.
 */
export function useDirectorSessionOptions(): DirectorSessionOptions {
  const { data: sessions, isLoading, isError } = useAcademicSessions()
  return useMemo(() => {
    const byName = new Map<string, string>()
    for (const s of sessions ?? []) {
      const prev = byName.get(s.name)
      if (prev == null || s.startDate > prev) byName.set(s.name, s.startDate)
    }
    const names = [...byName.entries()]
      .sort((a, b) => b[1].localeCompare(a[1]) || b[0].localeCompare(a[0]))
      .map(([name]) => name)
    return {
      names,
      activeName: activeNameOf(sessions),
      isLoading,
      isError,
    }
  }, [sessions, isLoading, isError])
}
