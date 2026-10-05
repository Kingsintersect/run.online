"use client"

import { useMemo } from "react"
import { useAcademicSessions } from "@/hooks/useAcademicSessions"
import { resolveActiveSession } from "@/lib/academic/resolve-active-session"

/**
 * The active session's name for the Director's university-wide header, from
 * the real `GET /academic/sessions` list (replaces a hardcoded "2024/2025").
 * Prefers the institution-wide active session; failing that, uses the name
 * every active major-program session shares. `null` while loading, on error,
 * or when there's no single answer — the caller then drops the year.
 */
export function useDirectorActiveSessionName(): string | null {
  const { data: sessions } = useAcademicSessions()
  return useMemo(() => {
    const shared = resolveActiveSession(sessions, null)
    if (shared) return shared.name
    const names = new Set(
      (sessions ?? []).filter((s) => s.isActive).map((s) => s.name)
    )
    return names.size === 1 ? [...names][0] : null
  }, [sessions])
}
