"use client"

import { ShieldOff } from "lucide-react"
import { QueryErrorState } from "@/components/query-error-state"
import { getOutOfScopeError } from "../../../lib/payment-ledger"

interface PaymentLedgerErrorProps {
  error: Error | null
  onRetry: () => void
}

/**
 * An OUT_OF_SCOPE 403 explains the major-program scope; every other failure
 * (plain 403, missing route, network) goes through the shared state.
 */
export function PaymentLedgerError({
  error,
  onRetry,
}: PaymentLedgerErrorProps) {
  const outOfScope = getOutOfScopeError(error)

  if (!outOfScope) {
    return (
      <QueryErrorState error={error} subject="payments" onRetry={onRetry} />
    )
  }

  const requested = outOfScope.details?.requestedMajorProgramId ?? null
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-10 text-center text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
    >
      <ShieldOff className="size-6 opacity-80" aria-hidden="true" />
      <div className="max-w-md">
        <p className="text-sm font-semibold">
          These payments are outside your major-program scope.
        </p>
        <p className="mt-1 text-xs opacity-80">
          {requested !== null
            ? "The major program you picked isn't one your account is assigned to. "
            : "Your account isn't assigned to the major program these payments belong to. "}
          Choose another major program, or ask an administrator to extend your
          scope.
        </p>
      </div>
    </div>
  )
}
