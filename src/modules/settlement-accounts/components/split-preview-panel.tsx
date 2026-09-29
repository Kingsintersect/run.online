"use client"

import { useId, useMemo } from "react"
import { AlertCircle, Calculator } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { CurrencyDisplay } from "@/modules/fee-management/components/shared/currency-display"
import {
  calculateSplit,
  fromKobo,
  type SplitEntryInput,
} from "../lib/split-calculator"

interface SplitPreviewPanelProps {
  entries: SplitEntryInput[]
  accountLabels: Map<number, string>
  sampleAmount: string
  onSampleAmountChange: (value: string) => void
  /** Where the default sample amount came from, shown as a hint. */
  sampleHint: string
}

/** Live "for a payment of ₦X, A gets …" preview — pure client maths. */
export function SplitPreviewPanel({
  entries,
  accountLabels,
  sampleAmount,
  onSampleAmountChange,
  sampleHint,
}: SplitPreviewPanelProps) {
  const inputId = useId()
  const amount = Number(sampleAmount)
  const result = useMemo(
    () => calculateSplit(amount, entries),
    [amount, entries]
  )

  function labelFor(settlementAccountId: number, index: number): string {
    return (
      accountLabels.get(settlementAccountId) ??
      `Entry ${index + 1} (no account chosen)`
    )
  }

  return (
    <section
      aria-labelledby={`${inputId}-title`}
      className="space-y-3 rounded-xl border border-border bg-muted/30 p-4 dark:bg-muted/10"
    >
      <h3
        id={`${inputId}-title`}
        className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
      >
        <Calculator size={14} aria-hidden /> Live preview
      </h3>

      <div className="space-y-1.5">
        <Label htmlFor={inputId}>Sample payment amount (₦)</Label>
        <Input
          id={inputId}
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          value={sampleAmount}
          onChange={(e) => onSampleAmountChange(e.target.value)}
          aria-describedby={`${inputId}-hint`}
        />
        <p id={`${inputId}-hint`} className="text-xs text-muted-foreground">
          {sampleHint}
        </p>
      </div>

      <div aria-live="polite" className="space-y-2">
        {result.amountKobo > 0 && (
          <p className="text-xs text-muted-foreground">
            For a payment of{" "}
            <CurrencyDisplay
              amount={fromKobo(result.amountKobo)}
              className="font-medium text-foreground"
            />
            :
          </p>
        )}
        <ul className="divide-y divide-border rounded-lg border border-border bg-background dark:bg-background/40">
          {result.shares.map((share) => (
            <li
              key={share.entryIndex}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate text-foreground">
                {labelFor(share.settlementAccountId, share.entryIndex)}
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {share.isDefault
                    ? "· remainder"
                    : share.splitType === "PERCENTAGE"
                      ? `· ${Number.isFinite(share.value) ? share.value : 0}%`
                      : "· exact amount"}
                </span>
              </span>
              <CurrencyDisplay
                amount={share.amount}
                className={cn(
                  "shrink-0 font-medium",
                  share.isDefault && "text-primary"
                )}
              />
            </li>
          ))}
        </ul>
        {result.shares.some((s) => s.isDefault) && (
          <p className="text-xs text-muted-foreground">
            Allocated to fixed and percentage shares:{" "}
            <CurrencyDisplay amount={fromKobo(result.allocatedKobo)} /> ·
            Remainder:{" "}
            <CurrencyDisplay amount={fromKobo(result.remainderKobo)} />
          </p>
        )}

        {result.issues.length > 0 && (
          <ul
            role="alert"
            className="space-y-1 rounded-md border border-destructive/30 bg-destructive/5 p-3 dark:bg-destructive/10"
          >
            {result.issues.map((issue, i) => (
              <li
                key={`${issue.code}-${issue.entryIndex ?? "rule"}-${i}`}
                className="flex gap-1.5 text-xs text-destructive"
              >
                <AlertCircle
                  size={12}
                  className="mt-0.5 shrink-0"
                  aria-hidden
                />
                <span>
                  {issue.entryIndex !== undefined &&
                    `${labelFor(entries[issue.entryIndex]?.settlementAccountId ?? 0, issue.entryIndex)}: `}
                  {issue.message}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
