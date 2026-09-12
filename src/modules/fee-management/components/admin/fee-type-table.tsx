"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Loader2,
  Zap,
  ZapOff,
  Trash2,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { FeeCategoryBadge } from "../shared/fee-category-badge"
import { CurrencyDisplay } from "../shared/currency-display"
import { useFeeTypes } from "../../hooks/use-fee-types"
import {
  useActivateFeeType,
  useDeactivateFeeType,
  useDeleteFeeType,
} from "../../hooks/use-fee-mutations"
import { useFeeManagementUiStore } from "../../store/fee-management-ui.store"
import type { FeeTypeResponse, FeeCategory } from "../../types"

interface FeeTypeTableProps {
  onEdit?: (feeType: FeeTypeResponse) => void
  onViewGeneration?: (feeTypeId: number) => void
}

const CATEGORY_OPTIONS: { value: FeeCategory | "ALL"; label: string }[] = [
  { value: "ALL", label: "All Categories" },
  { value: "APPLICATION", label: "Application" },
  { value: "ACCEPTANCE", label: "Acceptance" },
  { value: "TUITION", label: "Tuition" },
  { value: "HOSTEL", label: "Hostel" },
  { value: "CLEARANCE", label: "Clearance" },
  { value: "OTHER", label: "Other" },
]

export function FeeTypeTable({ onEdit, onViewGeneration }: FeeTypeTableProps) {
  const { feeTypeTableFilters, setFeeTypeTableFilters } =
    useFeeManagementUiStore()
  const [search, setSearch] = useState("")
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const {
    data: feeTypes,
    isLoading,
    refetch,
  } = useFeeTypes({
    category: feeTypeTableFilters.category,
    isActive: feeTypeTableFilters.isActive,
    sessionId: feeTypeTableFilters.sessionId,
  })

  const activate = useActivateFeeType()
  const deactivate = useDeactivateFeeType()
  const deleteFee = useDeleteFeeType()

  const filtered = (feeTypes ?? []).filter(
    (ft) => !search || ft.name.toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Filters bar ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search fee types…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-56 rounded-xl border-transparent bg-muted text-sm"
        />

        <Select
          value={feeTypeTableFilters.category ?? "ALL"}
          onValueChange={(v) =>
            setFeeTypeTableFilters({
              ...feeTypeTableFilters,
              category: v === "ALL" ? undefined : (v as FeeCategory),
            })
          }
        >
          <SelectTrigger className="h-9 w-40 rounded-xl border-transparent bg-muted text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={
            feeTypeTableFilters.isActive === undefined
              ? "ALL"
              : feeTypeTableFilters.isActive
                ? "ACTIVE"
                : "INACTIVE"
          }
          onValueChange={(v) =>
            setFeeTypeTableFilters({
              ...feeTypeTableFilters,
              isActive: v === "ALL" ? undefined : v === "ACTIVE" ? true : false,
            })
          }
        >
          <SelectTrigger className="h-9 w-36 rounded-xl border-transparent bg-muted text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          className="ml-auto h-9 gap-1.5 text-xs"
          aria-label="Refresh fee types"
        >
          <RefreshCw size={13} />
          Refresh
        </Button>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <MoreHorizontal size={36} className="mb-2 opacity-30" />
          <p className="text-sm">
            {search ? "No fee types match your search." : "No fee types found."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Category
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Amount
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                  Scope
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                  Status
                </th>
                <PermissionGate
                  require={{ resource: "fee-management", action: "manage" }}
                >
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Actions
                  </th>
                </PermissionGate>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ft, idx) => (
                <motion.tr
                  key={ft.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                  className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3 font-medium">
                    <button
                      type="button"
                      onClick={() => onEdit?.(ft)}
                      className="text-left transition-colors hover:text-primary"
                    >
                      {ft.name}
                    </button>
                    {ft.description && (
                      <p className="mt-0.5 max-w-60 truncate text-xs text-muted-foreground">
                        {ft.description}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <FeeCategoryBadge category={ft.category} />
                  </td>

                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    <CurrencyDisplay amount={ft.amount} />
                  </td>

                  <td className="hidden px-4 py-3 md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {ft.session && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          {ft.session.name}
                        </span>
                      )}
                      {ft.program && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          {ft.program.name}
                        </span>
                      )}
                      {ft.level && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          {ft.level.name}
                        </span>
                      )}
                      {ft.studentType !== "ALL" && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground capitalize">
                          {ft.studentType.toLowerCase()}
                        </span>
                      )}
                      {!ft.session &&
                        !ft.program &&
                        !ft.level &&
                        ft.studentType === "ALL" && (
                          <span className="text-xs text-muted-foreground italic">
                            All students
                          </span>
                        )}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant="outline"
                      className={
                        ft.isActive
                          ? "border-0 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                          : "border-0 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      }
                    >
                      {ft.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>

                  <PermissionGate
                    require={{ resource: "fee-management", action: "manage" }}
                  >
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Activate / Deactivate */}
                        {ft.isActive ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            disabled={
                              deactivate.isPending &&
                              deactivate.variables === ft.id
                            }
                            onClick={() => deactivate.mutate(ft.id)}
                            title="Deactivate"
                          >
                            {deactivate.isPending &&
                            deactivate.variables === ft.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <ZapOff size={12} />
                            )}
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs text-primary"
                            disabled={
                              activate.isPending && activate.variables === ft.id
                            }
                            onClick={() => {
                              activate.mutate(ft.id)
                              onViewGeneration?.(ft.id)
                            }}
                            title="Activate — triggers invoice generation"
                          >
                            {activate.isPending &&
                            activate.variables === ft.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Zap size={12} />
                            )}
                            Activate
                          </Button>
                        )}

                        {/* Generation status link */}
                        {ft.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => onViewGeneration?.(ft.id)}
                          >
                            Generation
                          </Button>
                        )}

                        {/* Delete — only if inactive and no invoices */}
                        {!ft.isActive && (
                          <>
                            {confirmDeleteId === ft.id ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="h-7 text-xs"
                                  disabled={deleteFee.isPending}
                                  onClick={() => {
                                    deleteFee.mutate(ft.id)
                                    setConfirmDeleteId(null)
                                  }}
                                >
                                  Confirm
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => setConfirmDeleteId(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-destructive hover:text-destructive"
                                onClick={() => setConfirmDeleteId(ft.id)}
                                title="Delete (only available when inactive)"
                              >
                                <Trash2 size={12} />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </PermissionGate>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
