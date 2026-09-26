import apiClient from "@/lib/clients/apiClient"
import type {
  CreateFeeTypeDto,
  FeeTypeResponse,
  ActivateFeeTypeResponse,
  GenerationStatusResponse,
  EligibleCountResponse,
  FeeCategory,
  StudentType,
  InvoiceResponse,
  ResolveInvoicesResponse,
  CollectionsSummaryResponse,
  OutstandingReportResponse,
  InitiatePaymentDto,
  InitiatePaymentResponse,
  VerifyPaymentResponse,
  PaymentHistoryResponse,
  PaymentDetailResponse,
  WaiveInvoiceDto,
} from "../types"
import { WaiveInvoiceDtoSchema } from "../schemas/invoice.schema"

// Real backend contract per bruno/fee/*.bru (the sole source of truth for
// this module — see CLAUDE.md §13). Every route lives under /fees; response
// envelopes match what each .bru file documents, unwrapped here so callers
// keep receiving the plain shape they already expect.
const BASE = "/fees"
const AUTH = { access_token: true } as const

export const feeManagementService = {
  // ── Fee Types ────────────────────────────────────────────────────────────────

  listFeeTypes: async (filters?: {
    sessionId?: number
    // Major-Program Scoping — sandbox/major-program-scoping/API_CONTRACTS.md
    // §8 (A12, not yet built). Sent regardless; the frontend also filters
    // client-side in fee-type-table.tsx so results are correct either way.
    majorProgramId?: number
    category?: string
    isActive?: boolean
  }) => {
    const res = await apiClient.get<{ data: FeeTypeResponse[] }>(
      `${BASE}/types`,
      {
        ...AUTH,
        params: filters as Record<string, unknown>,
      }
    )
    return res.data
  },

  getFeeType: async (id: number) => {
    const res = await apiClient.get<{ data: FeeTypeResponse }>(
      `${BASE}/types/${id}`,
      AUTH
    )
    return res.data
  },

  createFeeType: async (dto: CreateFeeTypeDto) => {
    const res = await apiClient.post<{ data: FeeTypeResponse }>(
      `${BASE}/types`,
      dto,
      AUTH
    )
    return res.data
  },

  updateFeeType: async (id: number, dto: Partial<CreateFeeTypeDto>) => {
    const res = await apiClient.patch<{ data: FeeTypeResponse }>(
      `${BASE}/types/${id}`,
      dto,
      AUTH
    )
    return res.data
  },

  // Runs synchronously in this environment (no queue worker) — the response
  // already reflects finished generation by the time it arrives.
  activateFeeType: (id: number) =>
    apiClient.post<ActivateFeeTypeResponse>(
      `${BASE}/types/${id}/activate`,
      undefined,
      AUTH
    ),

  deactivateFeeType: (id: number) =>
    apiClient.post<void>(`${BASE}/types/${id}/deactivate`, undefined, AUTH),

  deleteFeeType: (id: number) =>
    apiClient.delete<void>(`${BASE}/types/${id}`, AUTH),

  getGenerationStatus: (id: number) =>
    apiClient.get<GenerationStatusResponse>(
      `${BASE}/types/${id}/generation-status`,
      AUTH
    ),

  // Preview: estimated eligible student count for a given scope configuration.
  // No bruno/fee file confirms this endpoint — left path-corrected and
  // best-effort (retry:false in useEligibleCount) so it degrades gracefully
  // either way.
  getEligibleCount: (filters: {
    category: FeeCategory
    sessionId?: number
    // A12 (pending) — see listFeeTypes' note above.
    majorProgramId?: number
    programId?: number
    levelId?: number
    studentType?: StudentType
  }): Promise<EligibleCountResponse> =>
    // Live shape (verified 2026-09-14): `{ data: { eligibleCount } }`.
    apiClient
      .get<{
        data: { eligibleCount: number }
      }>(`${BASE}/types/eligible-count`, {
        ...AUTH,
        params: filters as Record<string, unknown>,
      })
      .then((res) => ({ count: res.data.eligibleCount })),

  // ── Invoices ────────────────────────────────────────────────────────────────

  listInvoices: (filters?: {
    status?: string
    feeTypeId?: number
    sessionId?: number
    studentId?: number
    // Major-Program Scoping — see fee-management-ui.store.ts's note.
    majorProgramId?: number
    // sandbox/MISSING_BACKEND_APIS.md §2.8.
    facultyName?: string
    departmentName?: string
    level?: number
  }) =>
    apiClient.get<{ data: InvoiceResponse[] }>(`${BASE}/invoices`, {
      ...AUTH,
      params: filters as Record<string, unknown>,
    }),

  // Confirmed live 2026-09-11: wrapped in the same `{ data: ... }` envelope
  // as every other GET in this module — the bare-`InvoiceResponse` typing
  // this used to have silently read `amount`/`amountPaid`/`feeType` as
  // `undefined` off the wrapper itself, producing "₦NaN" outstanding
  // balances and a missing fee type in the payment modal.
  getInvoice: async (id: number): Promise<InvoiceResponse> => {
    const res = await apiClient.get<{ data: InvoiceResponse }>(
      `${BASE}/invoices/${id}`,
      AUTH
    )
    return res.data
  },

  getMyInvoices: () =>
    apiClient.get<{ data: InvoiceResponse[] }>(`${BASE}/invoices/my`, AUTH),

  getStudentInvoices: (studentId: number) =>
    apiClient.get<{ data: InvoiceResponse[] }>(
      `${BASE}/invoices/student/${studentId}`,
      AUTH
    ),

  // Major-Program Scoping — sandbox/BACKEND_DEVIATIONS_2026-09-14.md A33.
  // Sent regardless (build-ahead per CLAUDE.md §14); the backend doesn't
  // support this param yet, so overdue-report.tsx also filters client-side
  // (via each invoice's student.programName) so the UI is correctly scoped
  // today, not just once this ships.
  getOverdueInvoices: (filters?: { majorProgramId?: number }) =>
    apiClient.get<{ data: InvoiceResponse[] }>(`${BASE}/invoices/overdue`, {
      ...AUTH,
      params: filters as Record<string, unknown>,
    }),

  resolveInvoices: () =>
    apiClient.post<ResolveInvoicesResponse>(
      `${BASE}/invoices/resolve`,
      undefined,
      AUTH
    ),

  // bruno/fee/Invoices - Waive.bru. The session-promotion contract lists
  // this as POST /invoices/{id}/waive; this API's fee routes all live under
  // /fees, which the contract says to keep. Validated before dispatch
  // (CLAUDE.md §4). A 404 "route could not be found" here means the server
  // doesn't expose it; the dialog reports that via isEndpointMissing().
  waiveInvoice: (id: number, dto: WaiveInvoiceDto) =>
    apiClient.post<void>(
      `${BASE}/invoices/${id}/waive`,
      WaiveInvoiceDtoSchema.parse(dto),
      AUTH
    ),

  cancelInvoice: (id: number) =>
    apiClient.post<void>(`${BASE}/invoices/${id}/cancel`, undefined, AUTH),

  // ── Payments ─────────────────────────────────────────────────────────────────
  // The three purpose-built wrapper endpoints (/fees/payments/{application,
  // acceptance,tuition}/initiate) belong to the admission module's own
  // service (src/app/(admission)/services/admissionService.ts), not here.

  initiatePayment: (dto: InitiatePaymentDto) =>
    apiClient.post<InitiatePaymentResponse>(
      `${BASE}/payments/initiate`,
      dto,
      AUTH
    ),

  // Body is only consulted for a manual (non-GATEWAY) verification; this
  // module's only caller (payment-status-panel.tsx) is a post-redirect
  // GATEWAY callback, which the backend re-checks server-to-server
  // regardless of what's sent — so no body is needed here.
  verifyPayment: (reference: string) =>
    apiClient.post<VerifyPaymentResponse>(
      `${BASE}/payments/verify/${reference}`,
      undefined,
      AUTH
    ),

  getInvoicePaymentHistory: (invoiceId: number) =>
    apiClient.get<PaymentHistoryResponse>(
      `${BASE}/payments/invoice/${invoiceId}`,
      AUTH
    ),

  // GET /fees/payments/:id — Admin or the paying student. Single payment
  // record with whatever gateway / verification detail the backend attaches.
  getPayment: (paymentId: number) =>
    apiClient.get<PaymentDetailResponse>(`${BASE}/payments/${paymentId}`, AUTH),

  // ── Reports ─────────────────────────────────────────────────────────────────

  // Major-Program Scoping — A33. Sent regardless, build-ahead per CLAUDE.md
  // §14. Both responses are pure aggregates (a scalar summary; a per-fee-type
  // breakdown, not per-program) — there's no raw per-invoice data here to
  // filter client-side, so unlike overdue invoices above, this stays
  // unscoped in the UI until the backend actually implements the param.
  // Deliberately not adding a filter control that would look functional but
  // do nothing — see CLAUDE.md §14's fallback rule.
  getCollectionsSummary: (filters?: {
    sessionId?: number
    feeTypeId?: number
    majorProgramId?: number
  }) =>
    apiClient.get<CollectionsSummaryResponse>(`${BASE}/reports/summary`, {
      ...AUTH,
      params: filters as Record<string, unknown>,
    }),

  getOutstandingReport: (filters?: { majorProgramId?: number }) =>
    apiClient.get<OutstandingReportResponse>(`${BASE}/reports/outstanding`, {
      ...AUTH,
      params: filters as Record<string, unknown>,
    }),
}
