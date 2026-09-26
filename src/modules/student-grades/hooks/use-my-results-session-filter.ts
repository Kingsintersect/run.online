"use client"

import { useCallback, useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { createApiQueryOptions } from "@/lib/clients/apiClient"
import { useAcademicSessions } from "@/hooks/useAcademicSessions"
import { useMyActiveSession } from "@/hooks/use-my-active-session"
import { useSessionOptions } from "@/hooks/use-session-options"
import { resultsApi } from "../services/results.service"
import { resultsKeys } from "./query-keys"

// Session / semester filter for the student's own published results
// (/student/results). The selection lives in the URL (`?session=<id>` and
// optionally `&semester=<id>`) so other screens — e.g. the Academic History
// page's per-session "View published results" link — can deep-link to one
// session.
//
// Filtering is client-side: neither `GET /results/grades/student/:id` nor
// `GET /students/me/results` documents a session/semester query param
// (bruno/result/Grade - By Student.bru, bruno/student/My Results.bru), and
// one student's published results are a small list. The day a param ships,
// only this hook needs to change.
//
// A published grade names its session (`academicSession: "2026/2027"`) but
// carries no session id, and several major programs run sessions with the
// same name. So each grade's semesterId is resolved to its session through
// `GET /academic/semesters` (every semester carries academicSessionId). If
// that lookup fails, a grade falls back to matching its session name against
// the student's own sessions — only when that name is unambiguous.

export const ALL_FILTER_VALUE = "all"

export interface ResultsFilterItem {
  semesterId: number
  semesterName: string
  /** Session name, when the row carries one (StudentGrade does; terms don't). */
  academicSession?: string
}

export interface ResultsFilterOption {
  value: string
  label: string
}

function parseId(raw: string | null): number | null {
  if (!raw) return null
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

export function useMyResultsSessionFilter(items: readonly ResultsFilterItem[]) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const sessionId = parseId(searchParams.get("session"))
  const semesterId = sessionId ? parseId(searchParams.get("semester")) : null

  const { majorProgramId, isLoading: loadingScope } = useMyActiveSession()
  const sessionsQuery = useAcademicSessions()
  const { labelFor, isLoading: loadingLabels } = useSessionOptions({
    respectScope: false,
  })
  const linksQuery = useQuery({
    ...createApiQueryOptions({
      queryKey: resultsKeys.semesterSessionLinks(),
      queryFn: () => resultsApi.listSemesterSessionLinks(),
    }),
    staleTime: 10 * 60 * 1000,
  })

  // Sessions relevant to this student: their own major program's, plus
  // institution-wide ones (majorProgramId null).
  const mySessions = useMemo(
    () =>
      (sessionsQuery.data ?? []).filter((s) => {
        const mp = s.majorProgramId ?? null
        return mp === null || mp === majorProgramId
      }),
    [sessionsQuery.data, majorProgramId]
  )

  const semesterToSession = useMemo(() => {
    const map = new Map<number, number>()
    for (const sem of linksQuery.data ?? [])
      map.set(sem.id, sem.academicSessionId)
    return map
  }, [linksQuery.data])

  const resolveSession = useCallback(
    (item: ResultsFilterItem): number | null => {
      const direct = semesterToSession.get(item.semesterId)
      if (direct != null) return direct
      if (!item.academicSession) return null
      const byName = mySessions.filter((s) => s.name === item.academicSession)
      return byName.length === 1 ? byName[0].id : null
    },
    [semesterToSession, mySessions]
  )

  const sessionOptions = useMemo<ResultsFilterOption[]>(() => {
    const ids = new Set<number>(mySessions.map((s) => s.id))
    for (const item of items) {
      const id = resolveSession(item)
      if (id != null) ids.add(id)
    }
    // Keep a deep-linked session selectable even when it's outside the
    // student's own list, as long as it's a real session.
    if (sessionId != null && labelFor(sessionId)) ids.add(sessionId)

    const byId = new Map((sessionsQuery.data ?? []).map((s) => [s.id, s]))
    return [...ids]
      .map((id) => ({ id, session: byId.get(id) }))
      .sort((a, b) => {
        const da = a.session?.startDate ?? ""
        const db = b.session?.startDate ?? ""
        return da === db ? b.id - a.id : db.localeCompare(da)
      })
      .map(({ id, session }) => ({
        value: String(id),
        label: labelFor(id) ?? session?.name ?? `Session #${id}`,
      }))
  }, [
    mySessions,
    items,
    resolveSession,
    sessionId,
    labelFor,
    sessionsQuery.data,
  ])

  const semesterOptions = useMemo<ResultsFilterOption[]>(() => {
    if (sessionId == null) return []
    const found = new Map<number, { name: string; start: string }>()
    for (const sem of linksQuery.data ?? [])
      if (sem.academicSessionId === sessionId)
        found.set(sem.id, { name: sem.name, start: sem.startDate ?? "" })
    for (const item of items)
      if (!found.has(item.semesterId) && resolveSession(item) === sessionId)
        found.set(item.semesterId, { name: item.semesterName, start: "" })
    return [...found.entries()]
      .sort(([ia, a], [ib, b]) =>
        a.start === b.start ? ia - ib : a.start.localeCompare(b.start)
      )
      .map(([id, s]) => ({ value: String(id), label: s.name }))
  }, [sessionId, linksQuery.data, items, resolveSession])

  const matches = useCallback(
    (item: ResultsFilterItem): boolean => {
      if (sessionId == null) return true
      if (semesterId != null && item.semesterId !== semesterId) return false
      return resolveSession(item) === sessionId
    },
    [sessionId, semesterId, resolveSession]
  )

  const replaceParams = useCallback(
    (session: string, semester: string | null) => {
      const next = new URLSearchParams(searchParams.toString())
      if (session === ALL_FILTER_VALUE) next.delete("session")
      else next.set("session", session)
      if (!semester || semester === ALL_FILTER_VALUE) next.delete("semester")
      else next.set("semester", semester)
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  const setSession = useCallback(
    (value: string) => replaceParams(value, null),
    [replaceParams]
  )
  const setSemester = useCallback(
    (value: string) =>
      replaceParams(sessionId ? String(sessionId) : ALL_FILTER_VALUE, value),
    [replaceParams, sessionId]
  )
  const clear = useCallback(
    () => replaceParams(ALL_FILTER_VALUE, null),
    [replaceParams]
  )

  const sessionLabel =
    sessionId == null
      ? null
      : (sessionOptions.find((o) => o.value === String(sessionId))?.label ??
        `Session #${sessionId}`)
  const semesterLabel =
    semesterId == null
      ? null
      : (semesterOptions.find((o) => o.value === String(semesterId))?.label ??
        null)

  return {
    sessionValue: sessionId == null ? ALL_FILTER_VALUE : String(sessionId),
    semesterValue: semesterId == null ? ALL_FILTER_VALUE : String(semesterId),
    isFiltered: sessionId != null,
    sessionLabel,
    semesterLabel,
    sessionOptions,
    semesterOptions,
    setSession,
    setSemester,
    clear,
    matches,
    isLoading:
      loadingScope ||
      sessionsQuery.isLoading ||
      loadingLabels ||
      linksQuery.isLoading,
    /** Sessions couldn't be loaded at all — the picker has nothing to offer. */
    isError: sessionsQuery.isError && linksQuery.isError,
  }
}

export type MyResultsSessionFilter = ReturnType<
  typeof useMyResultsSessionFilter
>
