"use client"

import { ArrowRight, PencilLine } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { CurrencyDisplay } from "@/modules/fee-management/components/shared/currency-display"
import { cn } from "@/lib/utils"
import { exceptionLabel } from "../lib/outcome"
import { FinancialStatusBadge, OutcomeBadge } from "./outcome-badge"
import type { PromotionRunItem } from "../types"

interface RunItemsTableProps {
  items: PromotionRunItem[]
  loading: boolean
  /** Row selection + override column shown only when overriding is allowed. */
  canOverride: boolean
  selectedIds: ReadonlySet<number>
  onToggle: (id: number, checked: boolean) => void
  onTogglePage: (checked: boolean) => void
  onOverride: (item: PromotionRunItem) => void
}

const th =
  "px-3 py-2 text-left text-xs font-medium whitespace-nowrap text-muted-foreground"
const td = "px-3 py-2.5 align-top"

/**
 * One server page of run items. Shows both the system's proposed outcome
 * and the final outcome, so every override is visible.
 */
export function RunItemsTable({
  items,
  loading,
  canOverride,
  selectedIds,
  onToggle,
  onTogglePage,
  onOverride,
}: RunItemsTableProps) {
  const pageSelected =
    items.length > 0 && items.every((i) => selectedIds.has(i.id))
  const someSelected = items.some((i) => selectedIds.has(i.id))

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[1100px] border-collapse text-sm">
        <caption className="sr-only">
          Students in this promotion run, with their proposed and final outcomes
        </caption>
        <thead className="bg-muted/50 dark:bg-muted/20">
          <tr className="border-b border-border">
            {canOverride && (
              <th scope="col" className={cn(th, "w-10")}>
                <Checkbox
                  checked={
                    pageSelected ? true : someSelected ? "indeterminate" : false
                  }
                  onCheckedChange={(c) => onTogglePage(c === true)}
                  aria-label="Select every student on this page"
                  disabled={items.length === 0}
                />
              </th>
            )}
            <th scope="col" className={th}>
              Matric no.
            </th>
            <th scope="col" className={th}>
              Name
            </th>
            <th scope="col" className={th}>
              Program
            </th>
            <th scope="col" className={th}>
              Level → next
            </th>
            <th scope="col" className={th}>
              System outcome
            </th>
            <th scope="col" className={th}>
              Final outcome
            </th>
            <th scope="col" className={cn(th, "text-right")}>
              CGPA
            </th>
            <th scope="col" className={cn(th, "text-right")}>
              Carryover units
            </th>
            <th scope="col" className={th}>
              Financial status
              <span className="block text-[10px] font-normal">
                Outstanding — does not affect promotion
              </span>
            </th>
            <th scope="col" className={th}>
              Exceptions
            </th>
            {canOverride && (
              <th scope="col" className={cn(th, "text-right")}>
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody aria-busy={loading}>
          {loading && items.length === 0
            ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td colSpan={canOverride ? 12 : 10} className="px-3 py-2.5">
                    <Skeleton className="h-5 w-full" />
                  </td>
                </tr>
              ))
            : items.map((item) => {
                const selected = selectedIds.has(item.id)
                return (
                  <tr
                    key={item.id}
                    data-state={selected ? "selected" : undefined}
                    className={cn(
                      "border-b border-border transition-colors last:border-0 hover:bg-muted/40 dark:hover:bg-muted/20",
                      selected && "bg-primary/5 dark:bg-primary/10",
                      loading && "opacity-60"
                    )}
                  >
                    {canOverride && (
                      <td className={td}>
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(c) => onToggle(item.id, c === true)}
                          aria-label={`Select ${item.student.name}`}
                        />
                      </td>
                    )}
                    <td
                      className={cn(td, "font-mono text-xs whitespace-nowrap")}
                    >
                      {item.student.matric_number ?? "—"}
                    </td>
                    <td className={td}>
                      <span className="font-medium text-foreground">
                        {item.student.name}
                      </span>
                      {item.student_status.toUpperCase() !== "ACTIVE" && (
                        <span className="block text-xs text-muted-foreground">
                          {item.student_status}
                        </span>
                      )}
                    </td>
                    <td className={cn(td, "max-w-48")}>
                      <span className="line-clamp-2">{item.program.name}</span>
                    </td>
                    <td className={cn(td, "whitespace-nowrap")}>
                      <span className="inline-flex items-center gap-1">
                        {item.current_level.name}
                        <ArrowRight
                          className="size-3 text-muted-foreground"
                          aria-label="to"
                        />
                        {item.proposed_next_level?.name ?? "—"}
                      </span>
                    </td>
                    <td className={td}>
                      <OutcomeBadge outcome={item.system_outcome} />
                    </td>
                    <td className={td}>
                      <OutcomeBadge outcome={item.final_outcome} />
                      {item.is_overridden && (
                        <span
                          className="mt-1 block max-w-48 text-xs text-indigo-700 dark:text-indigo-300"
                          title={item.override_reason ?? undefined}
                        >
                          Overridden
                          {item.overridden_by
                            ? ` by ${item.overridden_by.name}`
                            : ""}
                          {item.override_reason && (
                            <span className="block truncate text-muted-foreground">
                              “{item.override_reason}”
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className={cn(td, "text-right tabular-nums")}>
                      {item.cgpa != null ? item.cgpa.toFixed(2) : "—"}
                    </td>
                    <td className={cn(td, "text-right tabular-nums")}>
                      {item.outstanding_carryover_units}
                    </td>
                    <td className={td}>
                      <FinancialStatusBadge status={item.financial_status} />
                      {item.outstanding_amount > 0 && (
                        <CurrencyDisplay
                          amount={item.outstanding_amount}
                          className="mt-1 block text-xs text-muted-foreground"
                        />
                      )}
                    </td>
                    <td className={td}>
                      {item.exception_codes.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <div className="flex max-w-56 flex-wrap gap-1">
                          {item.exception_codes.map((code) => (
                            <Badge
                              key={code}
                              variant="outline"
                              className="border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
                            >
                              {exceptionLabel(code)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </td>
                    {canOverride && (
                      <td className={cn(td, "text-right")}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onOverride(item)}
                          aria-label={`Override outcome for ${item.student.name}`}
                        >
                          <PencilLine data-icon="inline-start" />
                          Override
                        </Button>
                      </td>
                    )}
                  </tr>
                )
              })}
        </tbody>
      </table>
    </div>
  )
}
