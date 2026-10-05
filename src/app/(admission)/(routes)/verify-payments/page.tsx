"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { useSession } from "next-auth/react"
import { Skeleton } from "@/components/ui/skeleton"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { readPaymentReturnParams } from "@/modules/fee-management/lib/payment-return"
import { PaymentFailedView, PaymentVerificationView } from "../../components"
import {
  useVerifyApplicationPayment,
  useVerifyAcceptanceFeePayment,
  useVerifyTuitionPayment,
  useVerifyGenericPayment,
} from "../../hooks/useAdmissionQueries"
import { fetchRefreshedSessionRoles } from "@/lib/auth/backendAuth"
import {
  APPLICATION_FEE_AMOUNT,
  ACCEPTANCE_FEE_AMOUNT,
  TUITION_FEE_AMOUNT,
} from "@/config/global.config"

// ─── Payment Type Resolution ────────────────────────────────────────────────
type PaymentResolution =
  | { kind: "application" | "acceptance" | "tuition" }
  // Any PAYMENT stage outside the three legacy fixed fee types — a custom
  // step an admin created (Dynamic Admission), e.g. Certificate's "Access
  // Fee". `label` is whatever the backend echoed back in `feeType`, used
  // for the on-screen title instead of a hardcoded one.
  | { kind: "generic"; label: string }

/** Base fee amounts (before gateway processor fees) — used only as a fallback below. */
const PAYMENT_TYPE_AMOUNTS: {
  type: "application" | "acceptance" | "tuition"
  baseAmount: number
}[] = [
  { type: "application", baseAmount: APPLICATION_FEE_AMOUNT },
  { type: "acceptance", baseAmount: ACCEPTANCE_FEE_AMOUNT },
  { type: "tuition", baseAmount: TUITION_FEE_AMOUNT },
]

/**
 * Resolve which fee a gateway redirect is for (Credo or FCMB — whichever is
 * active via GET/PATCH /fees/gateway; the backend builds the callback URL
 * itself, so `reference`/`feeType` come from it, not the gateway). The backend already
 * echoes the step's own label back via `feeType` (e.g. "Application Fee",
 * or a custom step's own label like "Access Fee") — matching that directly
 * is reliable and doesn't depend on the exact fee amount.
 *
 * Real fix, 2026-09-16: a custom PAYMENT step's `feeType` (e.g. "Access
 * Fee") doesn't contain "application"/"acceptance"/"tuition" as a substring,
 * so it used to fall through to the amount-based guess below and then fail
 * outright once that didn't match either — "Unable to determine payment
 * type," confirmed live on Certificate's Access Fee. Every verify*Payment()
 * call hits the exact same generic, reference-only backend endpoint
 * regardless of fee type (`POST /fees/payments/verify/:reference` — see
 * admissionService.ts's shared `verifyGatewayPayment`), so there's no need
 * to force an unrecognized fee into one of the three legacy buckets or fail
 * — route it through `useVerifyGenericPayment` instead, using the real
 * label the backend already gave us.
 *
 * Falls back to guessing from `transAmount` only if `feeType` is missing
 * entirely — that heuristic breaks the moment a fee amount changes or a
 * gateway processing fee pushes the total outside the assumed tolerance
 * window, so it's a last resort, not the primary signal, and only used for
 * the three legacy types (a custom fee has no known "base amount" to guess
 * from at all).
 *
 * Gateway-agnostic, 2026-09-29: `transAmount` is Credo's own redirect param —
 * an FCMB redirect has no equivalent. Since B30 item 3 the backend's return
 * always carries `feeType`, so the `transAmount` guess is a backward-
 * compatibility path for legacy direct-from-gateway landings only. When nothing identifies the fee, fall
 * back to the generic verify (same reference-only endpoint) instead of
 * failing, so a redirect from either gateway can always be verified.
 */
function resolvePaymentType(searchParams: URLSearchParams): PaymentResolution {
  const feeTypeRaw = searchParams.get("feeType") ?? ""
  const feeType = feeTypeRaw.toLowerCase()
  if (feeType.includes("application")) return { kind: "application" }
  if (feeType.includes("acceptance")) return { kind: "acceptance" }
  if (feeType.includes("tuition")) return { kind: "tuition" }
  if (feeTypeRaw) return { kind: "generic", label: feeTypeRaw }

  const generic: PaymentResolution = { kind: "generic", label: "" }
  const transAmount = searchParams.get("transAmount")
  if (!transAmount) return generic

  const amount = parseFloat(transAmount)
  if (isNaN(amount)) return generic

  // Sort descending so a higher amount can't accidentally match a lower tier
  const sorted = [...PAYMENT_TYPE_AMOUNTS].sort(
    (a, b) => b.baseAmount - a.baseAmount
  )

  for (const config of sorted) {
    // transAmount >= baseAmount (processor fee makes it slightly higher)
    // and within a reasonable upper bound (base + 5 % cap)
    if (amount >= config.baseAmount && amount <= config.baseAmount * 1.05) {
      return { kind: config.type }
    }
  }

  return generic
}

