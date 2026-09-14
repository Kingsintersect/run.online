"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { CreditCard, ExternalLink, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FEE_CATEGORY_LABELS } from "@/lib/admission-catalog"
import type { PaymentInitiationResponse } from "../../types/admission"
import type {
  ResolvedStageOf,
  StagesSource,
} from "../../types/admission-stages"

interface PaymentStageSectionProps {
  stage: ResolvedStageOf<"PAYMENT">
  source: StagesSource
  onPay: (amount?: number) => Promise<PaymentInitiationResponse>
  isPaying: boolean
}

const formatMoney = (amount: number | null | undefined, currency: string) =>
  amount == null
    ? "—"
    : new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(amount)

/** A PAYMENT stage for any fee — sandbox/dynamic-admission/API_CONTRACTS.md §4. */
export function PaymentStageSection({
  stage,
  source,
  onPay,
  isPaying,
}: PaymentStageSectionProps) {
  const { state, config } = stage
  const currency = state.currency ?? "NGN"
  const balance = state.balance ?? state.amount ?? null
  const minimum = state.minimumPayable ?? balance ?? undefined
  const [amount, setAmount] = useState<string>(
    balance != null ? String(balance) : ""
  )
  const isPaid = stage.status === "COMPLETED"
  const feeLabel = state.feeName ?? FEE_CATEGORY_LABELS[config.feeCategory]

  const handlePay = async () => {
    const value = config.allowInstallments ? Number(amount) : undefined
    if (
      config.allowInstallments &&
      (!value || (minimum !== undefined && value < minimum))
    ) {
      toast.error(`Enter at least ${formatMoney(minimum, currency)}.`)
      return
    }
    try {
      const result = await onPay(value)
      if (result.gateway_url) {
        toast.success("Redirecting to payment gateway…")
        setTimeout(() => {
          window.location.href = result.gateway_url
        }, 800)
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to initiate payment. Please try again."
      )
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Card className="relative overflow-hidden border-border/50 shadow-lg">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 dark:bg-primary/20">
              <CreditCard className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{stage.label}</CardTitle>
              <CardDescription>{stage.description || feeLabel}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {source === "fallback" ? (
            <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-foreground dark:bg-amber-500/10">
              Payment for the {feeLabel.toLowerCase()} isn&apos;t open online
              yet. You can continue with the rest of your admission in the
              meantime.
            </p>
          ) : (
            <>
              <dl className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Fee", formatMoney(state.amount, currency)],
                  ["Paid", formatMoney(state.amountPaid, currency)],
                  ["Balance", formatMoney(balance, currency)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-border p-3"
                  >
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="text-base font-semibold text-foreground">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>

              {isPaid ? (
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  Paid in full — you can continue.
                </p>
              ) : (
                <>
                  {config.allowInstallments && (
                    <div className="space-y-1.5">
                      <Label htmlFor={`pay-${stage.key}`}>
                        Amount to pay now
                      </Label>
                      <Input
                        id={`pay-${stage.key}`}
                        type="number"
                        min={minimum}
                        max={balance ?? undefined}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        At least {formatMoney(minimum, currency)}
                        {balance != null
                          ? `, up to ${formatMoney(balance, currency)}`
                          : ""}
                        .
                      </p>
                    </div>
                  )}
                  <Button
                    onClick={handlePay}
                    disabled={isPaying}
                    className="btn-glow w-full gap-2"
                    size="lg"
                  >
                    {isPaying ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Processing…
                      </>
                    ) : (
                      <>
                        Pay now
                        <ExternalLink className="size-4" />
                      </>
                    )}
                  </Button>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
