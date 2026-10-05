"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadgeWidget } from "./StatusBadgeWidget"
import {
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  XCircle,
  ArrowRight,
} from "lucide-react"
import { PaymentFailedView } from "./PaymentFailedView"
import type { PaymentVerificationResponse } from "../types/admission"

interface PaymentVerificationViewProps {
  /** Page title shown at the top */
  title: string
  /** Whether the verification query is still loading */
  isLoading: boolean
  /** Error from the query */
  error: Error | null
  /** The verification result */
  data?: PaymentVerificationResponse
  /** Where to redirect after success */
  redirectTo: string
  /** Auto-redirect countdown in seconds */
  countdownSeconds?: number
  /** Fee label for the failed view (e.g. "Application Fee"); may be empty. */
  feeLabel?: string
  /** Re-run the verify call (failed / still-pending results). */
  onCheckAgain?: () => void
  /** True while a re-check is in flight. */
  isCheckingAgain?: boolean
}

export function PaymentVerificationView({
  title,
  isLoading,
  error,
  data,
  redirectTo,
  countdownSeconds = 10,
  feeLabel = "",
  onCheckAgain,
  isCheckingAgain = false,
}: PaymentVerificationViewProps) {
  const router = useRouter()
  const [countdown, setCountdown] = useState(countdownSeconds)

  const handleRedirect = useCallback(() => {
    router.push(redirectTo)
  }, [router, redirectTo])

  /* Auto-redirect countdown */
  useEffect(() => {
    if (!data?.success) return

    if (countdown <= 0) {
      handleRedirect()
      return
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [data?.success, countdown, handleRedirect])

  // Found 2026-10-05 in a live test: a FAILED/PENDING verify result
  // ({success: false, status: "failed" | "pending"}) matched none of the
  // loading/error/success branches below, leaving only the heading on
  // screen forever. A gateway-confirmed failure reuses the same failed
  // view the return-URL `status=failed` path shows; "pending" gets its
  // own honest still-processing state below. Any other non-success status
  // is treated as not completed too, never as a blank card.
  const isPending =
    !isLoading && !error && !!data && !data.success && data.status === "pending"
  if (!isLoading && !error && data && !data.success && !isPending) {
    return (
      <PaymentFailedView
        feeLabel={feeLabel}
        reference={data.reference}
        retryHref={redirectTo}
        onCheckAgain={onCheckAgain ?? (() => router.refresh())}
      />
    )
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="relative overflow-hidden border-border/50 shadow-xl">
          {/* Top gradient */}
          <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary/60 via-primary to-primary/60" />

          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold">{title}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <AnimatePresence mode="wait">
              {/* LOADING STATE */}
              {isLoading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4 py-8"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <Loader2 className="size-12 text-primary" />
                  </motion.div>
                  <p className="text-sm text-muted-foreground">
                    Verifying your payment with the gateway…
                  </p>
                  <div className="w-full space-y-2">
                    <Skeleton className="mx-auto h-4 w-3/4" />
                    <Skeleton className="mx-auto h-4 w-1/2" />
                  </div>
                </motion.div>
              )}

              {/* ERROR STATE */}
              {!isLoading && error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4 py-8"
                >
                  <div className="rounded-full bg-destructive/10 p-4">
                    <XCircle className="size-10 text-destructive" />
                  </div>
                  <p className="text-center text-sm font-medium text-destructive">
                    {error.message || "Verification failed. Please try again."}
                  </p>
                  <Button variant="outline" onClick={handleRedirect}>
                    Go Back & Retry
                  </Button>
                </motion.div>
              )}

              {/* PENDING STATE: the gateway hasn't confirmed either way yet */}
              {isPending && data && (
                <motion.div
                  key="pending"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  role="status"
                  className="flex flex-col items-center gap-4 py-6 text-center"
                >
                  <div className="rounded-full bg-amber-500/10 p-4 dark:bg-amber-500/20">
                    <Clock
                      className="size-10 text-amber-600 dark:text-amber-400"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-foreground">
                      Payment still processing
                    </p>
                    <p className="text-sm text-muted-foreground">
                      The gateway hasn&apos;t confirmed this payment yet, so
                      nothing has been applied to your fees. Check again in a
                      minute.
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Reference:{" "}
                    <span className="font-mono break-all">
                      {data.reference}
                    </span>
                  </p>
                  <div className="flex w-full flex-col gap-2 sm:flex-row">
                    {onCheckAgain && (
                      <Button
                        type="button"
                        className="flex-1 gap-2"
                        onClick={onCheckAgain}
                        disabled={isCheckingAgain}
                      >
                        {isCheckingAgain ? (
                          <Loader2
                            className="size-4 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <RefreshCw className="size-4" aria-hidden="true" />
                        )}
                        {isCheckingAgain ? "Checking..." : "Check again"}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={handleRedirect}
                    >
                      Back to Admission Process
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* SUCCESS STATE */}
              {!isLoading && data?.success && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-5 py-6"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 12,
                      delay: 0.2,
                    }}
                    className="rounded-full bg-emerald-500/10 p-5 dark:bg-emerald-500/20"
                  >
                    <CheckCircle className="size-12 text-emerald-500" />
                  </motion.div>

                  <div className="space-y-2 text-center">
                    <p className="text-lg font-semibold text-foreground">
                      Payment Verified!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Reference:{" "}
                      <span className="font-mono">{data.reference}</span>
                    </p>
                    <StatusBadgeWidget
                      label={`₦${data.amount.toLocaleString()} — Confirmed`}
                      status="success"
                    />
                  </div>

                  {/* Countdown */}
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-xs text-muted-foreground">
                      Redirecting in{" "}
                      <span className="font-bold text-primary tabular-nums">
                        {countdown}s
                      </span>
                    </p>

                    {/* Progress ring */}
                    <svg className="size-10" viewBox="0 0 40 40">
                      <circle
                        cx="20"
                        cy="20"
                        r="16"
                        fill="none"
                        strokeWidth="3"
                        className="stroke-muted"
                      />
                      <motion.circle
                        cx="20"
                        cy="20"
                        r="16"
                        fill="none"
                        strokeWidth="3"
                        className="stroke-primary"
                        strokeLinecap="round"
                        strokeDasharray={100}
                        initial={{ strokeDashoffset: 0 }}
                        animate={{
                          strokeDashoffset:
                            100 - (countdown / countdownSeconds) * 100,
                        }}
                        transition={{ duration: 1, ease: "linear" }}
                        transform="rotate(-90 20 20)"
                      />
                    </svg>

                    <Button
                      onClick={handleRedirect}
                      className="btn-glow gap-2"
                      size="lg"
                    >
                      Continue Now
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
