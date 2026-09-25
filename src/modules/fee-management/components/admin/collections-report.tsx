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
import { useSessionOptions } from "@/hooks/use-session-options"
import { CurrencyDisplay } from "../shared/currency-display"
import { useCollectionsSummary } from "../../hooks/use-fee-reports"

// Sentinel for "all sessions" in the select
const ALL = "_ALL_" as const

// Real response per bruno/fee/Reports - Summary.bru is a flat aggregate —
// {invoiceCount, totalInvoiced, totalCollected} — no per-fee-type breakdown
// row, so this renders three summary cards instead of a table. For a
// per-fee-type breakdown, see the Outstanding report (a different,
// already-correct endpoint) elsewhere in this module. See
// sandbox/TRIPLE_AUDIT_2026-09-13.md §1b.
export function CollectionsReport() {
  const [sessionId, setSessionId] = useState<number | undefined>(undefined)

  // Sessions labelled with their major program — identical names otherwise.
  const { options: sessionOptions } = useSessionOptions()
  const { data, isLoading, refetch } = useCollectionsSummary(
    sessionId ? { sessionId } : undefined
  )

  const summary = data?.data
  const totalInvoiced = summary ? Number(summary.totalInvoiced) : 0
  const totalCollected = summary ? Number(summary.totalCollected) : 0
  const totalOutstanding = Math.max(totalInvoiced - totalCollected, 0)
  const collectionRate =
    totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex gap-3">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
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
          <SelectTrigger
            className="h-9 w-full rounded-xl border-transparent bg-muted text-sm sm:w-80"
            aria-label="Academic session"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All sessions</SelectItem>
            {sessionOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
                {o.session.isActive && (
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

      {!summary ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <TrendingUp size={36} className="mb-2 opacity-30" />
          <p className="text-sm">
            No collection data for the selected filters.
          </p>
        </div>
      ) : (
        <>
          {/* ── Summary cards ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                label: "Total Invoiced",
                value: summary.totalInvoiced,
                cls: "text-foreground",
              },
              {
                label: "Total Collected",
                value: summary.totalCollected,
                cls: "text-green-600 dark:text-green-400",
              },
              {
                label: "Outstanding",
                value: totalOutstanding,
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

          {/* ── Collection rate + invoice count ────────────────────── */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Collection Rate</span>
              <span className="font-semibold tabular-nums">
                {collectionRate}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={
                  "h-full rounded-full transition-all duration-500 " +
                  (collectionRate >= 80
                    ? "bg-green-500"
                    : collectionRate >= 50
                      ? "bg-yellow-500"
                      : "bg-destructive")
                }
                style={{ width: `${collectionRate}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {summary.invoiceCount.toLocaleString("en-NG")} invoice
              {summary.invoiceCount === 1 ? "" : "s"} in this selection
            </p>
          </div>
        </>
      )}
    </div>
  )
}
