import { z } from "zod"

// Real response per bruno/fee/Reports - Summary.bru is a flat object — no
// per-fee-type row array, no `.totals` wrapper. Replaces the earlier
// proposed per-row/`.totals` shape. See
// sandbox/TRIPLE_AUDIT_2026-09-13.md §1b.
export const CollectionsSummarySchema = z.object({
  invoiceCount: z.number(),
  totalInvoiced: z.string(),
  totalCollected: z.string(),
})

export const CollectionsSummaryResponseSchema = z.object({
  data: CollectionsSummarySchema,
})

export const OutstandingRowSchema = z.object({
  feeTypeId: z.number(),
  feeTypeName: z.string(),
  totalInvoiced: z.string(),
  totalPaid: z.string(),
  totalOutstanding: z.string(),
  studentCount: z.number(),
})

export const OutstandingReportResponseSchema = z.object({
  data: z.array(OutstandingRowSchema),
})
