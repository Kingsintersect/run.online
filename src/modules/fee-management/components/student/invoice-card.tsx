"use client"

import { motion } from "framer-motion"
import { AlertTriangle, CreditCard, History } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { InvoiceStatusBadge } from "../shared/invoice-status-badge"
import { FeeCategoryBadge } from "../shared/fee-category-badge"
import { CurrencyDisplay } from "../shared/currency-display"
import { useFeeManagementUiStore } from "../../store/fee-management-ui.store"
import type { InvoiceResponse, FeeCategory } from "../../types"

// Statuses where paying is not applicable
const NON_PAYABLE = new Set(["PAID", "WAIVED", "CANCELLED"] as const)

interface InvoiceCardProps {
  invoice: InvoiceResponse
}

export function InvoiceCard({ invoice }: InvoiceCardProps) {
  const openPaymentModal = useFeeManagementUiStore((s) => s.openPaymentModal)

  const outstanding = Math.max(
    0,
    Number(invoice.amount) - Number(invoice.amountPaid)
  )
  const isPayable = !NON_PAYABLE.has(
    invoice.status as "PAID" | "WAIVED" | "CANCELLED"
  )
  const isOverdue = invoice.status === "OVERDUE"
  const isPartial = invoice.status === "PARTIALLY_PAID"

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={
        "relative overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md " +
        (isOverdue ? "border-red-200 dark:border-red-900/40" : "border-border")
      }
    >
      {/* Overdue accent bar */}
      {isOverdue && (
        <div className="absolute top-0 left-0 h-full w-1 bg-destructive" />
      )}

      <div className={isOverdue ? "pl-4" : ""}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="min-w-0">
            <p className="truncate leading-snug font-semibold text-foreground">
              {invoice.feeType.name}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <FeeCategoryBadge
                category={invoice.feeType.category as FeeCategory}
              />
              {invoice.session && (
                <span className="text-xs text-muted-foreground">
                  {invoice.session.name}
                </span>
              )}
            </div>
          </div>
          <InvoiceStatusBadge status={invoice.status} />
        </div>

        <Separator className="mx-5 my-4" />

        {/* Amount breakdown */}
        <div className="grid grid-cols-3 gap-3 px-5">
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
            <p className="text-xs text-muted-foreground">
              {invoice.status === "PAID" ? "Balance" : "Outstanding"}
            </p>
            <CurrencyDisplay
              amount={outstanding}
              className={
                "mt-0.5 block text-sm font-semibold " +
                (outstanding > 0 ? "text-destructive" : "text-muted-foreground")
              }
            />
          </div>
        </div>

        {/* Partial-pay progress bar */}
        {isPartial && (
          <div className="mx-5 mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-700"
                style={{
                  width: `${Math.min(
                    100,
                    (Number(invoice.amountPaid) / Number(invoice.amount)) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Overdue warning */}
        {isOverdue && (
          <div className="mx-5 mt-3 flex items-center gap-1.5 text-xs text-destructive">
            <AlertTriangle size={12} />
            Overdue — please pay as soon as possible
          </div>
        )}

        {/* Due date + actions */}
        <div className="mt-2 flex items-center justify-between gap-3 px-5 py-4">
          <p className="text-xs text-muted-foreground">
            Due{" "}
            {new Date(invoice.dueDate).toLocaleDateString("en-NG", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>

          <div className="flex items-center gap-2">
            <Link href={`/student/fees/${invoice.id}`}>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                <History size={12} />
                History
              </Button>
            </Link>

            {isPayable && (
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => openPaymentModal(invoice.id)}
              >
                <CreditCard size={12} />
                Pay{outstanding > 0 && ` — `}
                {outstanding > 0 && (
                  <CurrencyDisplay
                    amount={outstanding}
                    className="font-semibold"
                  />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
