"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { CheckCircle, CreditCard, ExternalLink, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FEE_CATEGORY_LABELS } from "@/lib/admission-catalog"
import { cn } from "@/lib/utils"
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

type PaymentPlan = "full" | "half" | "custom"

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
  const amountPaid = state.amountPaid ?? 0
  const balance = state.balance ?? state.amount ?? 0
  const minimum = state.minimumPayable ?? balance
  const isPaid = stage.status === "COMPLETED"
  const isPartiallyPaid =
    config.allowInstallments && amountPaid > 0 && balance > 0
  const feeLabel = state.feeName ?? FEE_CATEGORY_LABELS[config.feeCategory]

  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan>("half")
  const [customAmount, setCustomAmount] = useState<string>("")

  const paymentPlans = [
    {
      id: "full" as const,
      label: "Full Payment",
      description: "Pay the entire balance at once",
      amount: balance,
    },
    {
      id: "half" as const,
      label: "Half Payment",
      description: "Pay the minimum now, complete later",
      amount: minimum,
    },
    {
      id: "custom" as const,
      label: "Custom Amount",
      description: `Min ${formatMoney(minimum, currency)}`,
      amount: null,
    },
  ]

  const getInstallmentAmount = (): number => {
    switch (selectedPlan) {
      case "full":
        return balance
      case "half":
        return minimum
      case "custom": {
        const parsed = parseInt(customAmount.replace(/,/g, ""), 10)
        return isNaN(parsed) ? 0 : parsed
      }
    }
  }

  const installmentAmount = getInstallmentAmount()
  const isValidInstallment =
    installmentAmount >= minimum && installmentAmount <= balance

  const handlePay = async () => {
    // Not an installment-eligible fee — always pay the full amount.
    if (!config.allowInstallments) {
      try {
        const result = await onPay(undefined)
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
      return
    }

    // Already made a partial payment — only the remaining balance is offered.
    const value = isPartiallyPaid ? balance : installmentAmount
    if (!value || value < minimum || value > balance) {
      toast.error(
        `Amount must be between ${formatMoney(minimum, currency)} and ${formatMoney(balance, currency)}.`
      )
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
                  {config.allowInstallments && !isPartiallyPaid && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground">
                        Choose a payment plan
                      </p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {paymentPlans.map((plan) => (
                          <button
                            key={plan.id}
                            type="button"
                            onClick={() => setSelectedPlan(plan.id)}
                            className={cn(
                              "relative flex flex-col items-start rounded-xl border p-3 text-left transition-all",
                              selectedPlan === plan.id
                                ? "border-primary bg-primary/5 ring-1 ring-primary/30 dark:bg-primary/10"
                                : "border-border hover:border-primary/30 hover:bg-muted/30"
                            )}
                          >
                            <div className="mb-2 flex w-full items-center justify-between">
                              <span className="text-xs font-semibold text-foreground">
                                {plan.label}
                              </span>
                              <div
                                className={cn(
                                  "flex size-4 items-center justify-center rounded-full border-2 transition-colors",
                                  selectedPlan === plan.id
                                    ? "border-primary bg-primary"
                                    : "border-muted-foreground/40"
                                )}
                              >
                                {selectedPlan === plan.id && (
                                  <CheckCircle className="size-3 text-primary-foreground" />
                                )}
                              </div>
                            </div>
                            <p className="text-[10px] leading-relaxed text-muted-foreground">
                              {plan.description}
                            </p>
                            {plan.amount !== null && (
                              <p className="mt-1 text-sm font-bold text-foreground tabular-nums">
                                {formatMoney(plan.amount, currency)}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>

                      {selectedPlan === "custom" && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">
                            Enter amount (min {formatMoney(minimum, currency)})
                          </label>
                          <div className="relative">
                            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                              ₦
                            </span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={customAmount}
                              onChange={(e) => {
                                const raw = e.target.value.replace(
                                  /[^0-9]/g,
                                  ""
                                )
                                setCustomAmount(
                                  raw ? parseInt(raw, 10).toLocaleString() : ""
                                )
                              }}
                              placeholder={minimum.toLocaleString()}
                              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 pl-7 text-sm font-medium text-foreground tabular-nums ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            />
                          </div>
                          {customAmount && !isValidInstallment && (
                            <p className="text-[10px] text-destructive">
                              Amount must be between{" "}
                              {formatMoney(minimum, currency)} and{" "}
                              {formatMoney(balance, currency)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {isPartiallyPaid && (
                    <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-foreground dark:bg-amber-500/10">
                      You have a remaining balance of{" "}
                      <span className="font-semibold">
                        {formatMoney(balance, currency)}
                      </span>
                      . Complete this payment to continue.
                    </p>
                  )}

                  <Button
                    onClick={handlePay}
                    disabled={
                      isPaying ||
                      (config.allowInstallments &&
                        !isPartiallyPaid &&
                        !isValidInstallment)
                    }
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
                        {config.allowInstallments
                          ? `Pay ${formatMoney(isPartiallyPaid ? balance : installmentAmount, currency)} Now`
                          : "Pay now"}
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
