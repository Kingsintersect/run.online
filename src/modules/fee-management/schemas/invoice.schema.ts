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
  // bruno/fee/Invoices - List.bru: the paying user and (once one exists)
  // their Student record. Optional so older responses still parse.
  userId: z.number().optional(),
  studentId: z.number().nullable().optional(),
  // A28 (2026-09-26): the student's program's major program, else the fee
  // type's. Lets a client hide out-of-scope actions without a lookup.
  majorProgramId: z.number().nullable().optional(),
  feeType: z.object({
    id: z.number(),
    name: z.string(),
    category: z.string(),
  }),
  amount: z.string(), // Decimal serialized as string
  amountPaid: z.string(),
  // A plain date ("2026-10-18") on the live response, not a timestamp.
  dueDate: z.string(),
  status: InvoiceStatusSchema,
  session: z.object({ id: z.number(), name: z.string() }).nullable(),
  // Present on admin list / detail; absent on /my
  student: z
    .object({
      id: z.number(),
      matricNumber: z.string(),
      // Older responses carry `fullName`; bruno's documented serialize()
      // shape nests the name under `user`. Read via studentDisplayName().
      fullName: z.string().optional(),
      user: z
        .object({
          firstName: z.string().nullish(),
          lastName: z.string().nullish(),
        })
        .nullish(),
      // sandbox/MISSING_BACKEND_APIS.md §2.8. Optional so a response
      // without them still parses.
      facultyName: z.string().optional(),
      departmentName: z.string().optional(),
      programName: z.string().optional(),
      level: z.number().optional(),
    })
    .optional(),
  // Waiver fields (screen 7, invoices.waive). Filled once the invoice is
  // WAIVED. `waivedAt` is a real ISO timestamp since the 2026-09-28 cast fix
  // (bruno B24.4/B24.8); it was null on every waived invoice before that. The contract names them in snake_case; the /fees API serialises
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
