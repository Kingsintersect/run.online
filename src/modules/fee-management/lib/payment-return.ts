import { z } from "zod"

/**
 * The browser's return from a payment gateway (B30 item 3, 2026-09-29 —
 * bruno/fee/Payments - Webhook.bru).
 *
 * Every gateway (Credo or FCMB) sends the browser to the backend's own
 * `GET /fees/payments/callback/{reference}`. The backend re-verifies the
 * payment server-to-server, then 302s to the payment's stored return_url
 * with exactly `?reference=...&status=success|failed&feeType=...`, whichever
 * gateway ran. Those three are the only params a landing page should trust.
 */
export const PaymentReturnStatusSchema = z.enum(["success", "failed"])
export type PaymentReturnStatus = z.infer<typeof PaymentReturnStatusSchema>

export interface PaymentReturnParams {
  /** The payment reference, or "" when the URL carries none. */
  reference: string
  /** The backend's own verdict; null when absent (legacy redirect) or unrecognised. */
  status: PaymentReturnStatus | null
  /** The fee's label as the backend echoed it (e.g. "Application Fee"), or "". */
  feeType: string
  /** "backend": the documented return. "legacy": a gateway param fallback. */
  source: "backend" | "legacy" | "none"
}

/**
 * BACKWARD COMPATIBILITY ONLY. Before B30 item 3, a gateway could land the
 * browser here directly with its own params: Credo's `transRef`, FCMB's
 * `invoiceRequestReference`, or `paymentReference`. The backend no longer
 * does this, but a checkout started before the change (or an old bookmarked
 * link) may still arrive this way. These carry no trustworthy status, so a
 * legacy landing always goes through the normal verify call.
 */
const LEGACY_REFERENCE_PARAM_KEYS = [
  "transRef",
  "invoiceRequestReference",
  "paymentReference",
] as const

interface SearchParamsLike {
  get(name: string): string | null
}

export function readPaymentReturnParams(
  searchParams: SearchParamsLike
): PaymentReturnParams {
  const feeType = searchParams.get("feeType") ?? ""
  const parsedStatus = PaymentReturnStatusSchema.safeParse(
    (searchParams.get("status") ?? "").toLowerCase()
  )
  const status = parsedStatus.success ? parsedStatus.data : null

  const reference = searchParams.get("reference")
  if (reference) return { reference, status, feeType, source: "backend" }

  for (const key of LEGACY_REFERENCE_PARAM_KEYS) {
    const value = searchParams.get(key)
    if (value)
      return { reference: value, status: null, feeType, source: "legacy" }
  }

  return { reference: "", status, feeType, source: "none" }
}
