import { z } from "zod"
import {
  PaymentStatusSchema,
  RecordedPaymentMethodSchema,
} from "./common.schema"

// GET /fees/payments — the cross-student payment ledger
// (bruno/fee/Payments - List.bru, A34, 2026-09-26). Admin/staff, or anyone
// holding financial-transactions.view, each confined to their own
// major-program scope server-side. Shape confirmed live on QHUB 2026-10-06.

/** The server rejects anything above 100 with a 422 (verified live). */
export const PAYMENT_LEDGER_MAX_LIMIT = 100

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD format")

/** Query params, validated before dispatch (CLAUDE.md §4). */
export const PaymentLedgerFiltersSchema = z.object({
  majorProgramId: z.number().int().positive().optional(),
  sessionId: z.number().int().positive().optional(),
  method: RecordedPaymentMethodSchema.optional(),
  status: PaymentStatusSchema.optional(),
  /** Inclusive, on paid_at else created_at. */
  dateFrom: isoDate.optional(),
  dateTo: isoDate.optional(),
  /** Payment reference or matric number. */
  search: z.string().trim().min(1).max(120).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(PAYMENT_LEDGER_MAX_LIMIT).default(20),
})

/** API Decimal: a string on both backends today; a number is tolerated. */
const amountSchema = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))

export const PaymentLedgerInvoiceSchema = z.object({
  id: z.number(),
  invoiceNumber: z.string(),
  feeType: z.object({ name: z.string() }).nullable(),
  session: z.object({ id: z.number(), name: z.string() }).nullable(),
})

export const PaymentLedgerStudentSchema = z.object({
  id: z.number(),
  matricNumber: z.string().nullable(),
  fullName: z.string().nullable(),
  programName: z.string().nullable(),
})

export const PaymentLedgerRowSchema = z.object({
  id: z.number(),
  invoiceId: z.number(),
  amount: amountSchema,
  method: RecordedPaymentMethodSchema,
  referenceNumber: z.string(),
  gatewayTransactionId: z.string().nullable(),
  status: PaymentStatusSchema,
  paidAt: z.string().nullable(),
  verifiedAt: z.string().nullable(),
  webhookReceivedAt: z.string().nullable(),
  verifiedVia: z.string().nullable(),
  majorProgramId: z.number().nullable(),
  majorProgramName: z.string().nullable(),
  invoice: PaymentLedgerInvoiceSchema.nullable(),
  /** Null for an applicant's application-fee payment. */
  student: PaymentLedgerStudentSchema.nullable(),
  createdAt: z.string().nullable(),
})

export const PaymentLedgerMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
})

export const PaymentLedgerResponseSchema = z.object({
  data: z.array(PaymentLedgerRowSchema),
  meta: PaymentLedgerMetaSchema,
})

/**
 * 403 OUT_OF_SCOPE body (B11, 2026-09-26). `message` keeps its historical
 * "OUT_OF_SCOPE: …" prefix.
 */
export const OutOfScopeErrorBodySchema = z.object({
  statusCode: z.number().optional(),
  error: z.literal("OUT_OF_SCOPE"),
  message: z.string().optional(),
  details: z
    .object({
      requestedMajorProgramId: z.number().nullable().optional(),
      callerScope: z.array(z.number()).optional(),
    })
    .optional(),
})
