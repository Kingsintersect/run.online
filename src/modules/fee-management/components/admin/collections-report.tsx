"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { RefreshCw, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAcademicSessions } from "@/hooks/useAcademicSessions"
import { FeeCategoryBadge } from "../shared/fee-category-badge"
import { CurrencyDisplay } from "../shared/currency-display"
import { useCollectionsSummary } from "../../hooks/use-fee-reports"
import type { FeeCategory } from "../../types"

// Sentinel for "all sessions" in the select
const ALL = "_ALL_" as const

export function CollectionsReport() {
  const [sessionId, setSessionId] = useState<number | undefined>(undefined)

  const { data: sessions } = useAcademicSessions()
  const { data, isLoading, refetch } = useCollectionsSummary(
    sessionId ? { sessionId } : undefined
  )

  const rows = data?.data ?? []
  const totals = data?.totals

  // Compute collection rate for each row
  function collectionRate(paid: string, invoiced: string) {
    const p = Number(paid)
    const i = Number(invoiced)
    return i > 0 ? Math.round((p / i) * 100) : 0
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex gap-3">
          <Skeleton className="h-9 w-44" />
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
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={sessionId?.toString() ?? ALL}
          onValueChange={(v) => setSessionId(v === ALL ? undefined : Number(v))}
        >
          <SelectTrigger className="h-9 w-52 rounded-xl border-transparent bg-muted text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All sessions</SelectItem>
            {sessions?.map((s) => (
              <SelectItem key={s.id} value={s.id.toString()}>
                {s.name}
                {s.isActive && (
                  <span className="ml-1.5 text-xs text-green-600 dark:text-green-400">
                    (Active)
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          className="h-9 gap-1.5 text-xs"
        >
          <RefreshCw size={13} />
          Refresh
        </Button>
      </div>

      {/* ── Totals summary cards ────────────────────────────────────── */}
      {totals && (
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Total Invoiced",
              value: totals.totalInvoiced,
              cls: "text-foreground",
            },
            {
              label: "Total Collected",
              value: totals.totalPaid,
              cls: "text-green-600 dark:text-green-400",
            },
            {
              label: "Outstanding",
              value: totals.totalOutstanding,
              cls: "text-destructive",
            },
          ].map(({ label, value, cls }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card p-4"
            >
              <p className="text-xs text-muted-foreground">{label}</p>
              <CurrencyDisplay
                amount={value}
                className={`mt-1 block text-lg font-semibold ${cls}`}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Collections table ───────────────────────────────────────── */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <TrendingUp size={36} className="mb-2 opacity-30" />
          <p className="text-sm">
            No collection data for the selected filters.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Fee Type
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">
                  Session
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Invoiced
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Collected
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Outstanding
                </th>
                <th className="hidden px-4 py-3 text-right font-medium text-muted-foreground md:table-cell">
                  Count
                </th>
                <th className="w-36 px-4 py-3 text-center font-medium text-muted-foreground">
                  Collection Rate
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const rate = collectionRate(row.totalPaid, row.totalInvoiced)
                return (
                  <motion.tr
                    key={row.feeTypeId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15, delay: idx * 0.025 }}
                    className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.feeTypeName}</p>
                      <FeeCategoryBadge
                        category={row.category as FeeCategory}
                        className="mt-1"
                      />
                    </td>

                    <td className="hidden px-4 py-3 text-xs text-muted-foreground sm:table-cell">
                      {row.session?.name ?? "—"}
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums">
                      <CurrencyDisplay amount={row.totalInvoiced} />
                    </td>

                    <td className="px-4 py-3 text-right font-medium text-green-600 tabular-nums dark:text-green-400">
                      <CurrencyDisplay amount={row.totalPaid} />
                    </td>

                    <td className="px-4 py-3 text-right font-medium text-destructive tabular-nums">
                      <CurrencyDisplay amount={row.totalOutstanding} />
                    </td>

                    <td className="hidden px-4 py-3 text-right text-xs text-muted-foreground md:table-cell">
                      {row.paidCount.toLocaleString("en-NG")}&nbsp;/&nbsp;
                      {row.invoiceCount.toLocaleString("en-NG")}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-medium tabular-nums">
                          {rate}%
                        </span>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={
                              "h-full rounded-full transition-all duration-500 " +
                              (rate >= 80
                                ? "bg-green-500"
                                : rate >= 50
                                  ? "bg-yellow-500"
                                  : "bg-destructive")
                            }
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>

            {/* Totals footer */}
            {totals && (
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30">
                  <td
                    className="px-4 py-3 text-sm font-semibold text-foreground"
                    colSpan={2}
                  >
                    Total
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    <CurrencyDisplay amount={totals.totalInvoiced} />
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-green-600 tabular-nums dark:text-green-400">
                    <CurrencyDisplay amount={totals.totalPaid} />
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-destructive tabular-nums">
                    <CurrencyDisplay amount={totals.totalOutstanding} />
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell" colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  )
}
