import { z } from "zod"
import { PaymentMethodSchema, PaymentStatusSchema } from "./common.schema"

export const InitiatePaymentDtoSchema = z.object({
  invoiceId: z.number().int().positive(),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  method: PaymentMethodSchema,
})

export const InitiatePaymentResponseSchema = z.object({
  paymentId: z.number(),
  referenceNumber: z.string(),
  // null when method is BANK_TRANSFER or other offline methods
  checkoutUrl: z.string().url().nullable(),
  status: z.literal("PENDING"),
})

export const VerifyPaymentResponseSchema = z.object({
  paymentId: z.number(),
  status: PaymentStatusSchema,
  invoice: z.object({
    id: z.number(),
    amountPaid: z.string(),
    status: z.enum(["PENDING", "PARTIALLY_PAID", "PAID", "OVERDUE"]),
  }),
})

export const PaymentHistoryItemSchema = z.object({
  id: z.number(),
  amount: z.string(),
  method: PaymentMethodSchema,
  referenceNumber: z.string(),
  status: PaymentStatusSchema,
  paidAt: z.string().datetime({ offset: true }),
})

export const PaymentHistoryResponseSchema = z.object({
  data: z.array(PaymentHistoryItemSchema),
})

// GET /fees/payments/:id — Admin or Owner. The `.bru` has no example body,
// so this is the history-item shape plus the extra fields a single-record
// view would plausibly carry, all optional / nullable so the parse never
// fails on a leaner response.
export const PaymentDetailSchema = PaymentHistoryItemSchema.extend({
  invoiceId: z.number().optional(),
  invoiceNumber: z.string().nullish(),
  feeTypeName: z.string().nullish(),
  gatewayReference: z.string().nullish(),
  verifiedAt: z.string().nullish(),
  createdAt: z.string().nullish(),
  studentName: z.string().nullish(),
  studentMatric: z.string().nullish(),
})

export const PaymentDetailResponseSchema = z.object({
  data: PaymentDetailSchema,
})
