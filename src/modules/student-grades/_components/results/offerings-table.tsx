"use client"

import Link from "next/link"
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  GitCompare,
  Hourglass,
  Tags,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useOfferingEnrolmentCounts } from "../../hooks/use-offering-enrolment-counts"
import { ResultStatusBadge } from "./result-status-badge"
import type { PaginationMeta, ResultSheetSummary } from "../../types"

interface OfferingsTableProps {
  rows: ResultSheetSummary[]
  meta: PaginationMeta
  sheetBasePath: string
  selectable: boolean
  selectedIds: number[]
  onToggle: (offeringId: number) => void
  onToggleAll: (ids: number[]) => void
  onPage: (page: number) => void
  isFetching: boolean
}

function WarningChip({
  icon: Icon,
  count,
  label,
  className,
}: {
  icon: LucideIcon
  count: number
  label: string
  className: string
}) {
  if (count <= 0) return null
  return (
    <span
      title={`${count} ${label}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap",
        className
      )}
    >
      <Icon className="size-3" aria-hidden />
      {count} {label}
    </span>
  )
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "Never"
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString()
}

// The sheet's studentCount only counts rows a Moodle pull created, so a
// never-pulled sheet reads 0 even with students enrolled. Show the enrolment
// (from the offerings list) and say plainly when nothing has been pulled.
function StudentsCell({
  studentCount,
  enrolled,
  pulled,
}: {
  studentCount: number
  enrolled: number | undefined
  pulled: boolean
}) {
  if (!pulled)
    return (
      <span className="text-xs whitespace-nowrap text-muted-foreground">
        {enrolled != null ? `${enrolled} enrolled · ` : ""}not pulled yet
      </span>
    )
  return (
    <span className="whitespace-nowrap">
      <span className="font-medium tabular-nums">{studentCount}</span>
      {enrolled != null && enrolled !== studentCount && (
        <span className="block text-[11px] text-muted-foreground">
          of {enrolled} enrolled
        </span>
      )}
    </span>
  )
}

export function OfferingsTable({
  rows,
  meta,
  sheetBasePath,
  selectable,
  selectedIds,
  onToggle,
  onToggleAll,
  onPage,
  isFetching,
}: OfferingsTableProps) {
  const enrolled = useOfferingEnrolmentCounts()
  const totalPages =
    meta.totalPages ?? Math.max(1, Math.ceil(meta.total / meta.limit))
  const pageIds = rows.map((r) => r.offeringId)
  const allSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id))

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table
          className={cn(
            "w-full min-w-[860px] text-sm transition-opacity",
            isFetching && "opacity-70"
          )}
        >
          <caption className="sr-only">
            Result sheets by course offering
          </caption>
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
              {selectable && (
                <th scope="col" className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Select all offerings on this page"
                    checked={allSelected}
                    onChange={() =>
                      onToggleAll(
                        allSelected
                          ? selectedIds.filter((id) => !pageIds.includes(id))
                          : [...new Set([...selectedIds, ...pageIds])]
                      )
                    }
                    className="size-4 accent-primary"
                  />
                </th>
              )}
              <th scope="col" className="px-3 py-2.5 font-semibold">
                Course
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                Lecturers
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                Status
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                Students
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                Warnings
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                Last pulled
              </th>
              <th scope="col" className="px-3 py-2.5">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.offeringId}
                className="border-b border-border/50 last:border-0 hover:bg-muted/20"
              >
                {selectable && (
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      aria-label={`Select ${r.courseCode}`}
                      checked={selectedIds.includes(r.offeringId)}
                      onChange={() => onToggle(r.offeringId)}
                      className="size-4 accent-primary"
                    />
                  </td>
                )}
                <td className="px-3 py-2.5">
                  <p className="font-semibold text-foreground">
                    {r.courseCode}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.courseTitle} · {r.creditUnits} units
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {r.semesterName}, {r.academicSession}
                    {r.departmentName ? ` · ${r.departmentName}` : ""}
                  </p>
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">
                  {r.lecturers.length
                    ? r.lecturers.map((l) => l.name).join(", ")
                    : "Unassigned"}
                </td>
                <td className="px-3 py-2.5">
                  <ResultStatusBadge status={r.status} />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <StudentsCell
                    studentCount={r.studentCount}
                    enrolled={enrolled.get(r.offeringId)}
                    pulled={r.lastPulledAt != null}
                  />
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex max-w-[280px] flex-wrap gap-1">
                    <WarningChip
                      icon={AlertTriangle}
                      count={r.missingCount}
                      label="missing"
                      className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                    />
                    <WarningChip
                      icon={GitCompare}
                      count={r.driftCount}
                      label="drift"
                      className="bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                    />
                    <WarningChip
                      icon={Tags}
                      count={r.unmappedItemCount}
                      label="unmapped"
                      className="bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                    />
                    <WarningChip
                      icon={Hourglass}
                      count={r.pendingAdjustmentBatches}
                      label="pending adj."
                      className="bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
                    />
                    <WarningChip
                      icon={Wallet}
                      count={r.withheldCount}
                      label="withheld"
                      className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                    />
                  </div>
                </td>
                <td className="px-3 py-2.5 text-xs whitespace-nowrap text-muted-foreground">
                  {formatDateTime(r.lastPulledAt)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`${sheetBasePath}/${r.offeringId}`}>
                      Open
                      <span className="sr-only"> {r.courseCode} sheet</span>
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
        <span>
          {meta.total} offering{meta.total === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-2">
          <Button
            size="icon-sm"
            variant="outline"
            aria-label="Previous page"
            disabled={meta.page <= 1}
            onClick={() => onPage(meta.page - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="tabular-nums">
            Page {meta.page} of {totalPages}
          </span>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label="Next page"
            disabled={meta.page >= totalPages}
            onClick={() => onPage(meta.page + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
