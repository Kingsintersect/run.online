"use client"

import { useId, useState } from "react"
import { ChevronDown, Eraser, GraduationCap, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ResetGroup } from "../types"
import { BlockedReason, CountText } from "./reset-badges"

interface ResetGroupCardProps {
  group: ResetGroup
  labelFor: (key: string) => string
  blockedReason: string | null
  onClear: (key: string) => void
}

/** One reset group: what it clears, what it cascades to, what it keeps. */
export function ResetGroupCard({
  group,
  labelFor,
  blockedReason,
  onClear,
}: ResetGroupCardProps) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const tablesId = `${id}-tables`
  const reasonId = `${id}-reason`
  const headingId = `${id}-heading`

  return (
    <article
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">
            Group {group.order}
          </p>
          <h3
            id={headingId}
            className="text-base font-semibold text-foreground"
          >
            {group.label}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {group.description}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total rows</p>
          <CountText
            value={group.totalRows}
            className="text-lg font-semibold text-foreground"
          />
        </div>
      </header>

      {group.cascadesTo.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-foreground">
            Also clears (rows that depend on this group):
          </p>
          <ul className="flex flex-wrap gap-1.5" aria-label="Also clears">
            {group.cascadesTo.map((key) => (
              <li
                key={key}
                className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
              >
                {labelFor(key)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {group.moodle && group.moodle.entities.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
            <GraduationCap className="size-3.5" aria-hidden="true" />
            Deleted in Moodle (portal-created only)
          </p>
          <ul className="divide-y divide-border rounded-lg border border-border text-xs">
            {group.moodle.entities.map((e) => (
              <li
                key={e.type}
                className="flex items-center justify-between gap-3 px-3 py-1.5"
              >
                <span className="text-foreground">{e.label}</span>
                <CountText value={e.count} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {group.preserved.length > 0 && (
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Kept
          </p>
          <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
            {group.preserved.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={tablesId}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-md px-1 py-1 text-left text-xs font-medium text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span>
            {open ? "Hide" : "Show"} {group.tables.length} table
            {group.tables.length === 1 ? "" : "s"}
          </span>
          <ChevronDown
            className={cn("size-4 transition-transform", open && "rotate-180")}
            aria-hidden="true"
          />
        </button>
        {open && (
          <div id={tablesId} className="mt-2 overflow-x-auto">
            <table className="w-full text-xs">
              <caption className="sr-only">
                Tables cleared by {group.label}
              </caption>
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th scope="col" className="py-1.5 pr-3 font-medium">
                    Table
                  </th>
                  <th scope="col" className="py-1.5 pr-3 font-medium">
                    Note
                  </th>
                  <th scope="col" className="py-1.5 text-right font-medium">
                    Rows
                  </th>
                </tr>
              </thead>
              <tbody>
                {group.tables.map((t) => (
                  <tr
                    key={t.name}
                    className="border-b border-border/60 align-top last:border-0"
                  >
                    <td className="py-1.5 pr-3 font-mono text-foreground">
                      {t.name}
                    </td>
                    <td className="py-1.5 pr-3 text-muted-foreground">
                      {t.note ?? ""}
                    </td>
                    <td className="py-1.5 text-right">
                      <CountText value={t.rowCount} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-auto space-y-1.5 border-t border-border pt-4">
        <Button
          type="button"
          variant="destructive"
          className="w-full"
          disabled={blockedReason !== null}
          aria-label={`Clear ${group.label}`}
          aria-describedby={blockedReason ? reasonId : undefined}
          onClick={() => onClear(group.key)}
        >
          <Eraser data-icon="inline-start" aria-hidden="true" />
          Clear this group
        </Button>
        <BlockedReason id={reasonId} reason={blockedReason} />
      </div>
    </article>
  )
}
