"use client"

import { AlertTriangle, GraduationCap, ShieldCheck, Timer } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ResetPreview } from "../types"
import { CountText } from "./reset-badges"

function formatRemaining(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function PreviewCountdown({ secondsLeft }: { secondsLeft: number }) {
  const expired = secondsLeft === 0
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
        expired
          ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          : secondsLeft < 60
            ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
            : "border-border bg-muted/40 text-muted-foreground"
      )}
    >
      <Timer className="size-3.5 shrink-0" aria-hidden="true" />
      {/* The ticking clock is a timer (not announced every second); the
          expiry itself is announced once through the status region. */}
      <span role="timer" aria-live="off">
        {expired
          ? "This preview has expired."
          : `Preview valid for ${formatRemaining(secondsLeft)}`}
      </span>
      <span className="sr-only" role="status">
        {expired ? "The preview has expired. Preview again to continue." : ""}
      </span>
    </div>
  )
}

interface ResetPreviewStepProps {
  preview: ResetPreview
  labelFor: (key: string) => string
  secondsLeft: number
}

/**
 * POST /preview result: requested vs resolved groups (cascaded extras
 * highlighted), tables in deletion order, Moodle counts, what's kept,
 * total rows and warnings.
 */
export function ResetPreviewStep({
  preview,
  labelFor,
  secondsLeft,
}: ResetPreviewStepProps) {
  const requested = new Set(preview.requestedGroups)
  const extras = preview.resolvedGroups.filter((g) => !requested.has(g))

  return (
    <div className="space-y-5">
      <PreviewCountdown secondsLeft={secondsLeft} />

      <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
        <p className="text-xs text-red-800 dark:text-red-200">
          Rows that will be permanently deleted
        </p>
        <CountText
          value={preview.totalRows}
          className="text-2xl font-bold text-red-900 dark:text-red-100"
        />
      </div>

      {preview.warnings.length > 0 && (
        <div
          role="alert"
          className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
        >
          {preview.warnings.map((w) => (
            <p key={w} className="flex gap-2">
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              {w}
            </p>
          ))}
        </div>
      )}

      <section aria-labelledby="preview-groups-heading">
        <h3
          id="preview-groups-heading"
          className="text-sm font-semibold text-foreground"
        >
          Groups
        </h3>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {preview.resolvedGroups.map((key) => {
            const extra = !requested.has(key)
            return (
              <li
                key={key}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs",
                  extra
                    ? "border-amber-300 bg-amber-100 font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100"
                    : "border-border bg-muted text-foreground"
                )}
              >
                {labelFor(key)}
                {extra && <span className="sr-only"> (added by cascade)</span>}
              </li>
            )
          })}
        </ul>
        {extras.length > 0 && (
          <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
            Highlighted groups weren&apos;t picked: they are touched because
            their rows depend on what you picked. Only the dependent tables
            listed below are cleared in them.
          </p>
        )}
      </section>

      <section aria-labelledby="preview-tables-heading">
        <h3
          id="preview-tables-heading"
          className="text-sm font-semibold text-foreground"
        >
          Tables, in deletion order
        </h3>
        <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <caption className="sr-only">
              Tables to be cleared, in the order they will be deleted
            </caption>
            <thead className="sticky top-0 bg-muted">
              <tr className="text-left text-muted-foreground">
                <th scope="col" className="px-3 py-1.5 font-medium">
                  #
                </th>
                <th scope="col" className="px-3 py-1.5 font-medium">
                  Table
                </th>
                <th scope="col" className="px-3 py-1.5 font-medium">
                  Group
                </th>
                <th scope="col" className="px-3 py-1.5 text-right font-medium">
                  Rows
                </th>
              </tr>
            </thead>
            <tbody>
              {preview.tables.map((t, i) => (
                <tr
                  key={`${t.group}:${t.name}`}
                  className={cn(
                    "border-t border-border/60",
                    !requested.has(t.group) &&
                      "bg-amber-50/70 dark:bg-amber-950/20"
                  )}
                >
                  <td className="px-3 py-1.5 text-muted-foreground tabular-nums">
                    {i + 1}
                  </td>
                  <td className="px-3 py-1.5 font-mono text-foreground">
                    {t.name}
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground">
                    {labelFor(t.group)}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <CountText value={t.rowCount} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {preview.moodle.length > 0 && (
        <section aria-labelledby="preview-moodle-heading">
          <h3
            id="preview-moodle-heading"
            className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
          >
            <GraduationCap className="size-4" aria-hidden="true" />
            Deleted in Moodle first
          </h3>
          <ul className="mt-2 divide-y divide-border rounded-lg border border-border text-xs">
            {preview.moodle.map((m) => (
              <li
                key={m.type}
                className="flex items-center justify-between gap-3 px-3 py-1.5"
              >
                <span className="text-foreground">
                  {m.label ?? m.type.replace(/_/g, " ")}
                </span>
                <CountText value={m.count} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section
        aria-labelledby="preview-kept-heading"
        className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30"
      >
        <h3
          id="preview-kept-heading"
          className="flex items-center gap-1.5 text-sm font-semibold text-emerald-900 dark:text-emerald-100"
        >
          <ShieldCheck className="size-4" aria-hidden="true" />
          Kept
        </h3>
        <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs text-emerald-900 dark:text-emerald-200">
          <li>
            <CountText value={preview.preserved.superAdminAccounts} /> super
            admin account
            {preview.preserved.superAdminAccounts === 1 ? "" : "s"}
          </li>
          {preview.preserved.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
