"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { PaymentStatusPanel } from "@/modules/fee-management/components/student/payment-status-panel"

function CallbackContent() {
  const reference = useSearchParams().get("reference")
  return <PaymentStatusPanel reference={reference} />
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
