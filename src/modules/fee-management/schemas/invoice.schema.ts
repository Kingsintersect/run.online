import { z } from "zod"
import { InvoiceStatusSchema } from "./common.schema"

export const InvoiceResponseSchema = z.object({
  id: z.number(),
  invoiceNumber: z.string(),
  feeType: z.object({
    id: z.number(),
    name: z.string(),
    category: z.string(),
  }),
  amount: z.string(), // Decimal serialized as string
  amountPaid: z.string(),
  dueDate: z.string().datetime({ offset: true }),
  status: InvoiceStatusSchema,
  session: z.object({ id: z.number(), name: z.string() }).nullable(),
  // Present on admin list / detail; absent on /my
  student: z
    .object({
      id: z.number(),
      matricNumber: z.string(),
      fullName: z.string(),
    })
    .optional(),
})

export const InvoiceListResponseSchema = z.object({
  data: z.array(InvoiceResponseSchema),
})

export const ResolveInvoicesResponseSchema = z.object({
  created: z.number(),
  invoices: z.array(InvoiceResponseSchema),
})

export const WaiveInvoiceDtoSchema = z.object({
  reason: z.string().min(5, "Reason must be at least 5 characters").max(500),
})
