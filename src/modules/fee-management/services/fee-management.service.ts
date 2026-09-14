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
} from "../types"

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
    programId?: number
    levelId?: number
    studentType?: StudentType
  }) =>
    apiClient.get<EligibleCountResponse>(`${BASE}/types/eligible-count`, {
      ...AUTH,
      params: filters as Record<string, unknown>,
    }),

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

  getOverdueInvoices: () =>
    apiClient.get<{ data: InvoiceResponse[] }>(
      `${BASE}/invoices/overdue`,
      AUTH
    ),

  resolveInvoices: () =>
    apiClient.post<ResolveInvoicesResponse>(
      `${BASE}/invoices/resolve`,
      undefined,
      AUTH
    ),

  waiveInvoice: (id: number, reason: string) =>
    apiClient.post<void>(`${BASE}/invoices/${id}/waive`, { reason }, AUTH),

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

  getCollectionsSummary: (filters?: {
    sessionId?: number
    feeTypeId?: number
  }) =>
    apiClient.get<CollectionsSummaryResponse>(`${BASE}/reports/summary`, {
      ...AUTH,
      params: filters as Record<string, unknown>,
    }),

  getOutstandingReport: () =>
    apiClient.get<OutstandingReportResponse>(
      `${BASE}/reports/outstanding`,
      AUTH
    ),
}
