"use client"

import { cn } from "@/lib/utils"
import { useMajorProgramScope } from "@/hooks/use-major-program-scope"

interface MajorProgramFilterTabsProps {
  /** Currently selected major program, or `null` for "all within scope". */
  value: number | null
  onChange: (majorProgramId: number | null) => void
  className?: string
}

// Major-Program Scoping — sandbox/major-program-scoping/FRONTEND_IMPLEMENTATION_PLAN.md
// §7. One shared implementation reused across Admissions/Fees/Tutor-courses
// rather than four bespoke pickers, per the plan's explicit call-out.
// Renders nothing at all — not a disabled/empty picker — for a single-scoped
// or unscoped caller, per README.md §0's governing rule: a single-major-
// program deployment must render identically to today.
export function MajorProgramFilterTabs({
  value,
  onChange,
  className,
}: MajorProgramFilterTabsProps) {
  const { isMultiScoped, scopedPrograms } = useMajorProgramScope()

  if (!isMultiScoped) return null

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
        All
      </button>
      {scopedPrograms.map((mp) => (
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
