import apiClient from "@/lib/clients/apiClient"
import type {
  ApproveClearanceDto,
  ClearanceQueryFilters,
  ClearanceSummary,
  ClearanceType,
  CreateClearanceTypeDto,
  RejectClearanceDto,
  RequestClearanceDto,
  StudentClearance,
  UpdateClearanceTypeDto,
} from "../types"

// Real backend contract per bruno/clearance/*.bru (the sole source of truth
// for this module — see CLAUDE.md §13).
//
// CORRECTION (2026-09-11): the claim this comment used to make — "every
// endpoint returns FLAT, no envelope" — is wrong, and was live-disproven
// while fixing the "types.map is not a function" crash on
// /admin/configurations/clearance-types. Confirmed live against the
// backend (student token for the first two, SUPER_ADMIN token for the
// third, which needs admin access):
//   - GET /clearance/types              -> {"data": []}                    WRAPPED
//   - GET /clearance/student/:id        -> {"data": []}                    WRAPPED
//   - GET /clearance/student/:id/status -> {studentId, ...}                FLAT (unchanged)
//   - GET /clearance (admin queue)      -> {"data": [], "meta": {...}}     WRAPPED
// The pattern matches every other module in this codebase: LIST endpoints
// are `{data: [...]}`-wrapped, single-record status/action responses are
// flat.
const BASE = "/clearance"
const AUTH = { access_token: true } as const

export const clearanceService = {
  // ── Clearance Types ──────────────────────
  async listTypes(): Promise<ClearanceType[]> {
    const res = await apiClient.get<{ data: ClearanceType[] }>(
      `${BASE}/types`,
      AUTH
    )
    return res.data
  },

  createType: (payload: CreateClearanceTypeDto): Promise<ClearanceType> =>
    apiClient.post<ClearanceType>(`${BASE}/types`, payload, AUTH),

  updateType: (
    id: number,
    payload: UpdateClearanceTypeDto
  ): Promise<ClearanceType> =>
    apiClient.patch<ClearanceType>(`${BASE}/types/${id}`, payload, AUTH),

  // Soft "deactivate" (isActive: false), not a hard delete — per
  // clearance_README.md and ClearanceType - Delete.bru.
  deactivateType: (id: number): Promise<ClearanceType> =>
    apiClient.delete<ClearanceType>(`${BASE}/types/${id}`, AUTH),

  // ── Student Clearances ───────────────────
  // Confirmed live wrapped with a SUPER_ADMIN token — see this file's
  // header comment. `meta` (page/limit/total) is returned too but dropped
  // here since the only current consumer just needs the list.
  //
  // Major-Program Scoping — sandbox/BACKEND_DEVIATIONS_2026-09-14.md A35.
  // GET /clearance has no majorProgramId support server-side (confirmed
  // unscoped, ENDPOINT_INVENTORY.md item 15). `majorProgramId` sent
  // regardless; the frontend also filters client-side in
  // clearance-review-queue.tsx (via use-student-major-program-map.ts) so
  // results are correct either way.
  async list(filters: ClearanceQueryFilters = {}): Promise<StudentClearance[]> {
    const res = await apiClient.get<{ data: StudentClearance[] }>(BASE, {
      ...AUTH,
      params: filters as Record<string, unknown>,
    })
    return res.data
  },

  getById: (id: number): Promise<StudentClearance> =>
    apiClient.get<StudentClearance>(`${BASE}/${id}`, AUTH),

  // Admin, Self only — Staff gets 403 here (unlike getById above). Confirmed
  // live wrapped — see this file's header comment.
  async listByStudent(studentId: number): Promise<StudentClearance[]> {
    const res = await apiClient.get<{ data: StudentClearance[] }>(
      `${BASE}/student/${studentId}`,
      AUTH
    )
    return res.data
  },

  // Admin, Self only — same auth gate as listByStudent.
  getSummary: (studentId: number): Promise<ClearanceSummary> =>
    apiClient.get<ClearanceSummary>(
      `${BASE}/student/${studentId}/status`,
      AUTH
    ),

  request: (payload: RequestClearanceDto): Promise<StudentClearance> =>
    apiClient.post<StudentClearance>(BASE, payload, AUTH),

  requestAll: (studentId: number): Promise<StudentClearance[]> =>
    apiClient.post<StudentClearance[]>(
      `${BASE}/student/${studentId}/request-all`,
      undefined,
      AUTH
    ),

  // "Approver, Admin" — no dedicated approver role exists yet; the backend
  // currently gates this on Admin or Staff (Clearance - Approve.bru).
  approve: (
    id: number,
    payload: ApproveClearanceDto
  ): Promise<StudentClearance> =>
    apiClient.patch<StudentClearance>(`${BASE}/${id}/approve`, payload, AUTH),

  reject: (
    id: number,
    payload: RejectClearanceDto
  ): Promise<StudentClearance> =>
    apiClient.patch<StudentClearance>(`${BASE}/${id}/reject`, payload, AUTH),
}
