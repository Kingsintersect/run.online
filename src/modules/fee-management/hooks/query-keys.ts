export const feeKeys = {
  all: ["fee-management"] as const,

  // Fee types
  feeTypes: (filters?: Record<string, unknown>) =>
    [...feeKeys.all, "fee-types", filters] as const,
  feeType: (id: number) => [...feeKeys.all, "fee-types", id] as const,
  generationStatus: (id: number) =>
    [...feeKeys.all, "fee-types", id, "generation-status"] as const,
  eligibleCount: (filters: Record<string, unknown> | null) =>
    [...feeKeys.all, "fee-types", "eligible-count", filters] as const,

  // Invoices — added in slice 2
  invoices: (filters?: Record<string, unknown>) =>
    [...feeKeys.all, "invoices", filters] as const,
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
