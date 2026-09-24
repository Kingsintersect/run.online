import { AlertOctagon, Layers } from "lucide-react"
import { ResultStatusBadge } from "./result-status-badge"
import { formatDateTime } from "./offerings-table"
import type { ResultSheet } from "../../types"

// The Moodle setup convention (C3) tutors follow so items map themselves.
export const MOODLE_SETUP_NOTE =
  "In the Moodle gradebook, create two categories with ID numbers CA and EXAM and put every activity inside one of them (or give each item an ID number starting with CA or EXAM). Course-total and category-total items are ignored."

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="text-sm font-semibold text-foreground tabular-nums">
        {value}
      </p>
    </div>
  )
}

export function SheetSummaryHeader({ sheet }: { sheet: ResultSheet }) {
  const s = sheet.summary
  const schemeIds = new Set(
    sheet.rows
      .map((r) => r.gradingSchemeId)
      .filter((id): id is number => id != null)
  )

  return (
    <div className="sticky top-0 z-10 space-y-3 rounded-2xl border border-border bg-card/95 p-4 backdrop-blur supports-backdrop-filter:bg-card/80">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">
              {s.courseCode}
            </h2>
            <ResultStatusBadge status={s.status} />
            {schemeIds.size > 1 && (
              <span
                title="Students in this offering come from programs with different grading schemes; each row is graded on its own scheme."
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
              >
                <Layers className="size-3" aria-hidden />
                {schemeIds.size} grading schemes
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {s.courseTitle} · {s.creditUnits} units · {s.semesterName},{" "}
            {s.academicSession}
          </p>
          <p className="text-xs text-muted-foreground">
            Last pulled from Moodle: {formatDateTime(s.lastPulledAt)}
            {s.lecturers.length > 0 &&
              ` · ${s.lecturers.map((l) => l.name).join(", ")}`}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-x-6 gap-y-2 sm:grid-cols-6">
          <Stat label="Students" value={s.studentCount} />
          <Stat label="Missing" value={s.missingCount} />
          <Stat label="Drift" value={s.driftCount} />
          <Stat label="Unmapped" value={s.unmappedItemCount} />
          <Stat label="Pending adj." value={s.pendingAdjustmentBatches} />
          <Stat label="Withheld" value={s.withheldCount} />
        </div>
      </div>

      {s.unmappedItemCount > 0 && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5"
        >
          <AlertOctagon
            className="mt-0.5 size-4 shrink-0 text-destructive"
            aria-hidden
          />
          <div className="text-xs">
            <p className="font-semibold text-destructive">
              {s.unmappedItemCount} Moodle grade item
              {s.unmappedItemCount === 1 ? " isn't" : "s aren't"} mapped to CA
              or EXAM. This sheet can&apos;t be computed or submitted until they
              are.
            </p>
            <p className="mt-0.5 text-muted-foreground">
              Map them in the Grade items tab, or fix them in Moodle:{" "}
              {MOODLE_SETUP_NOTE}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
