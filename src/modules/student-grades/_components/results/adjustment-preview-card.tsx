"use client"

import { useState } from "react"
import { AlertTriangle, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { fmtPercent, fmtScore } from "./format"
import type { AdjustmentPreview } from "../../types"

const PREVIEW_ROWS = 20

function StatPair({
  label,
  before,
  after,
}: {
  label: string
  before: string
  after: string
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm tabular-nums">
        <span className="text-muted-foreground">{before}</span>
        <span className="mx-1.5 text-muted-foreground" aria-hidden>
          →
        </span>
        <span className="sr-only"> becomes </span>
        <span className="font-semibold text-foreground">{after}</span>
      </p>
    </div>
  )
}

// Server-computed preview (POST …/adjustments/preview, no writes). Every
// figure is the server's — the client only lays them side by side.
export function AdjustmentPreviewCard({
  preview,
}: {
  preview: AdjustmentPreview
}) {
  const [shown, setShown] = useState(PREVIEW_ROWS)
  const grades = Array.from(
    new Set([
      ...preview.before.distribution.map((d) => d.grade),
      ...preview.after.distribution.map((d) => d.grade),
    ])
  )
  const countOf = (list: { grade: string; count: number }[], g: string) =>
    list.find((d) => d.grade === g)?.count ?? 0

  return (
    <section
      aria-label="Adjustment preview"
      className="space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-4"
    >
      {preview.requiresApproval && (
        <p className="flex items-start gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-800 dark:text-sky-200">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          This change is above your major program&apos;s approval threshold. It
          will be held as pending until an admin approves it.
        </p>
      )}
      {preview.capped > 0 && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {preview.capped} student{preview.capped === 1 ? " hits" : "s hit"} the
          component maximum and will be capped there.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatPair
          label="Average"
          before={fmtScore(preview.before.average)}
          after={fmtScore(preview.after.average)}
        />
        <StatPair
          label="Pass rate"
          before={fmtPercent(preview.before.passRate)}
          after={fmtPercent(preview.after.passRate)}
        />
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
            Affected
          </p>
          <p className="mt-1 text-sm font-semibold tabular-nums">
            {preview.affected}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
            Skipped / capped
          </p>
          <p className="mt-1 text-sm font-semibold tabular-nums">
            {preview.skipped} / {preview.capped}
          </p>
        </div>
      </div>

      {grades.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <caption className="mb-1 text-left text-[11px] font-semibold text-foreground">
              Grade distribution
            </caption>
            <thead>
              <tr className="text-left text-muted-foreground">
                <th scope="col" className="py-1 pr-3 font-medium">
                  Grade
                </th>
                {grades.map((g) => (
                  <th
                    key={g}
                    scope="col"
                    className="px-2 py-1 text-center font-semibold"
                  >
                    {g}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(["before", "after"] as const).map((when) => (
                <tr key={when} className="border-t border-border/50">
                  <th
                    scope="row"
                    className="py-1 pr-3 text-left font-medium capitalize"
                  >
                    {when}
                  </th>
                  {grades.map((g) => {
                    const before = countOf(preview.before.distribution, g)
                    const value = countOf(preview[when].distribution, g)
                    return (
                      <td
                        key={g}
                        className={cn(
                          "px-2 py-1 text-center tabular-nums",
                          when === "after" &&
                            value !== before &&
                            "font-semibold text-primary"
                        )}
                      >
                        {value}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {preview.rows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-background">
          <table className="w-full text-xs">
            <caption className="sr-only">
              Per-student totals before and after
            </caption>
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-[10px] tracking-wide text-muted-foreground uppercase">
                <th scope="col" className="px-3 py-2">
                  Matric
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  Before
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  After
                </th>
                <th scope="col" className="px-3 py-2">
                  Note
                </th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.slice(0, shown).map((r) => (
                <tr
                  key={r.gradeId}
                  className="border-b border-border/40 last:border-0"
                >
                  <td className="px-3 py-1.5 font-mono">{r.matricNumber}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {fmtScore(r.before)}
                  </td>
                  <td className="px-3 py-1.5 text-right font-semibold tabular-nums">
                    {fmtScore(r.after)}
                  </td>
                  <td className="px-3 py-1.5 text-amber-700 dark:text-amber-300">
                    {r.capped ? "Capped" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {preview.rows.length > shown && (
            <div className="border-t border-border p-2 text-center">
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setShown((n) => n + PREVIEW_ROWS)}
              >
                Show {Math.min(PREVIEW_ROWS, preview.rows.length - shown)} more
                of {preview.rows.length - shown}
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
