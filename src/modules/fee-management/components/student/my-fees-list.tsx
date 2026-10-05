"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { AlertCircle, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { QueryErrorState } from "@/components/query-error-state"
import { InvoiceCard } from "./invoice-card"
import { PaymentModal } from "./payment-modal"
import { useMyInvoices, useResolveMyInvoices } from "../../hooks/use-invoices"
import type { InvoiceStatus } from "../../types"

const STATUS_FILTERS: { value: InvoiceStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "PARTIALLY_PAID", label: "Partial" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "PAID", label: "Paid" },
  { value: "WAIVED", label: "Waived" },
  { value: "CANCELLED", label: "Cancelled" },
]

export function MyFeesList() {
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "ALL">("ALL")
  const { data, isLoading, isError, error, refetch } = useMyInvoices()
  // Self-healing resolve check — fires on mount, catches any missing invoices.
  const resolve = useResolveMyInvoices()

  const invoices = data?.data ?? []

  const filtered =
    statusFilter === "ALL"
      ? invoices
      : invoices.filter((inv) => inv.status === statusFilter)

  // Unpaid first, then by due date ascending
  const sorted = [...filtered].sort((a, b) => {
    const unpaidStatuses = ["OVERDUE", "PARTIALLY_PAID", "PENDING"]
    const aUnpaid = unpaidStatuses.includes(a.status)
    const bUnpaid = unpaidStatuses.includes(b.status)
    if (aUnpaid !== bUnpaid) return aUnpaid ? -1 : 1
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full rounded-2xl" />
        ))}
      </div>
    )
  }

  // A refused (403) or failed list request isn't "No invoices yet".
  if (isError) {
    return (
      <QueryErrorState
        error={error}
        subject="your invoices"
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <>
      <div className="space-y-5">
        {/* The resolve check failed, so invoices that should exist may not
            have been generated yet — say so instead of implying none are due. */}
        {resolve.isError && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
          >
            <span className="flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              Couldn&apos;t check for new invoices, so some may be missing
              below.
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={resolve.isPending}
              onClick={() => resolve.mutate()}
            >
              Retry
            </Button>
          </div>
        )}

        {/* ── Status filter tabs ────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(({ value, label }) => {
            const count =
              value === "ALL"
                ? invoices.length
                : invoices.filter((inv) => inv.status === value).length
            if (count === 0 && value !== "ALL") return null
            return (
              <Button
                key={value}
                variant={statusFilter === value ? "default" : "outline"}
                size="sm"
                className="h-8 gap-1.5 rounded-full text-xs"
                onClick={() => setStatusFilter(value)}
              >
                {label}
                <span
                  className={
                    "inline-flex min-w-4.5 items-center justify-center rounded-full px-1.5 text-xs " +
                    (statusFilter === value
                      ? "bg-white/20"
                      : "bg-muted text-muted-foreground")
                  }
                >
                  {count}
                </span>
              </Button>
            )
          })}
        </div>

        {/* ── Invoice cards ─────────────────────────────────────────── */}
        {sorted.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground"
          >
            <Receipt size={40} className="opacity-30" />
            <p className="text-sm">
              {statusFilter === "ALL"
                ? resolve.isError
                  ? "No invoices to show — the check for new invoices didn't complete, so this may not be the full picture."
                  : "No invoices yet. Check back after session fees are published."
                : `No ${statusFilter.toLowerCase().replace("_", " ")} invoices.`}
            </p>
          </motion.div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} />
            ))}
          </div>
        )}
      </div>

      {/* Payment modal — rendered at list level so it survives card re-renders */}
      <PaymentModal />
    </>
  )
}
