import { z } from "zod"
import {
  PaymentMethodSchema,
  PaymentStatusSchema,
  RecordedPaymentMethodSchema,
} from "./common.schema"

export const InitiatePaymentDtoSchema = z.object({
  invoiceId: z.number().int().positive(),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  method: PaymentMethodSchema,
})

/**
 * The gateway's bank-transfer account for method "GATEWAY_TRANSFER" (B30
 * item 4, bruno/fee/Payments - Initiate.bru): the same shape for Credo and
 * FCMB, never null once that method succeeds. No screen offers
 * GATEWAY_TRANSFER yet (PaymentMethodSchema doesn't include it), so today
 * this is always null/absent on a response.
 */
export const VirtualAccountSchema = z.object({
  accountNumber: z.string(),
  accountName: z.string(),
  bank: z.string(),
})

export const InitiatePaymentResponseSchema = z.object({
  paymentId: z.number(),
  referenceNumber: z.string(),
  // Hosted checkout for plain "GATEWAY"; null for BANK_TRANSFER and other
  // offline methods, and for GATEWAY_TRANSFER (which uses virtualAccount).
  checkoutUrl: z.string().url().nullable(),
  virtualAccount: VirtualAccountSchema.nullish(),
  otpRequired: z.boolean().nullish(),
  authUrl: z.string().nullish(),
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
  method: RecordedPaymentMethodSchema,
  referenceNumber: z.string(),
  status: PaymentStatusSchema,
  // Null until the payment completes (a PENDING/FAILED attempt has none).
  paidAt: z.string().datetime({ offset: true }).nullable(),
  createdAt: z.string().nullish(),
})

export const PaymentHistoryResponseSchema = z.object({
  data: z.array(PaymentHistoryItemSchema),
})

// GET /fees/payments/:id — Admin or Owner. The `.bru` has no example body;
// field names follow the payment row documented on the ledger (Payments -
// List.bru) and gateway-logs (Payments - Gateway Logs.bru), which says
// `gatewayTransactionId` is on this response. All optional / nullable so the
// parse never fails on a leaner response.
export const PaymentDetailSchema = PaymentHistoryItemSchema.extend({
  invoiceId: z.number().optional(),
  invoiceNumber: z.string().nullish(),
  feeTypeName: z.string().nullish(),
  gateway: z.string().nullish(),
  gatewayTransactionId: z.string().nullish(),
  /** Older name for gatewayTransactionId, kept as a fallback. */
  gatewayReference: z.string().nullish(),
  verifiedAt: z.string().nullish(),
  verifiedVia: z.string().nullish(),
  webhookReceivedAt: z.string().nullish(),
  studentName: z.string().nullish(),
  studentMatric: z.string().nullish(),
})

// GET /fees/payments/:id/gateway-logs — Admin, Owner. The full webhook /
// verify timeline for one payment, oldest first.
export const GatewayLogEventSchema = z.object({
  id: z.number().optional(),
  event: z.string().nullish(),
  type: z.string().nullish(),
  source: z.string().nullish(),
  message: z.string().nullish(),
  ip: z.string().nullish(),
  gatewayTransactionId: z.string().nullish(),
  createdAt: z.string().nullish(),
})

export const PaymentGatewayLogsSchema = z.object({
  paymentId: z.number(),
  referenceNumber: z.string().nullish(),
  gateway: z.string().nullish(),
  gatewayTransactionId: z.string().nullish(),
  status: z.string().nullish(),
  webhookReceivedAt: z.string().nullish(),
  verifiedVia: z.string().nullish(),
  events: z.array(GatewayLogEventSchema),
})

export const PaymentGatewayLogsResponseSchema = z.object({
  data: PaymentGatewayLogsSchema,
})

export const PaymentDetailResponseSchema = z.object({
  data: PaymentDetailSchema,
})
