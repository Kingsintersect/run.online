"use client"

import { GraduationCap, Info } from "lucide-react"
import StatusBadge from "@/components/custom/StatusBadge"
import { OutcomeBadge } from "@/modules/progression/components/outcome-badge"
import { OUTCOME_EXPLANATION } from "../lib/registration-copy"
import type { RegistrationContext } from "../types"

interface RegistrationStandingCardProps {
  context: RegistrationContext
}

function formatDate(value: string | null): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString(undefined, { dateStyle: "medium" })
}

// Where the student stands this session: their new level (from the target
// standing) and how last session ended (from the previous standing). Every
// value is the backend's; nothing here is derived.
export function RegistrationStandingCard({
  context,
}: RegistrationStandingCardProps) {
  const { standing, previous_standing: previous, semester } = context
  const explanation = previous ? OUTCOME_EXPLANATION[previous.outcome] : null
  const closes = formatDate(semester.registration_end)
  const opens = formatDate(semester.registration_start)
  const carryoverUnits = previous?.outstanding_carryover_units ?? 0

  return (
    <section
      aria-labelledby="registration-standing-title"
      className="rounded-3xl border border-primary/20 bg-linear-to-br from-primary/10 via-background to-sky-500/10 p-5 dark:from-primary/15 dark:to-sky-500/5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <GraduationCap size={18} aria-hidden />
          </div>
          <div>
            <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
              {standing?.academic_session.name ?? "This session"} ·{" "}
              {semester.name}
            </p>
            <h2
              id="registration-standing-title"
              className="mt-1 text-lg font-bold text-foreground"
            >
              {standing ? standing.level.name : "Your level isn't set yet"}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {standing?.program.name ?? "Programme pending"}
            </p>
          </div>
        </div>
        <StatusBadge
          label={semester.is_open ? "Registration open" : "Registration closed"}
          variant={semester.is_open ? "success" : "default"}
          dot
        />
      </div>

      {(opens || closes) && (
        <p className="mt-3 text-xs text-muted-foreground">
          {opens && <>Opens {opens}</>}
          {opens && closes && " · "}
          {closes && <>Closes {closes}</>}
        </p>
      )}

      {previous && (
        <div className="mt-4 rounded-2xl border border-border/70 bg-background/70 p-4 dark:bg-background/40">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-muted-foreground">
              Last session ({previous.academic_session.name}):
            </p>
            <OutcomeBadge outcome={previous.outcome} />
            {previous.cgpa !== null && (
              <span className="text-xs text-muted-foreground">
                CGPA {previous.cgpa}
              </span>
            )}
            {carryoverUnits > 0 && (
              <span className="text-xs text-muted-foreground">
                · {carryoverUnits} carryover unit
                {carryoverUnits === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {explanation && (
            <p className="mt-2 flex gap-2 text-xs leading-relaxed text-foreground/80">
              <Info
                size={14}
                className="mt-0.5 shrink-0 text-primary"
                aria-hidden
              />
              {explanation}
            </p>
          )}
          {previous.is_overridden && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              This outcome was reviewed and set by your department
              {previous.override_reason ? `: ${previous.override_reason}` : "."}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
