import { AlertTriangle, GitCompare, HelpCircle, Wallet } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { RowFlag } from "../../types"

export const FLAG_META: Record<
  RowFlag,
  { label: string; icon: LucideIcon; className: string; hint: string }
> = {
  MISSING_CA: {
    label: "Missing CA",
    icon: AlertTriangle,
    className:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    hint: "One or more CA items have no grade in Moodle (counted as 0).",
  },
  MISSING_EXAM: {
    label: "Missing exam",
    icon: AlertTriangle,
    className:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    hint: "One or more exam items have no grade in Moodle (counted as 0).",
  },
  MOODLE_DRIFT: {
    label: "Moodle changed",
    icon: GitCompare,
    className:
      "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
    hint: "Moodle marks changed after this sheet left draft. Reopen or reject it to apply them.",
  },
  SCHEME_UNRESOLVED: {
    label: "No grading scheme",
    icon: HelpCircle,
    className: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    hint: "Neither the student's program nor its major program has a grading scheme. The row can't be computed or submitted.",
  },
  ADJUSTMENT_SUPERSEDED: {
    label: "Adjustment superseded",
    icon: GitCompare,
    className: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
    hint: "A filled-in score was replaced by a real Moodle grade on re-pull.",
  },
}

function Chip({
  icon: Icon,
  label,
  hint,
  className,
}: {
  icon: LucideIcon
  label: string
  hint: string
  className: string
}) {
  return (
    <span
      title={hint}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap",
        className
      )}
    >
      <Icon className="size-3" aria-hidden />
      {label}
    </span>
  )
}

export function RowFlagChips({
  flags,
  hasOutstandingFees,
}: {
  flags: RowFlag[]
  hasOutstandingFees?: boolean
}) {
  if (flags.length === 0 && !hasOutstandingFees)
    return <span className="text-xs text-muted-foreground">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {flags.map((f) => (
        <Chip key={f} {...FLAG_META[f]} />
      ))}
      {hasOutstandingFees && (
        <Chip
          icon={Wallet}
          label="Fees owing"
          hint="Outstanding mandatory fees. If the fee gate is on, this result is withheld at publish."
          className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
        />
      )}
    </div>
  )
}
