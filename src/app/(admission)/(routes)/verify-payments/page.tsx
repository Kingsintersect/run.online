"use client"

import { useEffect, useMemo, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { useSession } from "next-auth/react"
import { Skeleton } from "@/components/ui/skeleton"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { PaymentVerificationView } from "../../components"
import {
  useVerifyApplicationPayment,
  useVerifyAcceptanceFeePayment,
  useVerifyTuitionPayment,
} from "../../hooks/useAdmissionQueries"
import { fetchRefreshedSessionRoles } from "@/lib/auth/backendAuth"
import {
  APPLICATION_FEE_AMOUNT,
  ACCEPTANCE_FEE_AMOUNT,
  TUITION_FEE_AMOUNT,
} from "@/config/global.config"

// ─── Payment Type Resolution ────────────────────────────────────────────────
type PaymentType = "application" | "acceptance" | "tuition"

/** Base fee amounts (before gateway processor fees) — used only as a fallback below. */
const PAYMENT_TYPE_AMOUNTS: { type: PaymentType; baseAmount: number }[] = [
  { type: "application", baseAmount: APPLICATION_FEE_AMOUNT },
  { type: "acceptance", baseAmount: ACCEPTANCE_FEE_AMOUNT },
  { type: "tuition", baseAmount: TUITION_FEE_AMOUNT },
]

/**
 * Resolve which fee type a Credo gateway redirect is for. Each initiate
 * endpoint is fee-type-specific (`/fees/payments/{application,acceptance,
 * tuition}/initiate`), so the backend already knows the type and echoes it
 * back on the redirect via `feeType` (e.g. "Application Fee") — matching on
 * that directly is reliable and doesn't depend on the exact fee amount.
 *
 * Falls back to guessing from `transAmount` only if `feeType` is missing —
 * that heuristic breaks the moment a fee amount changes or a gateway
 * processing fee pushes the total outside the assumed tolerance window, so
 * it's a last resort, not the primary signal.
 */
function resolvePaymentType(searchParams: URLSearchParams): PaymentType | null {
  const feeType = searchParams.get("feeType")?.toLowerCase() ?? ""
  if (feeType.includes("application")) return "application"
  if (feeType.includes("acceptance")) return "acceptance"
  if (feeType.includes("tuition")) return "tuition"

  const transAmount = searchParams.get("transAmount")
  if (!transAmount) return null

  const amount = parseFloat(transAmount)
  if (isNaN(amount)) return null

  // Sort descending so a higher amount can't accidentally match a lower tier
  const sorted = [...PAYMENT_TYPE_AMOUNTS].sort(
    (a, b) => b.baseAmount - a.baseAmount
  )

  for (const config of sorted) {
    // transAmount >= baseAmount (processor fee makes it slightly higher)
    // and within a reasonable upper bound (base + 5 % cap)
    if (amount >= config.baseAmount && amount <= config.baseAmount * 1.05) {
      return config.type
    }
  }

  return null
}

// ─── Per-type Verification Wrappers ─────────────────────────────────────────
// Each wrapper calls the correct React Query hook (hooks can't be conditional)

function VerifyApplication({ reference }: { reference: string }) {
  const { data, isLoading, error } = useVerifyApplicationPayment(reference)
  return (
    <PaymentVerificationView
      title="Verifying Application Payment"
      isLoading={isLoading}
      error={error}
      data={data}
      redirectTo="/process-admission"
    />
  )
}

function VerifyAcceptance({ reference }: { reference: string }) {
  const { data, isLoading, error } = useVerifyAcceptanceFeePayment(reference)
  return (
    <PaymentVerificationView
      title="Verifying Acceptance Fee Payment"
      isLoading={isLoading}
      error={error}
      data={data}
      redirectTo="/process-admission"
    />
  )
}

function VerifyTuition({ reference }: { reference: string }) {
  const { data, isLoading, error } = useVerifyTuitionPayment(reference)
  const { data: session, update } = useSession()
  const refreshedSession = useRef(false)

  // Tuition payment is the one verification step that can promote the
  // account (APPLICANT -> STUDENT) and enroll it in courses on the backend —
  // the session the browser is holding has no way to know that on its own.
  // Refresh it here, while the success screen's countdown is still showing,
  // so /student is actually reachable by the time the applicant continues
  // instead of bouncing them back out for a manual re-login.
  useEffect(() => {
    if (!data?.success || refreshedSession.current) return
    refreshedSession.current = true

    void (async () => {
      const fresh = await fetchRefreshedSessionRoles(
        session?.user?.role ?? null
      )
      if (fresh) await update(fresh)
    })()
  }, [data?.success, session?.user?.role, update])

  return (
    <PaymentVerificationView
      title="Verifying Tuition Payment"
      isLoading={isLoading}
      error={error}
      data={data}
      redirectTo="/process-admission"
    />
  )
}

// ─── Unified Content ────────────────────────────────────────────────────────

function VerifyPaymentContent() {
  const searchParams = useSearchParams()
  const reference =
    searchParams.get("transRef") ?? searchParams.get("reference") ?? ""

  const paymentType = useMemo(
    () => resolvePaymentType(searchParams),
    [searchParams]
  )

  if (!reference) {
    return (
      <PaymentVerificationView
        title="Payment Verification"
        isLoading={false}
        error={
          new Error("No payment reference found. Please retry your payment.")
        }
        data={undefined}
        redirectTo="/process-admission"
      />
    )
  }

  if (!paymentType) {
    return (
      <PaymentVerificationView
        title="Payment Verification"
        isLoading={false}
        error={
          new Error(
            "Unable to determine payment type from the transaction amount. Please contact support."
          )
        }
        data={undefined}
        redirectTo="/process-admission"
      />
    )
  }

  switch (paymentType) {
    case "application":
      return <VerifyApplication reference={reference} />
    case "acceptance":
      return <VerifyAcceptance reference={reference} />
    case "tuition":
      return <VerifyTuition reference={reference} />
  }
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function VerifyPaymentsPage() {
  return (
    <PermissionGate
      require={{ resource: "my-payments", action: "view" }}
      denyBehavior="screen"
    >
      <Suspense
        fallback={
          <div className="flex min-h-[70vh] items-center justify-center">
            <div className="space-y-4 text-center">
              <Skeleton className="mx-auto h-12 w-12 rounded-full" />
              <Skeleton className="mx-auto h-4 w-48" />
            </div>
          </div>
        }
      >
        <VerifyPaymentContent />
      </Suspense>
    </PermissionGate>
  )
}
