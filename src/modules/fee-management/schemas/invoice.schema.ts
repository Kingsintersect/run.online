import { z } from "zod"
import { InvoiceStatusSchema } from "./common.schema"

// Who waived an invoice. The session-promotion contract
// (sandbox/accademic-session-semester-migration, "Shared API contract")
// adds `waived_by` to invoices without fixing its shape, and this API's
// other actor fields are either a bare user id (`issuedBy`) or an
// `{ id, name }` object, so accept both.
export const InvoiceWaiverActorSchema = z.union([
  z.number(),
  z.object({
    id: z.number(),
    name: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  }),
])

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
      // sandbox/MISSING_BACKEND_APIS.md §2.8. Optional so a response
      // without them still parses.
      facultyName: z.string().optional(),
      departmentName: z.string().optional(),
      programName: z.string().optional(),
      level: z.number().optional(),
    })
    .optional(),
  // Waiver fields (screen 7, invoices.waive). Filled once the invoice is
  // WAIVED. The contract names them in snake_case; the /fees API serialises
  // everything else in camelCase, so both spellings are accepted and read
  // through getInvoiceWaiver() (lib/invoice-waiver.ts). All optional so a
  // response from before the backend adds them still parses.
  waivedAt: z.string().nullable().optional(),
  waivedBy: InvoiceWaiverActorSchema.nullable().optional(),
  waiverReason: z.string().nullable().optional(),
  waived_at: z.string().nullable().optional(),
  waived_by: InvoiceWaiverActorSchema.nullable().optional(),
  waiver_reason: z.string().nullable().optional(),
})

export const InvoiceListResponseSchema = z.object({
  data: z.array(InvoiceResponseSchema),
})

export const ResolveInvoicesResponseSchema = z.object({
  created: z.number(),
  invoices: z.array(InvoiceResponseSchema),
})

// POST /fees/invoices/{id}/waive body `{ reason }`. The reason is stored on
// the invoice and shown to every later viewer, so require a real sentence.
export const WaiveInvoiceDtoSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "Give a reason of at least 10 characters")
    .max(500, "Keep the reason under 500 characters"),
})
