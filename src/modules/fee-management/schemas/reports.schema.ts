import { z } from "zod"

export const CollectionsSummaryRowSchema = z.object({
  feeTypeId: z.number(),
  feeTypeName: z.string(),
  category: z.string(),
  session: z.object({ id: z.number(), name: z.string() }).nullable(),
  totalInvoiced: z.string(),
  totalPaid: z.string(),
  totalOutstanding: z.string(),
  invoiceCount: z.number(),
  paidCount: z.number(),
})

export const CollectionsSummaryResponseSchema = z.object({
  data: z.array(CollectionsSummaryRowSchema),
  totals: z.object({
    totalInvoiced: z.string(),
    totalPaid: z.string(),
    totalOutstanding: z.string(),
  }),
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
