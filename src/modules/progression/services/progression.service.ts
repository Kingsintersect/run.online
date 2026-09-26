// ─── Session promotion & standings — service ───────────────────────────────
//
// One function per endpoint of the shared contract
// (sandbox/accademic-session-semester-migration/session-promotion-frontend-prompt.md,
// "## Shared API contract"). Every payload is validated with its Zod schema
// before dispatch and every response is parsed at this boundary, so callers
// only ever see contract-shaped data. `{data}` envelope; lists add `meta`.
//
// Errors are thrown as ApiClientError. The hooks wrap calls in `live()` so a
// route that doesn't exist yet degrades to `{available: false}`.
//
// Probe 2026-09-25 (GET-only, production): every progression route is missing
// except activate, which is live as PATCH /academic/semesters/{id}/activate
// and PATCH /academic/sessions/{id}/activate — used as fallbacks below.

import { z } from "zod"
import apiClient from "@/lib/clients/apiClient"
import {
  BulkOverridePayloadSchema,
  CommitRunPayloadSchema,
  CreatePromotionRunPayloadSchema,
  DebtOverridePayloadSchema,
  OutstandingCourseSchema,
  OverrideRunItemPayloadSchema,
  PaginationMetaSchema,
  PromotionPolicyPayloadSchema,
  PromotionPolicySchema,
  PromotionRunFiltersSchema,
  PromotionRunItemSchema,
  PromotionRunSchema,
  ReadinessSchema,
  ReversePayloadSchema,
  RunItemFiltersSchema,
  SessionStandingSchema,
} from "../schemas"
import { isEndpointMissing, isRecordNotFound } from "../lib/errors"
import { snakeKeys, type Json } from "../lib/case"
import type {
  BulkOverridePayload,
  CommitRunPayload,
  CreatePromotionRunPayload,
  DebtOverridePayload,
  OutstandingCourse,
  OverrideRunItemPayload,
  Paginated,
  PromotionPolicy,
  PromotionPolicyPayload,
  PromotionRun,
  PromotionRunFilters,
  PromotionRunItem,
  Readiness,
  ReversePayload,
  RunItemFilters,
  SessionStanding,
} from "../types"

const AUTH = { access_token: true } as const
type Params = Record<string, string | number | undefined>

// ─── Envelope helpers ─────────────────────────────────────────────────────────
// Every response body goes through `snakeKeys()` before parsing: the contract
// is snake_case but this API's live resources are camelCase (lib/case.ts).

type Envelope = { data?: Json; meta?: Json } | null

async function getBody(url: string, params?: Params): Promise<Envelope> {
  return apiClient.get<Envelope>(url, { ...AUTH, params })
}

// Most resources are wrapped in `{data}`, but some live routes (the readiness
// checklists) return the object bare, so a body without `data` is used as-is.
function dataOf(body: Envelope): Json {
  if (body == null) return null
  return snakeKeys("data" in body ? (body.data ?? null) : (body as Json))
}

async function getOne<S extends z.ZodType>(
  url: string,
  schema: S,
  params?: Params
): Promise<z.output<S>> {
  return schema.parse(dataOf(await getBody(url, params)))
}

async function getPage<S extends z.ZodType>(
  url: string,
  schema: S,
  params?: Params
): Promise<Paginated<z.output<S>>> {
  const body = await getBody(url, params)
  return {
    data: z.array(schema).parse(dataOf(body)),
    meta: PaginationMetaSchema.parse(snakeKeys(body?.meta ?? null)),
  }
}

// Small per-student lists (a timeline, carryovers): the whole list is read in
// one call. A paginated envelope is accepted too — its first page is used
// with a large `per_page`, which covers any realistic student history.
async function getList<S extends z.ZodType>(
  url: string,
  schema: S
): Promise<z.output<S>[]> {
  const body = await getBody(url, { per_page: 100 })
  return z.array(schema).parse(dataOf(body))
}

type Method = "post" | "patch" | "put" | "delete"

async function sendRaw<B extends object>(
  method: Method,
  url: string,
  payload?: B
): Promise<Envelope> {
  if (method === "delete") return apiClient.delete<Envelope>(url, AUTH)
  return apiClient[method]<Envelope, B | undefined>(url, payload, AUTH)
}

