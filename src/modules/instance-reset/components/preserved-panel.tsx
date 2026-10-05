"use client"

import { RotateCcw, ShieldCheck } from "lucide-react"
import {
  PRESERVED_CATALOG,
  RESET_TO_DEFAULTS_CATALOG,
} from "../lib/reset-catalog"

/** What always survives a reset, and what is reset to defaults instead. */
export function PreservedPanel() {
  return (
    <section
      aria-labelledby="preserved-heading"
      className="grid gap-4 rounded-2xl border border-border bg-card p-5 lg:grid-cols-2"
    >
      <div>
        <h2
          id="preserved-heading"
          className="flex items-center gap-2 text-base font-semibold text-foreground"
        >
          <ShieldCheck
            className="size-4 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
          Always kept
        </h2>
        <ul className="mt-3 space-y-3">
          {PRESERVED_CATALOG.map((item) => (
            <li key={item.title}>
              <p className="text-sm font-medium text-foreground">
                {item.title}
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                {item.entries.map((e) => (
                  <li key={e.table}>
                    <span className="font-mono text-foreground/80">
                      {e.table}
                    </span>
                    : {e.reason}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <RotateCcw
            className="size-4 text-sky-600 dark:text-sky-400"
            aria-hidden="true"
          />
          Reset to defaults
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Cleared with their group, then re-seeded or set back to their default
          values.
        </p>
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {RESET_TO_DEFAULTS_CATALOG.map((e) => (
            <li key={e.table}>
              <span className="font-mono text-foreground/80">{e.table}</span>:{" "}
              {e.reason}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
