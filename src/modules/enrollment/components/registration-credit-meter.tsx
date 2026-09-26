"use client"

import { cn } from "@/lib/utils"

interface RegistrationCreditMeterProps {
  units: number
  min: number | null
  max: number | null
}

// Live credit-load meter against the backend's min/max for this semester.
// Advisory only — the backend is what accepts or rejects the load.
export function RegistrationCreditMeter({
  units,
  min,
  max,
}: RegistrationCreditMeterProps) {
  const scale = Math.max(max ?? 0, units, min ?? 0, 1)
  const pct = Math.min(100, Math.round((units / scale) * 100))
  const over = max !== null && units > max
  const under = min !== null && units < min
  const status = over
    ? `${units - (max ?? 0)} over the maximum`
    : under
      ? `${(min ?? 0) - units} below the minimum`
      : "Within the allowed load"

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
        <span className="font-semibold text-foreground">
          {units} credit unit{units === 1 ? "" : "s"} selected
        </span>
        <span className="text-muted-foreground">
          {min !== null && <>Min {min}</>}
          {min !== null && max !== null && " · "}
          {max !== null && <>Max {max}</>}
        </span>
      </div>
      <div
        role="meter"
        aria-label="Credit load"
        aria-valuemin={0}
        aria-valuemax={scale}
        aria-valuenow={units}
        aria-valuetext={`${units} units, ${status.toLowerCase()}`}
        className="relative h-2.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            over
              ? "bg-red-500 dark:bg-red-400"
              : under
                ? "bg-amber-500 dark:bg-amber-400"
                : "bg-emerald-500 dark:bg-emerald-400"
          )}
          style={{ width: `${pct}%` }}
        />
        {min !== null && (
          <span
            aria-hidden
            className="absolute top-0 h-full w-px bg-foreground/40"
            style={{ left: `${Math.round((min / scale) * 100)}%` }}
          />
        )}
      </div>
      <p
        className={cn(
          "text-[11px]",
          over
            ? "text-red-700 dark:text-red-400"
            : under
              ? "text-amber-700 dark:text-amber-400"
              : "text-muted-foreground"
        )}
      >
        {status}
      </p>
    </div>
  )
}
