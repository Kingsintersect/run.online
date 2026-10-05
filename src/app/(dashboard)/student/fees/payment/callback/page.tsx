"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { PaymentStatusPanel } from "@/modules/fee-management/components/student/payment-status-panel"
import { readPaymentReturnParams } from "@/modules/fee-management/lib/payment-return"

function CallbackContent() {
  // The backend's return carries `reference`/`status`/`feeType` (B30 item 3);
  // legacy gateway params are only a commented fallback inside the reader.
  const { reference, status } = readPaymentReturnParams(useSearchParams())
  return (
    <PaymentStatusPanel reference={reference || null} returnStatus={status} />
  )
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  )
}
