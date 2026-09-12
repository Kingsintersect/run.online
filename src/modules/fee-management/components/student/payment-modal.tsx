"use client"

import { useEffect } from "react"
import { useForm, Controller, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import Modal from "@/components/custom/Modal"
import { CurrencyDisplay } from "../shared/currency-display"
import { InitiatePaymentDtoSchema } from "../../schemas/payment.schema"
import { useInitiatePayment } from "../../hooks/use-payment"
import { useFeeType } from "../../hooks/use-fee-types"
import { useFeeManagementUiStore } from "../../store/fee-management-ui.store"
import { useInvoice } from "../../hooks/use-invoices"
import type { InitiatePaymentDto, PaymentMethod } from "../../types"

// Offline bank details — rendered when checkoutUrl is null
const BANK_DETAILS = {
  bankName: "First Bank of Nigeria",
  accountName: "University Bursary Account",
  accountNumber: "2020202020",
  sortCode: "011-2",
  note: "Use your invoice number as the payment narration.",
} as const

const METHOD_LABELS: Record<PaymentMethod, string> = {
  GATEWAY: "Online (Card / Transfer)",
  CARD: "Debit Card",
  USSD: "USSD",
  BANK_TRANSFER: "Bank Transfer (Offline)",
}

export function PaymentModal() {
  const { paymentModalInvoiceId, closePaymentModal } = useFeeManagementUiStore()
  const open = paymentModalInvoiceId !== null

  const { data: invoice } = useInvoice(paymentModalInvoiceId ?? 0)
  const { data: feeType } = useFeeType(invoice?.feeType?.id ?? 0)
  const initiate = useInitiatePayment()

  const outstanding = invoice
    ? Math.max(0, Number(invoice.amount) - Number(invoice.amountPaid))
    : 0

  const allowInstallments = feeType?.allowInstallments ?? false

  // Build schema with dynamic max when installments are allowed
  const schema = allowInstallments
    ? InitiatePaymentDtoSchema.superRefine((data, ctx) => {
        if (data.amount > outstanding) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["amount"],
            message: `Cannot exceed outstanding balance of ₦${outstanding.toLocaleString("en-NG")}`,
          })
        }
      })
    : InitiatePaymentDtoSchema

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<InitiatePaymentDto>({
    // `amount` is `z.coerce.number()` (its raw form input is a string; the
    // resolved output is a number) — the ternary above yields a
    // ZodEffects/ZodObject union whose input/output split TS can't reconcile
    // against useForm<InitiatePaymentDto>'s (output-typed) generic on its
    // own, hence the explicit Resolver<InitiatePaymentDto> annotation here.
    resolver: zodResolver(schema) as Resolver<InitiatePaymentDto>,
    defaultValues: {
      method: "GATEWAY",
    },
  })

  // Pre-fill fixed amount when installments are not allowed
  useEffect(() => {
    if (!allowInstallments && outstanding > 0) {
      setValue("amount", outstanding)
    }
  }, [allowInstallments, outstanding, setValue])

  // Sync invoiceId into form whenever modal opens
  useEffect(() => {
    if (paymentModalInvoiceId) {
      setValue("invoiceId", paymentModalInvoiceId)
    }
  }, [paymentModalInvoiceId, setValue])

  function handleClose() {
    reset()
    initiate.reset()
    closePaymentModal()
  }

  function onSubmit(dto: InitiatePaymentDto) {
    initiate.mutate(dto, {
      onSuccess: (data) => {
        if (data.checkoutUrl) {
          toast.success("Redirecting to payment gateway…")
          // Full navigation — gateway-hosted page
          window.location.href = data.checkoutUrl
        }
        // If checkoutUrl is null, the modal stays open and shows offline instructions
      },
      onError: (err) => {
        // Show inline — do not close modal; student can retry
        toast.error(
          err instanceof Error ? err.message : "Failed to initiate payment"
        )
      },
    })
  }

  // Offline instructions shown after successful initiation with no checkoutUrl
  const offlineData =
    initiate.isSuccess && !initiate.data?.checkoutUrl ? initiate.data : null

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Pay Invoice"
      subtitle={invoice?.feeType?.name ?? ""}
      size="sm"
      footer={
        offlineData ? (
          <Button onClick={handleClose} className="w-full">
            Done — I have the bank details
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={initiate.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              disabled={initiate.isPending}
            >
              {initiate.isPending && (
                <Loader2
                  size={14}
                  className="mr-1.5 animate-spin"
                  data-icon="inline-start"
                />
              )}
              Proceed to Payment
            </Button>
          </>
        )
      }
    >
      {/* ── Offline payment instructions (post-initiation, checkoutUrl null) ── */}
      {offlineData ? (
        <div className="space-y-4">
          <p className="text-sm font-medium text-foreground">
            Bank Transfer Details
          </p>
          <dl className="space-y-2 rounded-xl border border-border bg-muted/40 p-4 text-sm">
            {Object.entries({
              "Bank Name": BANK_DETAILS.bankName,
              "Account Name": BANK_DETAILS.accountName,
              "Account Number": BANK_DETAILS.accountNumber,
              "Sort Code": BANK_DETAILS.sortCode,
              Reference: offlineData.referenceNumber,
            }).map(([label, value]) => (
              <div
                key={label}
                className="flex items-start justify-between gap-3"
              >
                <dt className="shrink-0 text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium break-all">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-muted-foreground">{BANK_DETAILS.note}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Amount summary */}
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Outstanding balance</span>
              <CurrencyDisplay
                amount={outstanding}
                className="font-semibold text-foreground"
              />
            </div>
          </div>

          {/* Amount input — only shown when installments allowed */}
          {allowInstallments ? (
            <div className="space-y-1.5">
              <Label htmlFor="pay-amount">
                Amount to Pay (₦) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                  ₦
                </span>
                <Input
                  id="pay-amount"
                  type="number"
                  min="1"
                  step="0.01"
                  className="pl-7"
                  aria-invalid={!!errors.amount}
                  {...register("amount", { valueAsNumber: true })}
                />
              </div>
              {errors.amount && (
                <p className="text-xs text-destructive">
                  {errors.amount.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Enter any amount up to{" "}
                <CurrencyDisplay
                  amount={outstanding}
                  className="font-medium text-foreground"
                />
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="text-sm font-semibold">
                Full balance —{" "}
                <CurrencyDisplay
                  amount={outstanding}
                  className="text-foreground"
                />
              </p>
              <p className="text-xs text-muted-foreground">
                Partial payment is not enabled for this fee.
              </p>
            </div>
          )}

          <Separator />

          {/* Payment method */}
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Controller
              control={control}
              name="method"
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map(
                    (method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => field.onChange(method)}
                        className={
                          field.value === method
                            ? "rounded-xl border border-primary bg-primary/10 px-3 py-2 text-left text-xs font-medium text-primary"
                            : "rounded-xl border border-border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted"
                        }
                      >
                        {METHOD_LABELS[method]}
                      </button>
                    )
                  )}
                </div>
              )}
            />
            {errors.method && (
              <p className="text-xs text-destructive">
                {errors.method.message}
              </p>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
