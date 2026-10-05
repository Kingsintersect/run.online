"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { RefreshCw, RotateCcw, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface PaymentFailedViewProps {
  /** Fee label echoed by the backend (e.g. "Application Fee"); may be empty. */
  feeLabel: string
  reference: string
  /** Where the applicant starts the payment again. */
  retryHref: string
  /** Re-run the verify call, for someone who was charged anyway. */
  onCheckAgain: () => void
}

/**
 * The backend already re-verified this payment with the gateway and
 * reported `status=failed` on the return URL, so no verify spinner is shown.
 */
export function PaymentFailedView({
  feeLabel,
  reference,
  retryHref,
  onCheckAgain,
}: PaymentFailedViewProps) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="relative overflow-hidden border-border/50 shadow-xl">
          <div className="absolute inset-x-0 top-0 h-1 bg-destructive/70" />
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold">
              {feeLabel
                ? `${feeLabel} payment not completed`
                : "Payment not completed"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              role="alert"
              className="flex flex-col items-center gap-4 py-4 text-center"
            >
              <div className="rounded-full bg-destructive/10 p-4 dark:bg-destructive/20">
                <XCircle
                  className="size-10 text-destructive"
                  aria-hidden="true"
                />
              </div>
              <p className="text-sm text-foreground">
                The payment gateway didn&apos;t confirm this payment, so nothing
                has been applied to your fees. You can start the payment again.
              </p>
              <p className="text-xs text-muted-foreground">
                Reference:{" "}
                <span className="font-mono break-all">{reference}</span>
              </p>
              <div className="flex w-full flex-col gap-2 sm:flex-row">
                <Button asChild className="flex-1 gap-2">
                  <Link href={retryHref}>
                    <RotateCcw className="size-4" aria-hidden="true" />
                    Try the payment again
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={onCheckAgain}
                >
                  <RefreshCw className="size-4" aria-hidden="true" />I was
                  charged: check again
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                If money left your account, keep the reference above and contact
                the bursary if it isn&apos;t confirmed within a few minutes.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
