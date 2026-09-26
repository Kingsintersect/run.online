"use client"

import { cn } from "@/lib/utils"
import {
  OUTCOME_BADGE_CLASSES,
  OUTCOME_LABELS,
  OUTCOME_ORDER,
} from "../lib/outcome"
import type { RunItemFilterPatch } from "../hooks/use-run-items-url-state"
import type { PromotionRun, RunItemFilters, StandingOutcome } from "../types"

interface RunSummaryCardsProps {
  run: PromotionRun
  filters: RunItemFilters
  /** Replaces the table's filters with the card's filter (or clears it). */
  onSelect: (patch: RunItemFilterPatch) => void
}

type CardKey = "all" | StandingOutcome | "exceptions" | "overridden"

function activeCard(f: RunItemFilters): CardKey | null {
  const extra =
    f.program_id !== undefined ||
    f.level_id !== undefined ||
    f.search !== undefined
  if (extra) return null
  if (
    f.outcome &&
    f.has_exception === undefined &&
    f.is_overridden === undefined
  )
    return f.outcome
  if (!f.outcome && f.has_exception === true && f.is_overridden === undefined)
    return "exceptions"
  if (!f.outcome && f.is_overridden === true && f.has_exception === undefined)
    return "overridden"
  if (
    !f.outcome &&
    f.has_exception === undefined &&
    f.is_overridden === undefined
  )
    return "all"
  return null
}

/**
 * One card per outcome (counts from the run, keyed by final outcome), plus
 * Exceptions and Overridden. Clicking a card filters the items table;
 * clicking the active card clears it. Outcomes with no students are shown
 * only if the backend sent them, to keep the row short.
 */
export function RunSummaryCards({
  run,
  filters,
  onSelect,
}: RunSummaryCardsProps) {
  const active = activeCard(filters)
  const total = Object.values(run.counts).reduce((a, b) => a + b, 0)
  const outcomes = OUTCOME_ORDER.filter((o) => o in run.counts)

  const card = (
    key: CardKey,
    label: string,
    count: number,
    patch: RunItemFilterPatch,
    accent?: string
  ) => {
    const pressed = active === key
    return (
      <button
        key={key}
        type="button"
        aria-pressed={pressed}
        onClick={() => onSelect(pressed && key !== "all" ? {} : patch)}
        className={cn(
          "flex min-w-0 flex-col items-start gap-1 rounded-xl border bg-card p-3 text-left transition-colors outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-card/60 dark:hover:bg-muted/30",
          pressed ? "border-primary ring-1 ring-primary" : "border-border"
        )}
      >
        <span
          className={cn(
            "rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
            accent ??
              "border-border bg-muted text-muted-foreground dark:bg-muted/40"
          )}
        >
          {label}
        </span>
        <span className="text-xl font-semibold text-foreground tabular-nums">
          {count.toLocaleString()}
        </span>
      </button>
    )
  }

  return (
    <section aria-label="Run summary — click a card to filter the table">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {card("all", "All students", total, {})}
        {outcomes.map((o) =>
          card(
            o,
            OUTCOME_LABELS[o],
            run.counts[o] ?? 0,
            { outcome: o },
            OUTCOME_BADGE_CLASSES[o]
          )
        )}
        {card(
          "exceptions",
          "Exceptions",
          run.exception_count,
          { has_exception: true },
          "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
        )}
        {card(
          "overridden",
          "Overridden",
          run.override_count,
          { is_overridden: true },
          "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
        )}
      </div>
    </section>
  )
}
