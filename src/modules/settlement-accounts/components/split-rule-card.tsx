"use client"

import { Pencil, Split, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CurrencyDisplay } from "@/modules/fee-management/components/shared/currency-display"
import type { SplitRule } from "../types"

interface SplitRuleCardProps {
  rule: SplitRule
  accountLabels: Map<number, string>
  onEdit: () => void
  onDelete: () => void
}

export function SplitRuleCard({
  rule,
  accountLabels,
  onEdit,
  onDelete,
}: SplitRuleCardProps) {
  const title = rule.feeTypeId
    ? (rule.feeTypeName ?? `Fee type #${rule.feeTypeId}`)
    : "All fees of this program"

  return (
    <article
      aria-label={`Split rule: ${title}`}
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-xs dark:bg-card/60",
        !rule.isActive && "opacity-75"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
            <Split size={16} aria-hidden />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant={rule.isActive ? "secondary" : "outline"}>
                {rule.isActive ? "Active" : "Inactive"}
              </Badge>
              <Badge variant="outline">
                {rule.feeTypeId ? "Specific fee type" : "All fees"}
              </Badge>
              <Badge variant="outline">
                Charge paid by{" "}
                {rule.feeBearer === "CUSTOMER" ? "customer" : "institution"}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onEdit}
            aria-label={`Edit split rule: ${title}`}
          >
            <Pencil size={14} aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            aria-label={`Delete split rule: ${title}`}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 size={14} aria-hidden />
          </Button>
        </div>
      </div>

      <ul className="mt-3 space-y-1 border-t border-border/60 pt-3 text-sm">
        {rule.entries.map((entry) => (
          <li
            key={entry.settlementAccountId}
            className="flex items-center justify-between gap-3"
          >
            <span className="truncate text-foreground">
              {accountLabels.get(entry.settlementAccountId) ??
                `Account #${entry.settlementAccountId}`}
            </span>
            <span className="shrink-0 text-muted-foreground">
              {entry.isDefault ? (
                <span className="font-medium text-primary">Remainder</span>
              ) : entry.splitType === "PERCENTAGE" ? (
                `${entry.value}%`
              ) : (
                <CurrencyDisplay amount={entry.value} />
              )}
            </span>
          </li>
        ))}
      </ul>
    </article>
  )
}
