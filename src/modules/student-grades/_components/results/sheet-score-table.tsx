"use client"

import { Fragment, useMemo, useState } from "react"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  useResultsUiStore,
  type SheetRowFilter,
} from "../../store/results-ui.store"
import { FLAG_META, RowFlagChips } from "./row-flag-chips"
import { SelectField } from "./select-field"
import { fmtScore, fmtSigned } from "./format"
import { COMPONENT_STYLE } from "./grade-item-mapping-panel"
import type { ItemComponent, ResultSheetRow } from "../../types"

type SheetRowItem = NonNullable<ResultSheetRow["items"]>[number]

// Groups the expanded row's Moodle items as CA, then Exam, then the rest,
// so the items behind each raw column read together. Order only.
const COMPONENT_ORDER: Record<ItemComponent, number> = {
  CA: 0,
  EXAM: 1,
  EXCLUDED: 2,
  UNMAPPED: 3,
}
function sortByComponent(items: SheetRowItem[]): SheetRowItem[] {
  return [...items].sort(
    (a, b) => COMPONENT_ORDER[a.component] - COMPONENT_ORDER[b.component]
  )
}

// C8's sheet endpoint returns every row at once (no server pagination), so
// large offerings are paged client-side — 50 rows at a time keeps the DOM
// small without adding a virtualization dependency. Filtering/paging here is
// display only; no score is computed.
const ROWS_PER_PAGE = 50

const ROW_FILTERS: { value: Exclude<SheetRowFilter, "ALL">; label: string }[] =
  [
    ...(Object.keys(FLAG_META) as (keyof typeof FLAG_META)[]).map((f) => ({
      value: f,
      label: FLAG_META[f].label,
    })),
    { value: "ADJUSTED", label: "Adjusted" },
    { value: "FEES", label: "Fees owing" },
  ]

function matches(row: ResultSheetRow, filter: SheetRowFilter): boolean {
  if (filter === "ALL") return true
  if (filter === "ADJUSTED") return (row.adjustmentTotal ?? 0) !== 0
  if (filter === "FEES") return row.hasOutstandingFees === true
  return row.flags.includes(filter)
}

// MOODLE_DRIFT: the sheet has left DRAFT, so a re-pull didn't change the
// raw score; this is what Moodle says now (applied only after reopen/reject).
function DriftValue({
  current,
  moodle,
}: {
  current: number | null
  moodle: number | null | undefined
}) {
  if (moodle === undefined || moodle === current) return null
  return (
    <span
      className="block text-[10px] font-semibold text-violet-700 dark:text-violet-300"
      title="Moodle has a different mark now. Reopen or reject the sheet to apply it."
    >
      Moodle: {fmtScore(moodle)}
    </span>
  )
}

interface SheetScoreTableProps {
  rows: ResultSheetRow[]
  /**
   * Show the effective/adjusted columns. False for a tutor: the backend
   * sends those fields as null for them (raw marks + flags only), so the
   * columns would only ever read "—".
   */
  showEffective: boolean
  /** Renders the per-row "Adjust" button when the viewer may adjust. */
  onAdjustRow?: (row: ResultSheetRow) => void
}

