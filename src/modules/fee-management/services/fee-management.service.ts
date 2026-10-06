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
  PaymentGatewayLogsResponse,
  PaymentLedgerFilters,
  PaymentLedgerResponse,
  WaiveInvoiceDto,
} from "../types"
import { WaiveInvoiceDtoSchema } from "../schemas/invoice.schema"
import {
  PaymentLedgerFiltersSchema,
  PaymentLedgerResponseSchema,
} from "../schemas/payment-ledger.schema"

// Real backend contract per bruno/fee/*.bru (the sole source of truth for
// this module — see CLAUDE.md §13). Every route lives under /fees; response
// envelopes match what each .bru file documents, unwrapped here so callers
// keep receiving the plain shape they already expect.
const BASE = "/fees"
const AUTH = { access_token: true } as const

/**
 * Fee type create/update: bruno's post-response script reads `res.body.id`
 * (flat) while the rest of this module is `{ data }`-wrapped. Accept both so
 * a redirect to the new fee type never lands on `/types/undefined`.
 */
function unwrapFeeType(
  res: { data: FeeTypeResponse } | FeeTypeResponse
): FeeTypeResponse {
  return "data" in res ? res.data : res
}

export const feeManagementService = {
  // ── Fee Types ────────────────────────────────────────────────────────────────

  listFeeTypes: async (filters?: {
    sessionId?: number
    // Major-Program Scoping (A12, live per bruno/fee/Fee Types - List.bru):
    // that major program's fee types plus every institution-wide one.
    // fee-type-table.tsx's client-side filter is now just a safety net.
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
    const res = await apiClient.post<
      { data: FeeTypeResponse } | FeeTypeResponse
    >(`${BASE}/types`, dto, AUTH)
    return unwrapFeeType(res)
  },

  updateFeeType: async (id: number, dto: Partial<CreateFeeTypeDto>) => {
    const res = await apiClient.patch<
      { data: FeeTypeResponse } | FeeTypeResponse
    >(`${BASE}/types/${id}`, dto, AUTH)
    return unwrapFeeType(res)
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

  // `{ data: {...} }` per bruno (the bare typing here used to read every
  // field off the envelope, so status/counts were always undefined).
  getGenerationStatus: async (
    id: number
  ): Promise<GenerationStatusResponse> => {
    const res = await apiClient.get<{ data: GenerationStatusResponse }>(
      `${BASE}/types/${id}/generation-status`,
      AUTH
    )
    return res.data
  },

  // Preview: estimated eligible student count for a given scope configuration
  // (bruno/fee/Fee Types - Eligible Count.bru; params sessionId, programId,
  // levelId, majorProgramId, studentType — `category` is ignored server-side).
  // Live 2026-10-05: `{ data: { eligibleCount } }`.
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

  // Major-Program Scoping — A28 (2026-09-26, bruno/fee/Invoices - Overdue.bru):
  // the route is scoped server-side and accepts ?majorProgramId=. The
  // client-side filter in overdue-report.tsx remains as a safety net.
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
  // Waiving also auto-releases the student's fee-withheld results
  // server-side (bruno backend brief item 7, 2026-09-28).
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

  // GET /fees/payments/:id/gateway-logs — Admin or the paying student.
  getPaymentGatewayLogs: (paymentId: number) =>
    apiClient.get<PaymentGatewayLogsResponse>(
      `${BASE}/payments/${paymentId}/gateway-logs`,
      AUTH
    ),

  // GET /fees/payments — cross-student payment ledger (bruno/fee/Payments -
  // List.bru). Params are validated before dispatch and empty ones dropped;
  // the response is Zod-parsed so a contract drift fails loudly, not as
  // silently wrong figures. 403 (incl. OUT_OF_SCOPE) propagates untouched as
  // ApiClientError for the screen to explain.
  listPayments: async (
    filters: PaymentLedgerFilters
  ): Promise<PaymentLedgerResponse> => {
    const params = PaymentLedgerFiltersSchema.parse(filters)
    const res = await apiClient.get<PaymentLedgerResponse>(`${BASE}/payments`, {
      ...AUTH,
      params,
    })
    return PaymentLedgerResponseSchema.parse(res)
  },

  // ── Reports ─────────────────────────────────────────────────────────────────

  // Major-Program Scoping — A33 (2026-09-26, bruno/fee/Reports - *.bru): both
  // reports are scoped to the caller's major programs server-side and accept
  // ?majorProgramId= (Bursary/Dean/Director included).
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
