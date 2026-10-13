"use client"

import { cn } from "@/lib/utils"

interface RegistrationCreditMeterProps {
  units: number
  max: number | null
}

// Live credit-load meter against the backend's max for this semester.
// Advisory only — the backend is what accepts or rejects the load.
//
// 2026-10-13: dropped the minimum side entirely (was `min`/`Min N`/"N below
// the minimum"). There's no enforced minimum to register — a course only
// stops being registrable once its own exam starts (see
// RegistrationCourseSelection) — so showing one here read as a real
// requirement it wasn't, and caused real confusion live (a student with a
// still-growing curriculum saw "10 below the minimum" and understood it as
// the reason they couldn't register, when nothing was actually blocking
// them).
export function RegistrationCreditMeter({
  units,
  max,
}: RegistrationCreditMeterProps) {
  const scale = Math.max(max ?? 0, units, 1)
  const pct = Math.min(100, Math.round((units / scale) * 100))
  const over = max !== null && units > max
  const status = over
    ? `${units - (max ?? 0)} over the maximum`
    : "Within the allowed load"

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
        <span className="font-semibold text-foreground">
          {units} credit unit{units === 1 ? "" : "s"} selected
        </span>
        <span className="text-muted-foreground">
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
              : "bg-emerald-500 dark:bg-emerald-400"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p
        className={cn(
          "text-[11px]",
          over ? "text-red-700 dark:text-red-400" : "text-muted-foreground"
        )}
      >
        {status}
      </p>
    </div>
  )
}
