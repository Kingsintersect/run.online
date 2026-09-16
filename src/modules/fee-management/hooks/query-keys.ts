export const feeKeys = {
  all: ["fee-management"] as const,

  // Fee types
  feeTypes: (filters?: Record<string, unknown>) =>
    [...feeKeys.all, "fee-types", filters] as const,
  // Filters-agnostic prefix — use this (not `feeTypes()`) to invalidate.
  // `feeTypes()` called bare embeds `undefined` in that slot, which
  // React Query's partial-match invalidation treats as a *type* mismatch
  // against the real cached key (an object, even when every filter inside
  // it is undefined — every call site always passes a filters object) and
  // so silently matches nothing. This prefix matches every `feeTypes(...)`
  // list query regardless of what filters (or lack of them) it was fetched
  // with, plus `feeType(id)`/`generationStatus(id)` detail keys.
  feeTypesAll: () => [...feeKeys.all, "fee-types"] as const,
  feeType: (id: number) => [...feeKeys.all, "fee-types", id] as const,
  generationStatus: (id: number) =>
    [...feeKeys.all, "fee-types", id, "generation-status"] as const,
  eligibleCount: (filters: Record<string, unknown> | null) =>
    [...feeKeys.all, "fee-types", "eligible-count", filters] as const,

  // Invoices — added in slice 2
  invoices: (filters?: Record<string, unknown>) =>
    [...feeKeys.all, "invoices", filters] as const,
  // Same reasoning as `feeTypesAll` above — always invalidate invoices with
  // this, never a bare `invoices()`.
  invoicesAll: () => [...feeKeys.all, "invoices"] as const,
  invoice: (id: number) => [...feeKeys.all, "invoices", id] as const,
  myInvoices: () => [...feeKeys.all, "invoices", "my"] as const,
  studentInvoices: (studentId: number) =>
    [...feeKeys.all, "invoices", "student", studentId] as const,
  overdueInvoices: () => [...feeKeys.all, "invoices", "overdue"] as const,

  // Payments — added in slice 3
  paymentHistory: (invoiceId: number) =>
    [...feeKeys.all, "payments", "invoice", invoiceId] as const,
  payment: (paymentId: number) =>
    [...feeKeys.all, "payments", paymentId] as const,

  // Reports — added in slice 4
  collectionsSummary: (filters?: Record<string, unknown>) =>
    [...feeKeys.all, "reports", "collections", filters] as const,
  outstandingReport: () => [...feeKeys.all, "reports", "outstanding"] as const,
} as const
