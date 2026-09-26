import type { QueryClient } from "@tanstack/react-query"
import { courseOfferingQueryOptions } from "@/services/courseOfferingApi"
import { resultsKeys } from "../hooks/query-keys"
import { resultsApi } from "../services/results.service"
import type {
  Paginated,
  ResultScopeSelection,
  ResultSheetFilters,
  ResultSheetSummary,
} from "../types"

// ─── Major-program scoping for the Results workspace (stopgap) ───────────────
//
// GET /results/offerings accepts `majorProgramId`, and the hooks always send
// it. As of 2026-09-26 (GET-probed) the server applies it to the *session's*
// major program instead of the offering's owner: every row reports
// majorProgramId 2, so `majorProgramId=2` returns all 13 offerings and
// `majorProgramId=3|4` returns none. The offering's real owners are on
// GET /courses/offerings (`majorProgramIds`, e.g. BIO → [4]).
//
// So every major-program-scoped read here is verified against that single
// offerings list (one request, shared with useOfferingEnrolmentCounts'
// cache; never one request per row):
//   1. Ask the server with majorProgramId.
//   2. If every returned row belongs to the major program, and the answer
//      isn't "none" while the offerings list says the major program has
//      offerings in that semester, the server's answer is used as is.
//   3. Otherwise re-read the same filters without majorProgramId (every
//      page, ≤100 per request — the server's cap) and keep only the rows
//      whose offering belongs to the major program, paging client-side.
// Once the backend filters by the offering's owner, step 2 always passes and
// this is a no-op. Result lists are per offering, so they're small.
// An offering missing from the offerings list (or a caller who can't read
// it) is kept rather than guessed away: the server stays the authority.

/** The server's hard cap on `limit` for /results/offerings. */
const FULL_LIST_LIMIT = 100
/** Safety stop for the page loop (100 × 50 = 5 000 offerings). */
const MAX_PAGES = 50

interface OfferingOwnerIndex {
  owners: Map<number, number[]>
  semesterOf: Map<number, number>
}

type ListFilters = Omit<ResultSheetFilters, "page" | "limit">

async function loadOfferingOwners(
  qc: QueryClient
): Promise<OfferingOwnerIndex | null> {
  try {
    const res = await qc.fetchQuery({
      ...courseOfferingQueryOptions.list(),
      staleTime: 60 * 1000,
      retry: false,
    })
    const owners = new Map<number, number[]>()
    const semesterOf = new Map<number, number>()
    for (const o of res.data) {
      owners.set(o.id, o.major_program_ids)
      semesterOf.set(o.id, o.semester_id)
    }
    return owners.size ? { owners, semesterOf } : null
  } catch (error) {
    // Not fatal: without the owners list the server's answer is used as is
    // (e.g. a role that can't list every offering).
    if (process.env.NODE_ENV !== "production")
      console.warn("Results scope: offerings list unavailable", error)
    return null
  }
}

function belongsTo(
  index: OfferingOwnerIndex,
  offeringId: number,
  majorProgramId: number
): boolean {
  const owners = index.owners.get(offeringId)
  if (!owners || owners.length === 0) return true
  return owners.includes(majorProgramId)
}

function expectsOfferings(
  index: OfferingOwnerIndex,
  majorProgramId: number,
  semesterId: number | undefined
): boolean {
  for (const [id, owners] of index.owners) {
    if (!owners.includes(majorProgramId)) continue
    if (semesterId == null || index.semesterOf.get(id) === semesterId)
      return true
  }
  return false
}

function serverScopeHolds(
  index: OfferingOwnerIndex,
  rows: ResultSheetSummary[],
  total: number,
  filters: ListFilters & { majorProgramId: number }
): boolean {
  if (rows.some((r) => !belongsTo(index, r.offeringId, filters.majorProgramId)))
    return false
  return !(
    total === 0 &&
    expectsOfferings(index, filters.majorProgramId, filters.semesterId)
  )
}

/** Every page of a filtered list (cached briefly, shared across pages). */
function fetchAllSheets(
  qc: QueryClient,
  filters: ListFilters
): Promise<ResultSheetSummary[]> {
  return qc.fetchQuery({
    queryKey: resultsKeys.sheetsFullList(filters),
    staleTime: 30 * 1000,
    queryFn: async () => {
      const rows: ResultSheetSummary[] = []
      for (let page = 1; page <= MAX_PAGES; page++) {
        const res = await resultsApi.listSheets({
          ...filters,
          page,
          limit: FULL_LIST_LIMIT,
        })
        rows.push(...res.data)
        const totalPages =
          res.meta.totalPages ?? Math.ceil(res.meta.total / FULL_LIST_LIMIT)
        if (page >= totalPages || res.data.length === 0) break
      }
      return rows
    },
  })
}

function withoutMajorProgram(filters: ListFilters): ListFilters {
  return {
    semesterId: filters.semesterId,
    programId: filters.programId,
    departmentId: filters.departmentId,
    status: filters.status,
    flag: filters.flag,
    search: filters.search,
    mine: filters.mine,
  }
}

/** One page of result sheets, narrowed to `filters.majorProgramId`. */
export async function fetchScopedSheetPage(
  qc: QueryClient,
  filters: ResultSheetFilters
): Promise<Paginated<ResultSheetSummary>> {
  const server = await resultsApi.listSheets(filters)
  const majorProgramId = filters.majorProgramId
  if (majorProgramId == null) return server
  const index = await loadOfferingOwners(qc)
  if (
    !index ||
    serverScopeHolds(index, server.data, server.meta.total, {
      ...filters,
      majorProgramId,
    })
  )
    return server

  const rows = (await fetchAllSheets(qc, withoutMajorProgram(filters))).filter(
    (r) => belongsTo(index, r.offeringId, majorProgramId)
  )
  const { page, limit } = filters
  return {
    data: rows.slice((page - 1) * limit, page * limit),
    meta: {
      total: rows.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(rows.length / limit)),
    },
  }
}

/**
 * Every offering id a Moodle pull for `selection` covers — all pages, not
 * just the one on screen. Status/warning/search don't narrow a pull.
 */
export async function fetchScopedOfferingIds(
  qc: QueryClient,
  selection: ResultScopeSelection
): Promise<number[]> {
  const base: ListFilters = {
    semesterId: selection.semesterId,
    departmentId: selection.departmentId,
    programId: selection.programId,
  }
  const withMp = await fetchAllSheets(qc, {
    ...base,
    majorProgramId: selection.majorProgramId,
  })
  const index = await loadOfferingOwners(qc)
  if (
    !index ||
    serverScopeHolds(index, withMp, withMp.length, {
      ...base,
      majorProgramId: selection.majorProgramId,
    })
  )
    return withMp.map((r) => r.offeringId)
  return (await fetchAllSheets(qc, base))
    .filter((r) => belongsTo(index, r.offeringId, selection.majorProgramId))
    .map((r) => r.offeringId)
}
