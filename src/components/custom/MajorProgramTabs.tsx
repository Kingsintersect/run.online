"use client"

import { cn } from "@/lib/utils"

interface MajorProgramTabsProps {
  /** Every active major program to offer a tab for. */
  programs: { id: number; name: string }[]
  /** Currently selected major program, or `null` for no filter (every program). */
  value: number | null
  onChange: (majorProgramId: number | null) => void
  /** Label for the `null` (no-filter) tab. Defaults to "All". */
  allLabel?: string
  className?: string
}

// Major-Program Scoping — for institution-configuration screens (Academic
// Sessions, Admissions Management) where the viewer (typically SUPER_ADMIN)
// needs to see and pick from every major program that exists, not just the
// ones their own role grant happens to be scoped to. This is the sibling of
// `MajorProgramFilterTabs` (which filters by the *caller's* RBAC scope, for
// browse/list screens like Review Applications) — deliberately a separate
// component rather than a shared one, since "every major program" and "my
// scoped major programs" are different data sources with different callers.
// Same governing rule as MajorProgramFilterTabs: renders nothing at all for
// an institution with zero or one major program, so a single-major-program
// deployment sees this screen exactly as it did before this feature existed.
export function MajorProgramTabs({
  programs,
  value,
  onChange,
  allLabel = "All",
  className,
}: MajorProgramTabsProps) {
  if (programs.length <= 1) return null

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
          value === null
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-muted text-muted-foreground hover:bg-accent"
        )}
      >
        {allLabel}
      </button>
      {programs.map((mp) => (
        <button
          type="button"
          key={mp.id}
          onClick={() => onChange(mp.id)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            value === mp.id
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-muted text-muted-foreground hover:bg-accent"
          )}
        >
          {mp.name}
        </button>
      ))}
    </div>
  )
}
