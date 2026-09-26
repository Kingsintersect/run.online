import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  FINANCIAL_STATUS_BADGE_CLASSES,
  FINANCIAL_STATUS_LABELS,
  OUTCOME_BADGE_CLASSES,
  OUTCOME_LABELS,
  RUN_STATUS_BADGE_CLASSES,
  RUN_STATUS_LABELS,
} from "../lib/outcome"
import type { FinancialStatus, RunStatus, StandingOutcome } from "../types"

interface OutcomeBadgeProps {
  outcome: StandingOutcome
  className?: string
}

/** One consistent badge per standing outcome, everywhere in the app. */
export function OutcomeBadge({ outcome, className }: OutcomeBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(OUTCOME_BADGE_CLASSES[outcome], className)}
    >
      {OUTCOME_LABELS[outcome]}
    </Badge>
  )
}

interface RunStatusBadgeProps {
  status: RunStatus
  className?: string
}

export function RunStatusBadge({ status, className }: RunStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(RUN_STATUS_BADGE_CLASSES[status], className)}
    >
      {RUN_STATUS_LABELS[status]}
    </Badge>
  )
}

interface FinancialStatusBadgeProps {
  status: FinancialStatus
  className?: string
}

export function FinancialStatusBadge({
  status,
  className,
}: FinancialStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(FINANCIAL_STATUS_BADGE_CLASSES[status], className)}
    >
      {FINANCIAL_STATUS_LABELS[status]}
    </Badge>
  )
}
