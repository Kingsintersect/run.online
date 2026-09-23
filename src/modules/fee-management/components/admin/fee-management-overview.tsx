"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  FileText,
  Tags,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { FeeCategoryBadge } from "../shared/fee-category-badge"
import { CurrencyDisplay } from "../shared/currency-display"
import { useCollectionsSummary } from "../../hooks/use-fee-reports"
import { useOverdueInvoices } from "../../hooks/use-invoices"
import { useFeeTypes } from "../../hooks/use-fee-types"

function navTiles(basePath: string) {
  return [
    {
      href: `${basePath}/types`,
      icon: Tags,
      title: "Fee Types",
      description: "Define, activate, and monitor fee structures",
      accent: "bg-primary/10 text-primary",
    },
    {
      href: `${basePath}/invoices`,
      icon: FileText,
      title: "Invoices",
      description: "View, waive, or cancel student invoices",
      accent:
        "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    },
    {
      href: `${basePath}/reports/collections`,
      icon: BarChart3,
      title: "Collections Report",
      description: "Revenue collected vs. invoiced by fee type",
      accent:
        "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    },
    {
      href: `${basePath}/reports/overdue`,
      icon: AlertTriangle,
      title: "Overdue Report",
      description: "Students past their payment deadline",
      accent: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    },
  ] as const
}

interface FeeManagementOverviewProps {
  // Lets this same component be mounted under both /admin/finance/fees and
  // /manager/finance/fees without its internal links pointing at the wrong
  // role's route tree.
  basePath?: string
}

export function FeeManagementOverview({
  basePath = "/admin/finance/fees",
}: FeeManagementOverviewProps = {}) {
  const NAV_TILES = navTiles(basePath)
  // Confirmed fixed live 2026-09-22 (BACKEND_DEVIATIONS_2026-09-14.md A37):
  // GET /fees/reports/summary and /fees/invoices/overdue now return 200 for
  // BURSARY, DIRECTOR, and DEAN — the backend's role allow-list was
  // replaced with a permission check. The role-based gate this component
  // used to degrade to an "Unavailable" stat for those roles is removed.
  const { data: summary, isLoading: loadingSummary } =
    useCollectionsSummary(undefined)
  const { data: overdueData, isLoading: loadingOverdue } =
    useOverdueInvoices(undefined)
  const { data: activeFeeTypes, isLoading: loadingFeeTypes } = useFeeTypes({
    isActive: true,
  })

  // Real response per bruno/fee/Reports - Summary.bru is a flat aggregate,
  // not a `.totals` wrapper — see sandbox/TRIPLE_AUDIT_2026-09-13.md §1b.
  const summaryData = summary?.data
  const totalOutstanding = summaryData
    ? Math.max(
        Number(summaryData.totalInvoiced) - Number(summaryData.totalCollected),
        0
      )
    : undefined
  const overdueCount = overdueData?.data.length ?? 0
  const activeFeeTypeCount = activeFeeTypes?.length ?? 0

  const statCards = [
    {
      label: "Total Invoiced",
      value: summaryData ? (
        <CurrencyDisplay
          amount={summaryData.totalInvoiced}
          className="text-xl font-bold text-foreground"
        />
      ) : null,
      loading: loadingSummary,
      accent: "border-border",
    },
    {
      label: "Collected",
      value: summaryData ? (
        <CurrencyDisplay
          amount={summaryData.totalCollected}
          className="text-xl font-bold text-green-600 dark:text-green-400"
        />
      ) : null,
      loading: loadingSummary,
      accent: "border-green-200 dark:border-green-900/40",
    },
    {
      label: "Outstanding",
      value:
        totalOutstanding !== undefined ? (
          <CurrencyDisplay
            amount={totalOutstanding}
            className="text-xl font-bold text-destructive"
          />
        ) : null,
      loading: loadingSummary,
      accent: "border-red-200 dark:border-red-900/40",
    },
    {
      label: "Overdue Invoices",
      value: (
        <span
          className={
            "text-xl font-bold " +
            (overdueCount > 0 ? "text-destructive" : "text-muted-foreground")
          }
        >
          {overdueCount.toLocaleString("en-NG")}
        </span>
      ),
      loading: loadingOverdue,
      accent:
        overdueCount > 0
          ? "border-red-200 dark:border-red-900/40"
          : "border-border",
    },
  ]

  return (
    <PermissionGate
      require={{ resource: "fee-management", action: "view" }}
      denyBehavior="screen"
    >
      <div className="space-y-8 p-6">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-start justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <TrendingUp size={18} className="text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                Fee Management
              </h1>
              <p className="text-sm text-muted-foreground">
                Overview of fee structures, invoices, and collections.
              </p>
            </div>
          </div>
          <PermissionGate
            require={{ resource: "fee-management", action: "manage" }}
          >
            <Link href={`${basePath}/types/new`}>
              <Button size="sm" className="gap-1.5">
                <Tags size={13} />
                New Fee Type
              </Button>
            </Link>
          </PermissionGate>
        </motion.div>

        {/* ── Stat cards ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {statCards.map(({ label, value, loading, accent }, idx) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 + idx * 0.04 }}
              className={`space-y-1 rounded-xl border bg-card p-4 ${accent}`}
            >
              <p className="text-xs text-muted-foreground">{label}</p>
              {loading ? <Skeleton className="h-7 w-28" /> : value}
            </motion.div>
          ))}
        </motion.div>

        {/* ── Navigation tiles ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Sections
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {NAV_TILES.map(
              ({ href, icon: Icon, title, description, accent }, idx) => (
                <motion.div
                  key={href}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + idx * 0.04 }}
                >
                  <Link href={href} className="group block">
                    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm">
                      <div
                        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${accent}`}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                          {title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {description}
                        </p>
                      </div>
                      <ArrowRight
                        size={15}
                        className="shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary"
                      />
                    </div>
                  </Link>
                </motion.div>
              )
            )}
          </div>
        </motion.div>

        <Separator />

        {/* ── Active fee types mini-list ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34 }}
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Active Fee Types
              {!loadingFeeTypes && (
                <span className="ml-2 font-normal text-foreground normal-case">
                  ({activeFeeTypeCount})
                </span>
              )}
            </p>
            <Link href={`${basePath}/types`}>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                View all
                <ArrowRight size={11} />
              </Button>
            </Link>
          </div>

          {loadingFeeTypes ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : activeFeeTypeCount === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              <Tags size={15} className="opacity-40" />
              No active fee types yet.{" "}
              <PermissionGate
                require={{ resource: "fee-management", action: "manage" }}
              >
                <Link
                  href={`${basePath}/types/new`}
                  className="text-primary hover:underline"
                >
                  Create one
                </Link>
              </PermissionGate>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              {activeFeeTypes!.slice(0, 5).map((ft, idx) => (
                <Link
                  key={ft.id}
                  href={`${basePath}/types/${ft.id}`}
                  className="group"
                >
                  <div
                    className={
                      "flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40 " +
                      (idx !== 0 ? "border-t border-border/60" : "")
                    }
                  >
                    <FeeCategoryBadge category={ft.category} />
                    <p className="flex-1 truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                      {ft.name}
                    </p>
                    <CurrencyDisplay
                      amount={ft.amount}
                      className="shrink-0 text-xs text-muted-foreground tabular-nums"
                    />
                    <ArrowRight
                      size={13}
                      className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </div>
                </Link>
              ))}
              {activeFeeTypeCount > 5 && (
                <div className="border-t border-border/60 px-4 py-2 text-center">
                  <Link href={`${basePath}/types`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                    >
                      +{activeFeeTypeCount - 5} more
                      <ArrowRight size={11} />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </PermissionGate>
  )
}
