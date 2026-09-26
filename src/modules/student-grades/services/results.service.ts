// ─── Results from Moodle — service ─────────────────────────────────────────
//
// One function per C7 endpoint of the shared contract
// (sandbox/results-moodle/API_CONTRACTS.md). Every response is parsed with
// its Zod schema here, at the boundary, so components only ever see
// contract-shaped data. `{data}` envelope; lists add `meta`.
//
// All C7 routes are live as of 2026-09-25 (bruno/result "Results *"). The
// hooks still wrap calls in `live()`, so a route that is ever missing (a
// rollback, an older deployment) degrades to "not available" instead of
// breaking. One fallback remains: a student's grades also accept the legacy
// row shape, keeping only PUBLISHED rows and mapping them onto StudentGrade.

import { z } from "zod"
import apiClient from "@/lib/clients/apiClient"
import {
  AdjustmentBatchSchema,
  AdjustmentHistorySchema,
  AdjustmentPreviewSchema,
  GradeItemMappingSchema,
  GradePullJobSchema,
  GradingSchemeSchema,
  LegacyStudentGradeRowSchema,
  PaginationMetaSchema,
  PublishPreviewSchema,
  PublishResultSchema,
  PullStartedSchema,
  ResultPolicySchema,
  ResultSheetSchema,
  ResultSheetSummarySchema,
  ResultStatusSchema,
  SemesterSessionLinkSchema,
  SchemeGradeScaleSchema,
  SchemeResolutionSchema,
  StudentGradeSchema,
} from "../schemas"
import { isEndpointMissing } from "../lib/results-errors"
import type {
  AdjustmentBatch,
  AdjustmentCreateBody,
  AdjustmentHistory,
  AdjustmentPreview,
  AdjustmentQueueFilters,
  ApproveSheetBody,
  BatchApproveBody,
  BatchRejectBody,
  GradeItemMapping,
  GradePullJob,
  GradeScaleForm,
  GradingSchemeForm,
  Live,
  MapGradeItemBody,
  Paginated,
  PublishPreview,
  PublishRequest,
  PublishResultSummary,
  PullJobFilters,
  PullRequest,
  PullStarted,
  RejectSheetBody,
  ReopenSheetBody,
  ResultGradingScheme,
  ResultPolicy,
  ResultPolicyForm,
  ResultSheet,
  ResultSheetFilters,
  ResultSheetSummary,
  ResultStatus,
  SemesterSessionLink,
  RevertBody,
  SchemeGradeScale,
  SchemeResolution,
  SingleAdjustBody,
  StudentGrade,
} from "../types"

const AUTH = { access_token: true } as const
type Params = Record<string, string | number | boolean | undefined>

// ─── Envelope helpers ─────────────────────────────────────────────────────────

async function getOne<S extends z.ZodType>(
  url: string,
  schema: S,
  params?: Params
): Promise<z.output<S>> {
  const body = await apiClient.get<{ data: z.input<S> }>(url, {
    ...AUTH,
    params,
  })
  return schema.parse(body.data)
}

async function getPage<S extends z.ZodType>(
  url: string,
  schema: S,
  params?: Params
): Promise<Paginated<z.output<S>>> {
  const body = await apiClient.get<{
    data: z.input<S>[]
    meta: z.input<typeof PaginationMetaSchema>
  }>(url, { ...AUTH, params })
  return {
    data: z.array(schema).parse(body.data),
    meta: PaginationMetaSchema.parse(body.meta),
  }
}

async function send<S extends z.ZodType, B extends object>(
  method: "post" | "patch" | "put",
  url: string,
  schema: S,
  payload?: B
): Promise<z.output<S>> {
  const body = await apiClient[method]<{ data: z.input<S> }, B | undefined>(
    url,
    payload,
    AUTH
  )
  return schema.parse(body.data)
}

async function sendNoContent<B extends object>(
  method: "post" | "patch" | "put" | "delete",
  url: string,
  payload?: B
): Promise<void> {
  if (method === "delete") await apiClient.delete<void>(url, AUTH)
  else await apiClient[method]<void, B | undefined>(url, payload, AUTH)
}

/** Runs a contract call; a not-yet-built route resolves to `available: false`. */
export async function live<T>(call: () => Promise<T>): Promise<Live<T>> {
  try {
    return { available: true, data: await call() }
  } catch (error) {
    if (error instanceof Error && isEndpointMissing(error))
      return { available: false, data: null }
    throw error
  }
}

function sheetParams(f: ResultSheetFilters): Params {
  return {
    semesterId: f.semesterId,
    programId: f.programId,
    departmentId: f.departmentId,
    status: f.status,
    flag: f.flag,
    search: f.search || undefined,
    mine: f.mine ? true : undefined,
    page: f.page,
    limit: f.limit,
  }
}

