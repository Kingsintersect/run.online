import { z } from "zod"

export const FeeCategorySchema = z.enum([
  "APPLICATION",
  "ACCEPTANCE",
  "TUITION",
  "HOSTEL",
  "CLEARANCE",
  "OTHER",
])

export const InvoiceStatusSchema = z.enum([
  "PENDING",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELLED",
  "WAIVED",
])

export const StudentTypeSchema = z.enum(["NEW", "RETURNING", "ALL"])

/** Methods a client may choose when initiating a payment. */
export const PaymentMethodSchema = z.enum([
  "BANK_TRANSFER",
  "CARD",
  "USSD",
  "GATEWAY",
])

/**
 * Methods a recorded payment can carry: the gateway may refine GATEWAY to
 * GATEWAY_TRANSFER / GATEWAY_CARD (bruno/fee/Payments - List.bru's `method`
 * filter). Read-side only; never offered on initiate.
 */
export const RecordedPaymentMethodSchema = z.enum([
  ...PaymentMethodSchema.options,
  "GATEWAY_TRANSFER",
  "GATEWAY_CARD",
])
export const PaymentStatusSchema = z.enum([
  "PENDING",
  "COMPLETED",
  "FAILED",
  "REFUNDED",
])