async function send<S extends z.ZodType, B extends object>(
  method: Method,
  url: string,
  schema: S,
  payload?: B
): Promise<z.output<S>> {
  return schema.parse(dataOf(await sendRaw(method, url, payload)))
}

// The contract doesn't fix the response body of these actions; use the
// returned resource when it parses, else `null` (callers refetch anyway).
async function sendMaybe<S extends z.ZodType, B extends object>(
  method: Method,
  url: string,
  schema: S,
  payload?: B
): Promise<z.output<S> | null> {
  const parsed = schema.safeParse(dataOf(await sendRaw(method, url, payload)))
  return parsed.success ? parsed.data : null
}

// Prefer the contract route; while it doesn't exist (route 404 / 405), use
// the equivalent live legacy route. One interface — the day the contract
// route ships, it's used with no caller change.
async function withLegacyFallback(
  contractCall: () => Promise<Envelope>,
  legacyCall: () => Promise<Envelope>
): Promise<void> {
  try {
    await contractCall()
  } catch (error) {
    if (error instanceof Error && isEndpointMissing(error)) {
      await legacyCall()
      return
    }
    throw error
  }
}

function runItemParams(filters: RunItemFilters): Params {
  const f = RunItemFiltersSchema.parse(filters)
  const flag = (b: boolean | undefined) =>
    b === undefined ? undefined : b ? 1 : 0
  return {
    outcome: f.outcome,
    program_id: f.program_id,
    level_id: f.level_id,
    // Laravel's `boolean` rule rejects the query-string literal "true".
    has_exception: flag(f.has_exception),
    is_overridden: flag(f.is_overridden),
    search: f.search ? f.search : undefined,
    page: f.page,
    per_page: f.per_page,
  }
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const progressionApi = {
  // Policy ─────────────────────────────────────────────────────────────────
  /** `null` when no policy has been saved yet for this major program (404). */
  async getPolicy(majorProgramId: number): Promise<PromotionPolicy | null> {
    try {
      return await getOne(
        `/promotion-policies/${majorProgramId}`,
        PromotionPolicySchema
      )
    } catch (error) {
      if (error instanceof Error && isRecordNotFound(error)) return null
      throw error
    }
  },

  updatePolicy(
    majorProgramId: number,
    payload: PromotionPolicyPayload
  ): Promise<PromotionPolicy | null> {
    return sendMaybe(
      "put",
      `/promotion-policies/${majorProgramId}`,
      PromotionPolicySchema,
      PromotionPolicyPayloadSchema.parse(payload)
    )
  },

  // Semester rollover ──────────────────────────────────────────────────────
  getSemesterRolloverReadiness(semesterId: number): Promise<Readiness> {
    return getOne(
      `/semesters/${semesterId}/rollover-readiness`,
      ReadinessSchema
    )
  },

  async lockSemester(semesterId: number): Promise<void> {
    await sendRaw("post", `/semesters/${semesterId}/lock`)
  },

  /**
   * Contract: POST /semesters/{id}/activate. Falls back to the live
   * PATCH /academic/semesters/{id}/activate while the contract route is missing.
   */
  activateSemester(semesterId: number): Promise<void> {
    return withLegacyFallback(
      () => sendRaw("post", `/semesters/${semesterId}/activate`),
      () => sendRaw("patch", `/academic/semesters/${semesterId}/activate`)
    )
  },

  // Session close ──────────────────────────────────────────────────────────
  getSessionCloseReadiness(
    sessionId: number,
    targetSessionId: number
  ): Promise<Readiness> {
    return getOne(
      `/academic-sessions/${sessionId}/close-readiness`,
      ReadinessSchema,
      { target_session_id: targetSessionId }
    )
  },

  async lockSession(sessionId: number): Promise<void> {
    await sendRaw("post", `/academic-sessions/${sessionId}/lock`)
  },

  /**
   * Contract: POST /academic-sessions/{id}/activate. Falls back to the live
   * PATCH /academic/sessions/{id}/activate while the contract route is missing.
   */
  activateSession(sessionId: number): Promise<void> {
    return withLegacyFallback(
      () => sendRaw("post", `/academic-sessions/${sessionId}/activate`),
      () => sendRaw("patch", `/academic/sessions/${sessionId}/activate`)
    )
  },

  // Promotion runs ─────────────────────────────────────────────────────────
  /** 422 READINESS_FAILED carries the readiness payload — see readinessFromError(). */
  createRun(payload: CreatePromotionRunPayload): Promise<PromotionRun> {
    return send(
      "post",
      "/promotion-runs",
      PromotionRunSchema,
      CreatePromotionRunPayloadSchema.parse(payload)
    )
  },

  listRuns(filters: PromotionRunFilters): Promise<Paginated<PromotionRun>> {
    const f = PromotionRunFiltersSchema.parse(filters)
    return getPage("/promotion-runs", PromotionRunSchema, {
      major_program_id: f.major_program_id,
      status: f.status,
      page: f.page,
      per_page: f.per_page,
    })
  },

  getRun(runId: number): Promise<PromotionRun> {
    return getOne(`/promotion-runs/${runId}`, PromotionRunSchema)
  },

  listRunItems(
    runId: number,
    filters: RunItemFilters
  ): Promise<Paginated<PromotionRunItem>> {
    return getPage(
      `/promotion-runs/${runId}/items`,
      PromotionRunItemSchema,
      runItemParams(filters)
    )
  },

  overrideRunItem(
    runId: number,
    itemId: number,
    payload: OverrideRunItemPayload
  ): Promise<PromotionRunItem | null> {
    return sendMaybe(
      "patch",
      `/promotion-runs/${runId}/items/${itemId}`,
      PromotionRunItemSchema,
      OverrideRunItemPayloadSchema.parse(payload)
    )
  },

  async bulkOverride(
    runId: number,
    payload: BulkOverridePayload
  ): Promise<void> {
    await sendRaw(
      "post",
      `/promotion-runs/${runId}/items/bulk-override`,
      BulkOverridePayloadSchema.parse(payload)
    )
  },

  refreshRun(runId: number): Promise<PromotionRun | null> {
    return sendMaybe(
      "post",
      `/promotion-runs/${runId}/refresh`,
      PromotionRunSchema
    )
  },

  commitRun(
    runId: number,
    payload: CommitRunPayload
  ): Promise<PromotionRun | null> {
    return sendMaybe(
      "post",
      `/promotion-runs/${runId}/commit`,
      PromotionRunSchema,
      CommitRunPayloadSchema.parse(payload)
    )
  },

  reverseRun(
    runId: number,
    payload: ReversePayload
  ): Promise<PromotionRun | null> {
    return sendMaybe(
      "post",
      `/promotion-runs/${runId}/reverse`,
      PromotionRunSchema,
      ReversePayloadSchema.parse(payload)
    )
  },

  discardRun(runId: number): Promise<PromotionRun | null> {
    return sendMaybe(
      "post",
      `/promotion-runs/${runId}/discard`,
      PromotionRunSchema
    )
  },

  // Standings ──────────────────────────────────────────────────────────────
  /** Newest first, as the backend orders it. */
  listStudentStandings(studentId: number): Promise<SessionStanding[]> {
    return getList(
      `/students/${studentId}/session-standings`,
      SessionStandingSchema
    )
  },

  addDebtOverride(
    standingId: number,
    payload: DebtOverridePayload
  ): Promise<SessionStanding | null> {
    return sendMaybe(
      "post",
      `/session-standings/${standingId}/debt-override`,
      SessionStandingSchema,
      DebtOverridePayloadSchema.parse(payload)
    )
  },

  async removeDebtOverride(standingId: number): Promise<void> {
    await sendRaw("delete", `/session-standings/${standingId}/debt-override`)
  },

  listStudentOutstandingCourses(
    studentId: number
  ): Promise<OutstandingCourse[]> {
    return getList(
      `/students/${studentId}/outstanding-courses`,
      OutstandingCourseSchema
    )
  },

  // Student self-service (own records only) ─────────────────────────────────
  listMyStandings(): Promise<SessionStanding[]> {
    return getList("/me/session-standings", SessionStandingSchema)
  },

  listMyOutstandingCourses(): Promise<OutstandingCourse[]> {
    return getList("/me/outstanding-courses", OutstandingCourseSchema)
  },
}