const R = "/results"

// ─── Service ──────────────────────────────────────────────────────────────────

export const resultsApi = {
  // Moodle pull
  startPull: (body: PullRequest): Promise<PullStarted> =>
    send("post", `${R}/moodle/pull`, PullStartedSchema, body),
  getPullJob: (id: number): Promise<GradePullJob> =>
    getOne(`${R}/moodle/pull-jobs/${id}`, GradePullJobSchema),
  listPullJobs: (f: PullJobFilters): Promise<Paginated<GradePullJob>> =>
    getPage(`${R}/moodle/pull-jobs`, GradePullJobSchema, {
      ...f,
      status: f.status?.join(","),
    }),

  // Offerings / sheets
  listSheets: (f: ResultSheetFilters): Promise<Paginated<ResultSheetSummary>> =>
    getPage(`${R}/offerings`, ResultSheetSummarySchema, sheetParams(f)),
  getSheet: (offeringId: number): Promise<ResultSheet> =>
    getOne(`${R}/offerings/${offeringId}/sheet`, ResultSheetSchema, {
      include: "items",
    }),
  getGradeItems: (offeringId: number): Promise<GradeItemMapping[]> =>
    getOne(
      `${R}/offerings/${offeringId}/grade-items`,
      z.array(GradeItemMappingSchema)
    ),
  mapGradeItem: (
    offeringId: number,
    moodleGradeItemId: number,
    body: MapGradeItemBody
  ): Promise<void> =>
    sendNoContent(
      "patch",
      `${R}/offerings/${offeringId}/grade-items/${moodleGradeItemId}`,
      body
    ),
  submitSheet: (offeringId: number): Promise<void> =>
    sendNoContent("post", `${R}/offerings/${offeringId}/submit`),
  approveSheet: (offeringId: number, body: ApproveSheetBody): Promise<void> =>
    sendNoContent("post", `${R}/offerings/${offeringId}/approve`, body),
  rejectSheet: (offeringId: number, body: RejectSheetBody): Promise<void> =>
    sendNoContent("post", `${R}/offerings/${offeringId}/reject`, body),
  reopenSheet: (offeringId: number, body: ReopenSheetBody): Promise<void> =>
    sendNoContent("post", `${R}/offerings/${offeringId}/reopen`, body),

  // Adjustments
  previewAdjustment: (
    offeringId: number,
    body: AdjustmentCreateBody
  ): Promise<AdjustmentPreview> =>
    send(
      "post",
      `${R}/offerings/${offeringId}/adjustments/preview`,
      AdjustmentPreviewSchema,
      body
    ),
  createAdjustment: (
    offeringId: number,
    body: AdjustmentCreateBody
  ): Promise<AdjustmentBatch> =>
    send(
      "post",
      `${R}/offerings/${offeringId}/adjustments`,
      AdjustmentBatchSchema,
      body
    ),
  // Backend returns { batches, singles } (documented deviation in
  // "Results Adjustments - History.bru").
  listSheetAdjustments: (offeringId: number): Promise<AdjustmentHistory> =>
    getOne(`${R}/offerings/${offeringId}/adjustments`, AdjustmentHistorySchema),
  listAdjustmentQueue: (
    f: AdjustmentQueueFilters
  ): Promise<Paginated<AdjustmentBatch>> =>
    getPage(`${R}/adjustments`, AdjustmentBatchSchema, { ...f }),
  approveBatch: (batchId: number, body: BatchApproveBody): Promise<void> =>
    sendNoContent("post", `${R}/adjustments/${batchId}/approve`, body),
  rejectBatch: (batchId: number, body: BatchRejectBody): Promise<void> =>
    sendNoContent("post", `${R}/adjustments/${batchId}/reject`, body),
  revertBatch: (batchId: number, body: RevertBody): Promise<void> =>
    sendNoContent("post", `${R}/adjustments/${batchId}/revert`, body),
  adjustGrade: (gradeId: number, body: SingleAdjustBody): Promise<void> =>
    sendNoContent("patch", `${R}/grades/${gradeId}/adjust`, body),

  // Publishing
  getPublishPreview: (
    semesterId: number,
    majorProgramId?: number
  ): Promise<PublishPreview> =>
    getOne(`${R}/publish/preview`, PublishPreviewSchema, {
      semesterId,
      majorProgramId,
    }),
  publish: (
    semesterId: number,
    body: PublishRequest
  ): Promise<PublishResultSummary> =>
    send(
      "post",
      `${R}/grades/publish/${semesterId}`,
      PublishResultSchema,
      body
    ),

  // Grading schemes (scoped + validated). The legacy `/grading-schemes`
  // route is deprecated and no longer used here.
  listSchemes: (majorProgramId?: number): Promise<ResultGradingScheme[]> =>
    getOne(`${R}/grading-schemes`, z.array(GradingSchemeSchema), {
      majorProgramId,
    }),
  createScheme: (body: GradingSchemeForm): Promise<ResultGradingScheme> =>
    send("post", `${R}/grading-schemes`, GradingSchemeSchema, body),
  updateScheme: (
    id: number,
    body: GradingSchemeForm
  ): Promise<ResultGradingScheme> => {
    // The owner can't change after creation (not accepted by PATCH).
    const { majorProgramId: _owner, ...patch } = body
    void _owner
    return send(
      "patch",
      `${R}/grading-schemes/${id}`,
      GradingSchemeSchema,
      patch
    )
  },
  deleteScheme: (id: number): Promise<void> =>
    sendNoContent("delete", `${R}/grading-schemes/${id}`),
  createSchemeScale: (
    schemeId: number,
    body: GradeScaleForm
  ): Promise<SchemeGradeScale> =>
    send(
      "post",
      `${R}/grading-schemes/${schemeId}/grade-scales`,
      SchemeGradeScaleSchema,
      body
    ),
  updateSchemeScale: (
    schemeId: number,
    scaleId: number,
    body: GradeScaleForm
  ): Promise<SchemeGradeScale> =>
    send(
      "patch",
      `${R}/grading-schemes/${schemeId}/grade-scales/${scaleId}`,
      SchemeGradeScaleSchema,
      body
    ),
  deleteSchemeScale: (schemeId: number, scaleId: number): Promise<void> =>
    sendNoContent(
      "delete",
      `${R}/grading-schemes/${schemeId}/grade-scales/${scaleId}`
    ),
  resolveScheme: (programId: number): Promise<SchemeResolution> =>
    getOne(`${R}/grading-schemes/resolve`, SchemeResolutionSchema, {
      programId,
    }),
  setProgramScheme: (
    programId: number,
    gradingSchemeId: number | null
  ): Promise<void> =>
    sendNoContent("patch", `${R}/programs/${programId}/grading-scheme`, {
      gradingSchemeId,
    }),

  // Result policies
  getPolicy: (majorProgramId: number): Promise<ResultPolicy> =>
    getOne(`${R}/policies/${majorProgramId}`, ResultPolicySchema),
  updatePolicy: (
    majorProgramId: number,
    body: ResultPolicyForm
  ): Promise<ResultPolicy> =>
    send("put", `${R}/policies/${majorProgramId}`, ResultPolicySchema, body),

  // Student
  getResultStatus: (semesterId: number): Promise<ResultStatus> =>
    getOne(`${R}/students/me/result-status`, ResultStatusSchema, {
      semesterId,
    }),

  // C7: for a STUDENT this returns only PUBLISHED rows in the StudentGrade
  // shape. Until the backend ships that shape, the legacy rows are accepted,
  // filtered to PUBLISHED, and mapped — the status never leaves this function.
  getStudentGrades: async (studentId: number): Promise<StudentGrade[]> => {
    const body = await apiClient.get<{
      data: z.input<typeof StudentGradeSchema>[]
    }>(`${R}/grades/student/${studentId}`, AUTH)
    const contract = z.array(StudentGradeSchema).safeParse(body.data)
    if (contract.success) return contract.data
    return z
      .array(LegacyStudentGradeRowSchema)
      .parse(body.data)
      .filter((row) => row.status === "PUBLISHED")
      .map((row) => ({
        id: row.id,
        courseCode: row.course?.code ?? "—",
        courseTitle: row.course?.title ?? "—",
        creditUnits: row.course?.creditUnits ?? 0,
        semesterId: row.semesterId,
        semesterName: row.semester?.name ?? "—",
        academicSession: row.semester?.academicSession?.name ?? "—",
        caScore: row.caScore,
        examScore: row.examScore,
        totalScore: row.totalScore,
        grade: row.gradeScale?.grade ?? null,
        gradePoint: row.gradePoint,
        publishedAt: null,
      }))
  },

  // GET /academic/semesters with no `academicSessionId` filter returns every
  // semester (bruno/academic/Semesters - List.bru). Used to map a published
  // grade's semesterId to its academic session for the student's session
  // filter — StudentGrade carries the session's name, not its id, and names
  // repeat across major programs.
  listSemesterSessionLinks: async (): Promise<SemesterSessionLink[]> => {
    const body = await apiClient.get<{
      data: z.input<typeof SemesterSessionLinkSchema>[]
    }>("/academic/semesters", AUTH)
    return z.array(SemesterSessionLinkSchema).parse(body.data)
  },
}
