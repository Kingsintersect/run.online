import type { ReactNode } from "react"
import { ArrowRight, Info, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { CurrencyDisplay } from "@/modules/fee-management/components/shared/currency-display"
import { FinancialStatusBadge, OutcomeBadge } from "./outcome-badge"
import {
  OUTCOME_LABELS,
  REGISTRATION_STATUS_LABELS,
  STANDING_STATE_LABELS,
} from "../lib/outcome"
import type { SessionStanding } from "../types"

interface StandingTimelineProps {
  /** Newest first, exactly as the backend orders them. */
  standings: SessionStanding[]
  /** Extra content under one entry (e.g. the debt-override actions). */
  renderActions?: (standing: SessionStanding) => ReactNode
  /** Extra content per entry for the student view (e.g. a results link). */
  renderFooter?: (standing: SessionStanding) => ReactNode
  /** "their" for staff views, "your" for the student's own history. */
  voice?: "staff" | "student"
  className?: string
}

function formatDate(value: string | null): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString("en-NG", { dateStyle: "medium" })
}

/** GPA/CGPA exactly as returned — never computed or rounded client-side. */
function formatGrade(value: number | null): string {
  return value === null ? "—" : String(value)
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-xs font-medium text-foreground">{children}</dd>
    </div>
  )
}

// One entry per session: session, programme, level → next level, final
// outcome (and the system's proposal when overridden), GPA/CGPA, carryover
// units, registration and financial status, and any debt allowance. Every
// value is the backend's; nothing is derived here.
export function StandingTimeline({
  standings,
  renderActions,
  renderFooter,
  voice = "staff",
  className,
}: StandingTimelineProps) {
  return (
    <ol className={cn("relative space-y-4", className)}>
      {standings.map((s) => {
        const decidedAt = formatDate(s.decided_at)
        const override = s.debt_override
        const overrideAt = formatDate(override?.at ?? null)
        return (
          <li
            key={s.id}
            className={cn(
              "rounded-2xl border bg-card p-4",
              s.state === "OPEN"
                ? "border-primary/30 dark:border-primary/40"
                : "border-border",
              s.state === "VOIDED" && "opacity-70"
            )}
            aria-labelledby={`standing-${s.id}-title`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  id={`standing-${s.id}-title`}
                  className="text-sm font-semibold text-foreground"
                >
                  {s.academic_session.name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {s.program.name}
                  {s.program.code ? ` (${s.program.code})` : ""}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-foreground">
                  {s.level.name}
                  {s.next_level && (
                    <>
                      <ArrowRight
                        size={12}
                        className="text-muted-foreground"
                        aria-label="to"
                      />
                      {s.next_level.name}
                    </>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <OutcomeBadge outcome={s.outcome} />
                {s.state !== "FINALIZED" && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                    {STANDING_STATE_LABELS[s.state]}
                  </span>
                )}
              </div>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
              <Stat label="GPA">{formatGrade(s.gpa)}</Stat>
              <Stat label="CGPA">{formatGrade(s.cgpa)}</Stat>
              <Stat label="Carryover units">
                {s.outstanding_carryover_units}
              </Stat>
              <Stat label="Registration">
                {REGISTRATION_STATUS_LABELS[s.registration_status]}
              </Stat>
              <Stat label="Fees">
                <span className="flex flex-wrap items-center gap-1.5">
                  <FinancialStatusBadge status={s.financial_status} />
                  {s.outstanding_amount > 0 && (
                    <CurrencyDisplay
                      amount={s.outstanding_amount}
                      className="text-[11px] text-muted-foreground"
                    />
                  )}
                </span>
              </Stat>
            </dl>

            {s.is_overridden && (
              <p className="mt-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-relaxed text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                <Info size={13} className="mt-0.5 shrink-0" aria-hidden />
                <span>
                  {voice === "student"
                    ? "Reviewed and set by your department"
                    : `Overridden — the system proposed ${OUTCOME_LABELS[s.system_outcome]}`}
                  {s.decided_by ? ` · ${s.decided_by.name}` : ""}
                  {decidedAt ? ` · ${decidedAt}` : ""}
                  {s.override_reason ? `: ${s.override_reason}` : "."}
                </span>
              </p>
            )}

            {override && (
              <p className="mt-2 flex gap-2 rounded-xl border border-sky-200 bg-sky-50 p-2.5 text-[11px] leading-relaxed text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200">
                <ShieldCheck
                  size={13}
                  className="mt-0.5 shrink-0"
                  aria-hidden
                />
                <span>
                  Registration allowed despite outstanding fees
                  {override.by ? ` · ${override.by.name}` : ""}
                  {overrideAt ? ` · ${overrideAt}` : ""}: {override.reason}
                </span>
              </p>
            )}

            {renderActions?.(s)}
            {renderFooter?.(s)}
          </li>
        )
      })}
    </ol>
  )
}
