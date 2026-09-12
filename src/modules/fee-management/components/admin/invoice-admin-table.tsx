"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { InvoiceStatusBadge } from "../shared/invoice-status-badge"
import { FeeCategoryBadge } from "../shared/fee-category-badge"
import { CurrencyDisplay } from "../shared/currency-display"
import { useInvoices } from "../../hooks/use-invoices"
import { useFeeManagementUiStore } from "../../store/fee-management-ui.store"
import type { InvoiceResponse, InvoiceStatus, FeeCategory } from "../../types"

interface InvoiceAdminTableProps {
  onViewDetail?: (invoice: InvoiceResponse) => void
}

const STATUS_OPTIONS: { value: InvoiceStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "PARTIALLY_PAID", label: "Partially Paid" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "WAIVED", label: "Waived" },
]

type SortKey = "dueDate" | "amount" | "amountPaid" | "status"
type SortDir = "asc" | "desc"

export function InvoiceAdminTable({ onViewDetail }: InvoiceAdminTableProps) {
  const { invoiceTableFilters, setInvoiceTableFilters } =
    useFeeManagementUiStore()

  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("dueDate")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const { data, isLoading, refetch } = useInvoices({
    status: invoiceTableFilters.status,
    feeTypeId: invoiceTableFilters.feeTypeId,
    sessionId: invoiceTableFilters.sessionId,
    studentId: invoiceTableFilters.studentId,
  })

  const invoices = data?.data ?? []

  const filtered = invoices.filter((inv) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.student?.fullName.toLowerCase().includes(q) ||
      inv.student?.matricNumber.toLowerCase().includes(q) ||
      inv.feeType.name.toLowerCase().includes(q)
    )
  })

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0
    if (sortKey === "dueDate") {
      cmp = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    } else if (sortKey === "amount") {
      cmp = Number(a.amount) - Number(b.amount)
    } else if (sortKey === "amountPaid") {
      cmp = Number(a.amountPaid) - Number(b.amountPaid)
    } else if (sortKey === "status") {
      cmp = a.status.localeCompare(b.status)
    }
    return sortDir === "asc" ? cmp : -cmp
  })

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const sortIcon = (col: SortKey) => {
    if (sortKey !== col) return null
    return sortDir === "asc" ? (
      <ChevronUp size={12} className="ml-0.5 inline" />
    ) : (
      <ChevronDown size={12} className="ml-0.5 inline" />
    )
  }

  const hasFilters =
    invoiceTableFilters.status ||
    invoiceTableFilters.feeTypeId ||
    invoiceTableFilters.sessionId ||
    search

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Filter bar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search student, matric, invoice #…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 rounded-xl border-transparent bg-muted pl-8 text-sm"
          />
        </div>

        <SlidersHorizontal
          size={14}
          className="shrink-0 text-muted-foreground"
        />

        <Select
          value={invoiceTableFilters.status ?? "ALL"}
          onValueChange={(v) =>
            setInvoiceTableFilters({
              ...invoiceTableFilters,
              status: v === "ALL" ? undefined : (v as InvoiceStatus),
            })
          }
        >
          <SelectTrigger className="h-9 w-40 rounded-xl border-transparent bg-muted text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={() => {
              setInvoiceTableFilters({})
              setSearch("")
            }}
          >
            <X size={12} />
            Clear
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          className="ml-auto h-9 gap-1.5 text-xs"
          aria-label="Refresh invoices"
        >
          <RefreshCw size={13} />
          Refresh
        </Button>
      </div>

      {/* ── Summary counts ─────────────────────────────────────────── */}
      <p className="text-xs text-muted-foreground">
        {sorted.length.toLocaleString("en-NG")} invoice
        {sorted.length !== 1 ? "s" : ""}
        {hasFilters ? " (filtered)" : ""}
      </p>

      {/* ── Table ──────────────────────────────────────────────────── */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Search size={36} className="mb-2 opacity-30" />
          <p className="text-sm">
            {search || hasFilters
              ? "No invoices match your filters."
              : "No invoices found."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-175 text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Invoice
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Student
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Fee Type
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-right font-medium text-muted-foreground select-none"
                  onClick={() => toggleSort("amount")}
                >
                  Amount
                  {sortIcon("amount")}
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-right font-medium text-muted-foreground select-none"
                  onClick={() => toggleSort("amountPaid")}
                >
                  Paid
                  {sortIcon("amountPaid")}
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left font-medium text-muted-foreground select-none"
                  onClick={() => toggleSort("dueDate")}
                >
                  Due
                  {sortIcon("dueDate")}
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-center font-medium text-muted-foreground select-none"
                  onClick={() => toggleSort("status")}
                >
                  Status
                  {sortIcon("status")}
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((inv, idx) => {
                const balance = Number(inv.amount) - Number(inv.amountPaid)
                const isOverdue = inv.status === "OVERDUE"
                return (
                  <motion.tr
                    key={inv.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15, delay: idx * 0.02 }}
                    className={
                      "border-b border-border/60 transition-colors last:border-0 " +
                      (isOverdue
                        ? "bg-red-50/40 hover:bg-red-50/70 dark:bg-red-900/10 dark:hover:bg-red-900/20"
                        : "hover:bg-muted/30")
                    }
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onViewDetail?.(inv)}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {inv.invoiceNumber}
                      </button>
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

                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs leading-tight font-medium">
                          {inv.feeType.name}
                        </span>
                        <FeeCategoryBadge
                          category={inv.feeType.category as FeeCategory}
                        />
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums">
                      <CurrencyDisplay amount={inv.amount} />
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums">
                      <div className="flex flex-col items-end gap-0.5">
                        <CurrencyDisplay amount={inv.amountPaid} />
                        {balance > 0 && (
                          <span className="text-xs text-muted-foreground">
                            bal:{" "}
                            <CurrencyDisplay
                              amount={balance}
                              className="text-destructive"
                            />
                          </span>
                        )}
                      </div>
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

                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => onViewDetail?.(inv)}
                      >
                        View
                      </Button>
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
