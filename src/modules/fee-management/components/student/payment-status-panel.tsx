"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  RefreshCw,
  RotateCcw,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CurrencyDisplay } from "../shared/currency-display"
import { InvoiceStatusBadge } from "../shared/invoice-status-badge"
import { useVerifyPayment } from "../../hooks/use-payment"
import type { PaymentReturnStatus } from "../../lib/payment-return"

interface PaymentStatusPanelProps {
  /** Payment reference from the return URL's `reference` param */
  reference: string | null
  /**
   * The backend's verdict from the return URL's `status` param (B30 item 3).
   * null when absent (a legacy direct-from-gateway landing).
   */
  returnStatus?: PaymentReturnStatus | null
}

export function PaymentStatusPanel({
  reference,
  returnStatus = null,
}: PaymentStatusPanelProps) {
  const verify = useVerifyPayment()
  const hasFired = useRef(false)
  // `status=failed`: the backend already re-verified and the payment didn't
  // go through, so skip the verify call unless the payer asks to check again.
  const [checkAgain, setCheckAgain] = useState(false)
  const skipVerify = returnStatus === "failed" && !checkAgain

  // Fire verification exactly once — never based on redirect params alone
  useEffect(() => {
    if (reference && !skipVerify && !hasFired.current) {
      hasFired.current = true
      verify.mutate(reference)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipVerify])

  // Missing reference
  if (!reference) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <AlertTriangle size={36} className="opacity-40" />
        <p className="text-sm">No payment reference found in URL.</p>
        <Link href="/student/fees">
          <Button variant="outline" size="sm">
            Back to My Fees
          </Button>
        </Link>
      </div>
    )
  }

  // The backend reported the payment as failed on the return URL
  if (skipVerify) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        role="alert"
        className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-16 text-center"
      >
        <div className="flex size-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <XCircle size={32} className="text-destructive" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            Payment Not Completed
          </h2>
          <p className="text-sm text-muted-foreground">
            The payment gateway didn&apos;t confirm this payment, so nothing has
            been applied to your invoice. You can pay again from My Fees.
          </p>
          <p className="text-xs text-muted-foreground">
            Reference:{" "}
            <span className="font-mono break-all text-foreground">
              {reference}
            </span>
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <Button asChild className="flex-1 gap-1.5">
            <Link href="/student/fees">
              <RotateCcw size={13} aria-hidden="true" />
              Pay again
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-1.5"
            onClick={() => setCheckAgain(true)}
          >
            <RefreshCw size={13} aria-hidden="true" />I was charged: check again
          </Button>
        </div>
      </motion.div>
    )
  }

  // Verifying
  if (verify.isPending || verify.isIdle) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center gap-4 py-24 text-muted-foreground"
      >
        <Loader2 size={36} className="animate-spin text-primary" />
        <p className="text-sm font-medium">Confirming your payment…</p>
        <p className="max-w-xs text-center text-xs">
          Please wait — we are verifying your payment with the gateway.
        </p>
      </motion.div>
    )
  }

  // Success
  if (verify.isSuccess) {
    const { status, invoice } = verify.data
    const isPaid = invoice.status === "PAID"
    const isCompleted = status === "COMPLETED"

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-16 text-center"
      >
        <div
          className={
            "flex size-16 items-center justify-center rounded-full " +
            (isCompleted
              ? "bg-green-100 dark:bg-green-900/30"
              : "bg-yellow-100 dark:bg-yellow-900/30")
          }
        >
          {isCompleted ? (
            <CheckCircle2
              size={32}
              className="text-green-600 dark:text-green-400"
            />
          ) : (
            <AlertTriangle
              size={32}
              className="text-yellow-600 dark:text-yellow-400"
            />
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            {isCompleted ? "Payment Confirmed" : "Payment Pending"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isCompleted
              ? "Your payment has been verified and applied to your invoice."
              : "Your payment was received but is still being processed. Your balance will update shortly."}
          </p>
          {isCompleted && isPaid && (
            <p className="text-xs text-muted-foreground">
              Any results held back for unpaid fees are now released
              automatically.
            </p>
          )}
        </div>

        <div className="w-full space-y-2 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Amount Paid</span>
            <CurrencyDisplay
              amount={invoice.amountPaid}
              className="font-semibold text-green-600 dark:text-green-400"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Invoice Status</span>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
        </div>

        <div className="flex w-full gap-3">
          <Link href="/student/fees" className="flex-1">
            <Button variant="outline" className="w-full gap-1.5">
              <ArrowLeft size={13} />
              My Fees
            </Button>
          </Link>
          {isPaid && (
            <Link href={`/student/fees/${invoice.id}`} className="flex-1">
              <Button className="w-full">View Receipt</Button>
            </Link>
          )}
        </div>
      </motion.div>
    )
  }

  // Failure / error — distinguish definite failure from network/timeout
  const errMsg = verify.error instanceof Error ? verify.error.message : null
  const isDefinitelyFailed =
    verify.isError && errMsg && !errMsg.toLowerCase().includes("timeout")

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-16 text-center"
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <AlertTriangle size={32} className="text-destructive" />
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">
          {isDefinitelyFailed ? "Payment Failed" : "Verification Inconclusive"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isDefinitelyFailed
            ? "Your payment was not completed. You have not been charged."
            : "We're still confirming your payment. If you were charged, your balance will update shortly. Contact support if this doesn't resolve in a few minutes."}
        </p>
      </div>

      <div className="flex w-full gap-3">
        <Button
          variant="outline"
          className="flex-1 gap-1.5"
          onClick={() => {
            hasFired.current = false
            verify.mutate(reference)
          }}
        >
          <RefreshCw size={13} />
          Retry
        </Button>
        <Link href="/student/fees" className="flex-1">
          <Button variant="ghost" className="w-full gap-1.5">
            <ArrowLeft size={13} />
            My Fees
          </Button>
        </Link>
      </div>
    </motion.div>
  )
}
