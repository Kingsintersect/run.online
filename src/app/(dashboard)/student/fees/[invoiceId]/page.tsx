"use client"

import { use } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, ShieldOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { InvoiceStatusBadge } from "@/modules/fee-management/components/shared/invoice-status-badge"
import { FeeCategoryBadge } from "@/modules/fee-management/components/shared/fee-category-badge"
import { CurrencyDisplay } from "@/modules/fee-management/components/shared/currency-display"
import { PaymentHistory } from "@/modules/fee-management/components/student/payment-history"
import { PaymentModal } from "@/modules/fee-management/components/student/payment-modal"
import { useInvoice } from "@/modules/fee-management/hooks/use-invoices"
import { useFeeManagementUiStore } from "@/modules/fee-management/store/fee-management-ui.store"
import { useAppStore } from "@/store"
import type { FeeCategory } from "@/modules/fee-management/types"

interface Props {
  params: Promise<{ invoiceId: string }>
}

export default function StudentInvoiceDetailPage({ params }: Props) {
  const { invoiceId } = use(params)
  const id = Number(invoiceId)
  const { data: invoice, isLoading } = useInvoice(id)
  const openPaymentModal = useFeeManagementUiStore((s) => s.openPaymentModal)
  const user = useAppStore((s) => s.user)

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg space-y-5 p-6">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    )
  }

  // Ownership check — show "not found" if invoice belongs to a different user
  if (
    !invoice ||
    (invoice.student && String(invoice.student.id) !== String(user?.id))
  ) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <ShieldOff size={40} className="opacity-40" />
        <p className="text-sm">Invoice not found.</p>
        <Link href="/student/fees">
          <Button variant="outline" size="sm">
            Back to My Fees
          </Button>
        </Link>
      </div>
    )
  }

  const outstanding = Math.max(
    0,
    Number(invoice.amount) - Number(invoice.amountPaid)
  )
  const isPayable = !["PAID", "WAIVED", "CANCELLED"].includes(invoice.status)

  return (
    <>
      <div className="mx-auto max-w-lg space-y-6 p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <Link href="/student/fees">
            <Button variant="ghost" size="icon" aria-label="Back to My Fees">
              <ArrowLeft size={16} />
            </Button>
          </Link>
          <div className="min-w-0">
            <p className="font-mono text-xs text-muted-foreground">
              {invoice.invoiceNumber}
            </p>
            <h1 className="truncate text-base font-semibold text-foreground">
              {invoice.feeType.name}
            </h1>
          </div>
        </motion.div>

        {/* Invoice summary card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="space-y-4 rounded-2xl border border-border bg-card p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <FeeCategoryBadge
                category={invoice.feeType.category as FeeCategory}
              />
              {invoice.session && (
                <span className="self-center text-xs text-muted-foreground">
                  {invoice.session.name}
                </span>
              )}
            </div>
            <InvoiceStatusBadge status={invoice.status} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <CurrencyDisplay
                amount={invoice.amount}
                className="mt-0.5 block text-sm font-semibold text-foreground"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Paid</p>
              <CurrencyDisplay
                amount={invoice.amountPaid}
                className="mt-0.5 block text-sm font-semibold text-green-600 dark:text-green-400"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Outstanding</p>
              <CurrencyDisplay
                amount={outstanding}
                className={
                  "mt-0.5 block text-sm font-semibold " +
                  (outstanding > 0
                    ? "text-destructive"
                    : "text-muted-foreground")
                }
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Due{" "}
              {new Date(invoice.dueDate).toLocaleDateString("en-NG", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
            {isPayable && (
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => openPaymentModal(invoice.id)}
              >
                Pay Now
              </Button>
            )}
          </div>
        </motion.div>

        {/* Payment history */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="rounded-2xl border border-border bg-card p-5"
        >
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            Payment History
          </h2>
          <PaymentHistory
            invoiceId={invoice.id}
            invoiceNumber={invoice.invoiceNumber}
            feeTypeName={invoice.feeType.name}
          />
        </motion.div>
      </div>

      <PaymentModal />
    </>
  )
}