// The reference/status/feeType read (plus the commented legacy gateway-param
// fallback) lives in readPaymentReturnParams() — shared with the student
// fees callback page, per B30 item 3 (bruno/fee/Payments - Webhook.bru).

/**
 * A successful payment can be the one that promotes the account (APPLICANT
 * -> STUDENT) and enrolls it on the backend — tuition, or a custom PAYMENT
 * stage that plays the same role. The session the browser holds can't know
 * that on its own, so refresh it while the success screen's countdown is
 * still showing, so /student is reachable without a manual re-login.
 */
function useRefreshSessionOnSuccess(success: boolean | undefined) {
  const { data: session, update } = useSession()
  const refreshedSession = useRef(false)

  useEffect(() => {
    if (!success || refreshedSession.current) return
    refreshedSession.current = true

    void (async () => {
      const fresh = await fetchRefreshedSessionRoles(
        session?.user?.role ?? null
      )
      if (fresh) await update(fresh)
    })()
  }, [success, session?.user?.role, update])
}

// ─── Per-type Verification Wrappers ─────────────────────────────────────────
// Each wrapper calls the correct React Query hook (hooks can't be conditional)

function VerifyApplication({ reference }: { reference: string }) {
  const { data, isLoading, error, refetch, isFetching } =
    useVerifyApplicationPayment(reference)
  return (
    <PaymentVerificationView
      title="Verifying Application Payment"
      isLoading={isLoading}
      error={error}
      data={data}
      redirectTo="/process-admission"
      feeLabel="Application Fee"
      onCheckAgain={() => void refetch()}
      isCheckingAgain={isFetching}
    />
  )
}

function VerifyAcceptance({ reference }: { reference: string }) {
  const { data, isLoading, error, refetch, isFetching } =
    useVerifyAcceptanceFeePayment(reference)
  return (
    <PaymentVerificationView
      title="Verifying Acceptance Fee Payment"
      isLoading={isLoading}
      error={error}
      data={data}
      redirectTo="/process-admission"
      feeLabel="Acceptance Fee"
      onCheckAgain={() => void refetch()}
      isCheckingAgain={isFetching}
    />
  )
}

function VerifyTuition({ reference }: { reference: string }) {
  const { data, isLoading, error, refetch, isFetching } =
    useVerifyTuitionPayment(reference)
  useRefreshSessionOnSuccess(data?.success)

  return (
    <PaymentVerificationView
      title="Verifying Tuition Payment"
      isLoading={isLoading}
      error={error}
      data={data}
      redirectTo="/process-admission"
      feeLabel="Tuition"
      onCheckAgain={() => void refetch()}
      isCheckingAgain={isFetching}
    />
  )
}

function VerifyGeneric({
  reference,
  label,
}: {
  reference: string
  label: string
}) {
  const { data, isLoading, error, refetch, isFetching } =
    useVerifyGenericPayment(reference)
  useRefreshSessionOnSuccess(data?.success)
  return (
    <PaymentVerificationView
      title={label ? `Verifying ${label} Payment` : "Verifying Payment"}
      isLoading={isLoading}
      error={error}
      data={data}
      redirectTo="/process-admission"
      feeLabel={label}
      onCheckAgain={() => void refetch()}
      isCheckingAgain={isFetching}
    />
  )
}

// ─── Unified Content ────────────────────────────────────────────────────────

function VerifyPaymentContent() {
  const searchParams = useSearchParams()
  const { reference, status, feeType } = readPaymentReturnParams(searchParams)
  // `status=failed` means the backend already re-verified with the gateway
  // and the payment didn't go through: show that honestly instead of a
  // verify spinner. "Check again" opts back into the verify call for a payer
  // who believes they were charged anyway.
  const [checkAgain, setCheckAgain] = useState(false)

  const resolution = useMemo(
    () => resolvePaymentType(searchParams),
    [searchParams]
  )

  if (reference && status === "failed" && !checkAgain) {
    return (
      <PaymentFailedView
        feeLabel={feeType}
        reference={reference}
        retryHref="/process-admission"
        onCheckAgain={() => setCheckAgain(true)}
      />
    )
  }

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

  switch (resolution.kind) {
    case "application":
      return <VerifyApplication reference={reference} />
    case "acceptance":
      return <VerifyAcceptance reference={reference} />
    case "tuition":
      return <VerifyTuition reference={reference} />
    case "generic":
      return <VerifyGeneric reference={reference} label={resolution.label} />
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
