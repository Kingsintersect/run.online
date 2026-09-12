import type { z } from "zod"
import type * as Common from "../schemas/common.schema"
import type * as FeeType from "../schemas/fee-type.schema"

// ── Enums ──────────────────────────────────────────────────────────────────────
export type FeeCategory = z.infer<typeof Common.FeeCategorySchema>
export type InvoiceStatus = z.infer<typeof Common.InvoiceStatusSchema>
export type StudentType = z.infer<typeof Common.StudentTypeSchema>
export type PaymentMethod = z.infer<typeof Common.PaymentMethodSchema>
export type PaymentStatus = z.infer<typeof Common.PaymentStatusSchema>

// ── Fee Types ──────────────────────────────────────────────────────────────────
export type CreateFeeTypeDto = z.infer<typeof FeeType.CreateFeeTypeDtoSchema>
export type CreateFeeTypeInputValues = FeeType.CreateFeeTypeInputValues
export type UpdateFeeTypeDto = z.infer<typeof FeeType.UpdateFeeTypeDtoSchema>
export type FeeTypeResponse = z.infer<typeof FeeType.FeeTypeResponseSchema>
export type ActivateFeeTypeResponse = z.infer<
  typeof FeeType.ActivateFeeTypeResponseSchema
>
export type GenerationStatusResponse = z.infer<
  typeof FeeType.GenerationStatusResponseSchema
>
export type EligibleCountResponse = z.infer<
  typeof FeeType.EligibleCountResponseSchema
>

// ── Invoices ──────────────────────────────────────────────────────────────────
import type * as Invoice from "../schemas/invoice.schema"

export type InvoiceResponse = z.infer<typeof Invoice.InvoiceResponseSchema>
export type ResolveInvoicesResponse = z.infer<
  typeof Invoice.ResolveInvoicesResponseSchema
>
export type WaiveInvoiceDto = z.infer<typeof Invoice.WaiveInvoiceDtoSchema>

// ── Payments ──────────────────────────────────────────────────────────────────
import type * as Payment from "../schemas/payment.schema"

export type InitiatePaymentDto = z.infer<
  typeof Payment.InitiatePaymentDtoSchema
>
export type InitiatePaymentResponse = z.infer<
  typeof Payment.InitiatePaymentResponseSchema
>
export type VerifyPaymentResponse = z.infer<
  typeof Payment.VerifyPaymentResponseSchema
>
export type PaymentHistoryItem = z.infer<
  typeof Payment.PaymentHistoryItemSchema
>
export type PaymentHistoryResponse = z.infer<
  typeof Payment.PaymentHistoryResponseSchema
>
export type PaymentDetail = z.infer<typeof Payment.PaymentDetailSchema>
export type PaymentDetailResponse = z.infer<
  typeof Payment.PaymentDetailResponseSchema
>

// ── Reports ───────────────────────────────────────────────────────────────────
import type * as Reports from "../schemas/reports.schema"

export type CollectionsSummaryRow = z.infer<
  typeof Reports.CollectionsSummaryRowSchema
>
export type CollectionsSummaryResponse = z.infer<
  typeof Reports.CollectionsSummaryResponseSchema
>
export type OutstandingRow = z.infer<typeof Reports.OutstandingRowSchema>
export type OutstandingReportResponse = z.infer<
  typeof Reports.OutstandingReportResponseSchema
>
