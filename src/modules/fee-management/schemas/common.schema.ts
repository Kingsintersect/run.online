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

export const PaymentMethodSchema = z.enum([
  "BANK_TRANSFER",
  "CARD",
  "USSD",
  "GATEWAY",
])
export const PaymentStatusSchema = z.enum([
  "PENDING",
  "COMPLETED",
  "FAILED",
  "REFUNDED",
])
