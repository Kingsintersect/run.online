"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { KeyRound, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// FCMB's direct-card channel can answer a charge with an OTP challenge
// instead of a checkout link (bruno/fee/Payments - OTP Authenticate.bru /
// - OTP Resend.bru). The OTP length isn't documented, so accept 4–8 digits.
const PaymentOtpSchema = z.object({
  otp: z
    .string()
    .trim()
    .regex(/^\d{4,8}$/, "Enter the 4–8 digit code sent to you"),
})
type PaymentOtpValues = z.infer<typeof PaymentOtpSchema>

interface PaymentOtpFormProps {
  reference: string
  onSubmitOtp: (reference: string, otp: string) => Promise<void>
  onResendOtp: (reference: string) => Promise<void>
  isSubmitting: boolean
  isResending: boolean
  onCancel: () => void
}

export function PaymentOtpForm({
  reference,
  onSubmitOtp,
  onResendOtp,
  isSubmitting,
  isResending,
  onCancel,
}: PaymentOtpFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PaymentOtpValues>({
    resolver: zodResolver(PaymentOtpSchema),
    defaultValues: { otp: "" },
  })

  const onSubmit = async ({ otp }: PaymentOtpValues) => {
    try {
      await onSubmitOtp(reference, otp)
      toast.success("Code accepted. Your payment status is being refreshed.")
      reset()
      onCancel()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "That code was not accepted."
      )
    }
  }

  const resend = async () => {
    try {
      await onResendOtp(reference)
      toast.success("A new code has been sent.")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't resend the code."
      )
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4 dark:border-primary/40 dark:bg-primary/10"
      aria-label="Confirm payment with a one-time code"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <KeyRound size={16} aria-hidden className="text-primary" />
        Enter the one-time code from your bank
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="payment-otp">One-time code</Label>
        <Input
          id="payment-otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={8}
          aria-invalid={!!errors.otp}
          aria-describedby={errors.otp ? "payment-otp-error" : undefined}
          {...register("otp")}
        />
        {errors.otp && (
          <p id="payment-otp-error" className="text-xs text-destructive">
            {errors.otp.message}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting && (
            <Loader2 size={14} className="mr-1.5 animate-spin" aria-hidden />
          )}
          Confirm payment
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={resend}
          disabled={isResending || isSubmitting}
        >
          Resend code
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