export function SheetScoreTable({
  rows,
  showEffective,
  onAdjustRow,
}: SheetScoreTableProps) {
  const {
    rowFilter,
    rowSearch,
    rowPage,
    setRowFilter,
    setRowSearch,
    setRowPage,
  } = useResultsUiStore()
  const [expanded, setExpanded] = useState<number | null>(null)

  const hasEffective = showEffective

  const filtered = useMemo(() => {
    const q = rowSearch.trim().toLowerCase()
    return rows.filter(
      (r) =>
        matches(r, rowFilter) &&
        (!q ||
          r.matricNumber.toLowerCase().includes(q) ||
          r.studentName.toLowerCase().includes(q))
    )
  }, [rows, rowFilter, rowSearch])

  const pageCount = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE))
  const page = Math.min(rowPage, pageCount)
  const visible = filtered.slice(
    (page - 1) * ROWS_PER_PAGE,
    page * ROWS_PER_PAGE
  )
  const colCount = (hasEffective ? 13 : 7) + (onAdjustRow ? 1 : 0)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <SelectField
          id="sheet-row-filter"
          label="Show"
          value={rowFilter === "ALL" ? "" : rowFilter}
          onChange={(v) =>
            setRowFilter(ROW_FILTERS.find((f) => f.value === v)?.value ?? "ALL")
          }
          placeholder="All students"
          options={ROW_FILTERS}
          className="w-48"
        />
        <div className="w-full space-y-1 sm:w-64">
          <label
            htmlFor="sheet-row-search"
            className="text-[11px] font-medium text-muted-foreground"
          >
            Search
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="sheet-row-search"
              value={rowSearch}
              onChange={(e) => setRowSearch(e.target.value)}
              placeholder="Matric number or name"
              className="h-9 pl-8"
            />
          </div>
        </div>
        <p className="ml-auto text-xs text-muted-foreground" aria-live="polite">
          {filtered.length} of {rows.length} students
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[980px] text-xs">
            <caption className="sr-only">Student scores</caption>
            <thead className="sticky top-0 z-[1] bg-muted/80 backdrop-blur">
              <tr className="text-left text-[10px] tracking-wide text-muted-foreground uppercase">
                <th scope="col" className="w-8 px-2 py-2.5">
                  <span className="sr-only">Expand</span>
                </th>
                <th scope="col" className="px-2 py-2.5">
                  Matric
                </th>
                <th scope="col" className="px-2 py-2.5">
                  Name
                </th>
                <th scope="col" className="px-2 py-2.5">
                  Program
                </th>
                <th
                  scope="col"
                  className="px-2 py-2.5 text-right"
                  title="The CA items' Moodle marks, scaled by the server to the CA weight. Expand a row to see which items count as CA."
                >
                  Raw CA (Moodle)
                </th>
                <th
                  scope="col"
                  className="px-2 py-2.5 text-right"
                  title="The exam items' Moodle marks, scaled by the server to the exam weight. Expand a row to see which items count as exam."
                >
                  Raw exam (Moodle)
                </th>
                {hasEffective && (
                  <>
                    <th scope="col" className="px-2 py-2.5 text-right">
                      Adj.
                    </th>
                    <th scope="col" className="px-2 py-2.5 text-right">
                      CA
                    </th>
                    <th scope="col" className="px-2 py-2.5 text-right">
                      Exam
                    </th>
                    <th scope="col" className="px-2 py-2.5 text-right">
                      Total
                    </th>
                    <th scope="col" className="px-2 py-2.5 text-center">
                      Grade
                    </th>
                    <th scope="col" className="px-2 py-2.5 text-right">
                      GP
                    </th>
                  </>
                )}
                <th scope="col" className="px-2 py-2.5">
                  Flags
                </th>
                {onAdjustRow && (
                  <th scope="col" className="px-2 py-2.5">
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td
                    colSpan={colCount}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No students match this filter.
                  </td>
                </tr>
              )}
              {visible.map((r) => {
                const open = expanded === r.gradeId
                return (
                  <Fragment key={r.gradeId}>
                    <tr
                      className={cn(
                        "border-b border-border/40 hover:bg-muted/20",
                        open && "bg-muted/20"
                      )}
                    >
                      <td className="px-2 py-2">
                        {r.items && r.items.length > 0 && (
                          <button
                            type="button"
                            aria-expanded={open}
                            aria-label={`${open ? "Hide" : "Show"} Moodle items for ${r.matricNumber}`}
                            onClick={() => setExpanded(open ? null : r.gradeId)}
                            className="flex size-6 items-center justify-center rounded-md hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                          >
                            <ChevronDown
                              className={cn(
                                "size-3.5 transition-transform",
                                open && "rotate-180"
                              )}
                            />
                          </button>
                        )}
                      </td>
                      <td className="px-2 py-2 font-mono">{r.matricNumber}</td>
                      <td className="px-2 py-2 text-foreground">
                        {r.studentName}
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">
                        {r.programCode}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {fmtScore(r.rawCa)}
                        <DriftValue
                          current={r.rawCa}
                          moodle={r.moodleDrift?.rawCa}
                        />
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {fmtScore(r.rawExam)}
                        <DriftValue
                          current={r.rawExam}
                          moodle={r.moodleDrift?.rawExam}
                        />
                      </td>
                      {hasEffective && (
                        <>
                          <td
                            className={cn(
                              "px-2 py-2 text-right tabular-nums",
                              (r.adjustmentTotal ?? 0) !== 0 &&
                                "font-semibold text-sky-700 dark:text-sky-300"
                            )}
                          >
                            {fmtSigned(r.adjustmentTotal)}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums">
                            {fmtScore(r.ca)}
                            {r.caMax != null && (
                              <span className="text-muted-foreground">
                                /{fmtScore(r.caMax)}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums">
                            {fmtScore(r.exam)}
                            {r.examMax != null && (
                              <span className="text-muted-foreground">
                                /{fmtScore(r.examMax)}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-right font-semibold tabular-nums">
                            {fmtScore(r.total)}
                          </td>
                          <td className="px-2 py-2 text-center font-semibold">
                            {r.grade ?? "—"}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums">
                            {fmtScore(r.gradePoint)}
                          </td>
                        </>
                      )}
                      <td className="px-2 py-2">
                        <RowFlagChips
                          flags={r.flags}
                          hasOutstandingFees={r.hasOutstandingFees}
                        />
                      </td>
                      {onAdjustRow && (
                        <td className="px-2 py-2 text-right">
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => onAdjustRow(r)}
                            aria-label={`Adjust ${r.matricNumber}`}
                          >
                            <SlidersHorizontal className="size-3" aria-hidden />
                            Adjust
                          </Button>
                        </td>
                      )}
                    </tr>
                    {open && r.items && (
                      <tr className="border-b border-border/40 bg-muted/10">
                        <td />
                        <td colSpan={colCount - 1} className="px-2 py-2">
                          <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                            {sortByComponent(r.items).map((item) => (
                              <li
                                key={item.moodleGradeItemId}
                                className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background px-2 py-1"
                              >
                                <span className="truncate">
                                  <span
                                    className={cn(
                                      "mr-1 rounded px-1 text-[9px] font-semibold",
                                      COMPONENT_STYLE[item.component]
                                    )}
                                  >
                                    {item.component}
                                  </span>
                                  {item.name}
                                </span>
                                <span
                                  className={cn(
                                    "shrink-0 tabular-nums",
                                    item.earned == null &&
                                      "text-amber-700 dark:text-amber-300"
                                  )}
                                >
                                  {item.earned == null
                                    ? "not graded"
                                    : fmtScore(item.earned)}{" "}
                                  / {fmtScore(item.max)}
                                </span>
                              </li>
                            ))}
                          </ul>
                          {r.missingItems.length > 0 && (
                            <p className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-300">
                              No grade in Moodle for:{" "}
                              {r.missingItems.join(", ")} (counted as 0)
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
        {pageCount > 1 && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-2 text-xs text-muted-foreground">
            <Button
              size="icon-sm"
              variant="outline"
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => setRowPage(page - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="tabular-nums">
              Page {page} of {pageCount}
            </span>
            <Button
              size="icon-sm"
              variant="outline"
              aria-label="Next page"
              disabled={page >= pageCount}
              onClick={() => setRowPage(page + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
