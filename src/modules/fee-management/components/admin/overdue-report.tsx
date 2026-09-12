"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { InvoiceStatusBadge } from "../shared/invoice-status-badge"
import { FeeCategoryBadge } from "../shared/fee-category-badge"
import { CurrencyDisplay } from "../shared/currency-display"
import { useOverdueInvoices } from "../../hooks/use-invoices"
import type { FeeCategory } from "../../types"

export function OverdueReport() {
  const { data, isLoading, refetch } = useOverdueInvoices()
  const invoices = data?.data ?? []
  // "now" captured once on mount so the render stays pure.
  const [now] = useState(() => Date.now())

  // Aggregate totals from overdue invoices
  const totalOutstanding = invoices.reduce(
    (sum, inv) =>
      sum + Math.max(0, Number(inv.amount) - Number(inv.amountPaid)),
    0
  )
  const totalCount = invoices.length

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex gap-3">
          <Skeleton className="h-9 w-24" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── Controls ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          className="ml-auto h-9 gap-1.5 text-xs"
        >
          <RefreshCw size={13} />
          Refresh
        </Button>
      </div>

      {/* ── Summary banner ─────────────────────────────────────────── */}
      {totalCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/60 p-4 dark:border-red-900/40 dark:bg-red-900/10"
        >
          <AlertTriangle
            size={16}
            className="mt-0.5 shrink-0 text-destructive"
          />
          <div className="text-sm">
            <p className="font-medium text-destructive">
              {totalCount.toLocaleString("en-NG")} overdue invoice
              {totalCount !== 1 ? "s" : ""}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Total outstanding balance:{" "}
              <CurrencyDisplay
                amount={totalOutstanding}
                className="font-semibold text-destructive"
              />
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Overdue table ───────────────────────────────────────────── */}
      {invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <AlertTriangle size={36} className="mb-2 opacity-30" />
          <p className="text-sm">No overdue invoices. All caught up.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-red-200 dark:border-red-900/40">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-900/10">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Invoice
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Student
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                  Fee Type
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Balance
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Due Date
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, idx) => {
                const balance = Math.max(
                  0,
                  Number(inv.amount) - Number(inv.amountPaid)
                )
                const daysOverdue = Math.floor(
                  (now - new Date(inv.dueDate).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
                return (
                  <motion.tr
                    key={inv.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15, delay: idx * 0.02 }}
                    className="border-b border-red-100 transition-colors last:border-0 hover:bg-red-50/40 dark:border-red-900/20 dark:hover:bg-red-900/10"
                  >
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-primary">
                        {inv.invoiceNumber}
                      </p>
                      {daysOverdue > 0 && (
                        <p className="mt-0.5 text-xs text-destructive">
                          {daysOverdue}d overdue
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {inv.student ? (
                        <div>
                          <p className="text-xs font-medium">
                            {inv.student.fullName}
                          </p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {inv.student.matricNumber}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          —
                        </span>
                      )}
                    </td>

                    <td className="hidden px-4 py-3 md:table-cell">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs leading-tight font-medium">
                          {inv.feeType.name}
                        </span>
                        <FeeCategoryBadge
                          category={inv.feeType.category as FeeCategory}
                        />
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right font-semibold text-destructive tabular-nums">
                      <CurrencyDisplay amount={balance} />
                    </td>

                    <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                      {new Date(inv.dueDate).toLocaleDateString("en-NG", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
