"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { InvoiceCard } from "./invoice-card"
import { PaymentModal } from "./payment-modal"
import { useMyInvoices } from "../../hooks/use-invoices"
import { feeManagementService } from "../../services/fee-management.service"
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
  const { data, isLoading } = useMyInvoices()

  // Self-healing resolve check — fires on mount, catches any missing invoices
  useEffect(() => {
    feeManagementService.resolveInvoices().catch(() => {
      // Silently ignore — resolve is best-effort
    })
  }, [])

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

  return (
    <>
      <div className="space-y-5">
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
                ? "No invoices yet. Check back after session fees are published."
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
