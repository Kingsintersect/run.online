"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CheckCircle2, Loader2, RefreshCw, ShieldAlert } from "lucide-react"
import EmptyState from "@/components/custom/EmptyState"
import { Button } from "@/components/ui/button"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { cn } from "@/lib/utils"
import {
  useDriftScanStatus,
  useEnrollmentDrift,
  useEnrollmentDriftSummary,
} from "../../hooks/use-enrollment-drift"
import { useStartDriftScan } from "../../hooks/use-sync-mutations"
import { CheckCourseEnrollmentsButton } from "./check-course-enrollments-dialog"
import { DriftItemRow } from "./drift-item-row"
import {
  ResolveDriftDialog,
  type ResolveDriftMode,
} from "./resolve-drift-dialog"
import type { EnrollmentDriftFilters, EnrollmentDriftItem } from "../../types"

// Enrollment drift — sandbox/moodle-sync-reconciliation/ENROLLMENT_DRIFT.md.
// The portal is the authority: this
// panel reports where Moodle disagrees and offers explicit fixes — it never
// creates a portal enrollment.

type FilterKey = "open" | "missing" | "only" | "dismissed" | "resolved"

const FILTERS: {
  key: FilterKey
  label: string
  filters: EnrollmentDriftFilters
  empty: string
}[] = [
  {
    key: "open",
    label: "Open",
    filters: { status: "OPEN" },
    empty: "No open drift — every checked enrollment matches the portal.",
  },
  {
    key: "missing",
    label: "Missing in Moodle",
    filters: { status: "OPEN", kind: "MISSING_IN_MOODLE" },
    empty: "No portal enrollments are missing from Moodle.",
  },
  {
    key: "only",
    label: "Only in Moodle",
    filters: { status: "OPEN", kind: "ONLY_IN_MOODLE" },
    empty: "No one is enrolled in Moodle without a portal enrollment.",
  },
  {
    key: "dismissed",
    label: "Dismissed",
    filters: { status: "DISMISSED" },
    empty: "Nothing has been dismissed.",
  },
  {
    key: "resolved",
    label: "Resolved",
    filters: { status: "RESOLVED" },
    empty: "Nothing has been resolved yet.",
  },
]

const PAGE_SIZE = 25

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function EnrollmentDriftPanel() {
  const [filterKey, setFilterKey] = useState<FilterKey>("open")
  const [page, setPage] = useState(1)
  const [resolveItem, setResolveItem] = useState<EnrollmentDriftItem | null>(
    null
  )
  const [resolveMode, setResolveMode] = useState<ResolveDriftMode>("dismiss")

  const active = FILTERS.find((f) => f.key === filterKey) ?? FILTERS[0]
  const summary = useEnrollmentDriftSummary()
  const scan = useDriftScanStatus()
  const drift = useEnrollmentDrift({
    ...active.filters,
    page,
    limit: PAGE_SIZE,
  })
  const startScan = useStartDriftScan()

  const scanStatus = scan.data
  const isScanning = scanStatus?.status === "RUNNING"
  const items = drift.data?.data ?? []
  const total = drift.data?.meta.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const selectFilter = (key: FilterKey) => {
    setFilterKey(key)
    setPage(1)
  }

  const startResolve = (item: EnrollmentDriftItem, mode: ResolveDriftMode) => {
    setResolveMode(mode)
    setResolveItem(item)
  }

  const handleScan = async () => {
    try {
      const status = await startScan.mutateAsync()
      toast.success(
        `Scanning ${status.coursesTotal} course(s) in the background`
      )
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't start the scan"
      )
    }
  }

  const summaryCards: {
    key: FilterKey
    label: string
    value: number | undefined
    tone: string
  }[] = [
    {
      key: "missing",
      label: "Missing in Moodle",
      value: summary.data?.open.missingInMoodle,
      tone: "text-amber-600 dark:text-amber-400",
    },
    {
      key: "only",
      label: "Only in Moodle",
      value: summary.data?.open.onlyInMoodle,
      tone: "text-destructive",
    },
    {
      key: "dismissed",
      label: "Dismissed",
      value: summary.data?.dismissed,
      tone: "text-foreground",
    },
  ]

  return (
    <section
      className="space-y-4 rounded-2xl border border-border bg-card p-4"
      aria-labelledby="enrollment-drift-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldAlert size={16} />
          </div>
          <div>
            <h2
              id="enrollment-drift-heading"
              className="text-sm font-semibold text-foreground"
            >
              Enrollment drift
            </h2>
            <p className="text-xs text-muted-foreground">
              Where Moodle no longer matches portal enrollments. The portal is
              the authority — nothing changes until you act.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CheckCourseEnrollmentsButton />
          <PermissionGate require={{ resource: "moodle-sync", action: "pull" }}>
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleScan}
              disabled={isScanning || startScan.isPending}
            >
              {isScanning || startScan.isPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <RefreshCw size={13} />
              )}
              {isScanning ? "Scanning…" : "Scan all courses"}
            </Button>
          </PermissionGate>
        </div>
      </div>

      {isScanning && scanStatus ? (
        <div className="space-y-1.5" role="status" aria-live="polite">
          <p className="text-xs text-muted-foreground">
            Checking {scanStatus.coursesChecked} of {scanStatus.coursesTotal}{" "}
            courses…
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{
                width: `${
                  scanStatus.coursesTotal > 0
                    ? (scanStatus.coursesChecked / scanStatus.coursesTotal) *
                      100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {summary.data?.lastScanAt
            ? `Last full scan: ${formatDateTime(summary.data.lastScanAt)}${
                summary.data.lastScanStatus === "FAILED" ? " (failed)" : ""
              }`
            : "No full scan has run yet."}
          {scanStatus?.status === "FAILED" && scanStatus.error
            ? ` — ${scanStatus.error}`
            : ""}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {summaryCards.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() => selectFilter(card.key)}
            aria-pressed={filterKey === card.key}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-left transition-colors",
              filterKey === card.key
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/40"
            )}
          >
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className={cn("text-lg font-semibold tabular-nums", card.tone)}>
              {card.value ?? "—"}
            </p>
          </button>
        ))}
      </div>

      <div
        className="flex flex-wrap gap-1.5"
        role="group"
        aria-label="Filter enrollment drift"
      >
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => selectFilter(f.key)}
            aria-pressed={filterKey === f.key}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filterKey === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {drift.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-muted/40"
            />
          ))}
        </div>
      ) : drift.isError ? (
        <EmptyState
          title="Couldn't load enrollment drift"
          description="Something went wrong loading the drift report. Try again shortly."
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Nothing here"
          description={active.empty}
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {items.map((item) => (
            <DriftItemRow
              key={item.id}
              item={item}
              showCourse
              onDismiss={(i) => startResolve(i, "dismiss")}
              onUnenrol={(i) => startResolve(i, "unenrol")}
            />
          ))}
        </ul>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {page} of {totalPages} · {total} item(s)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <ResolveDriftDialog
        item={resolveItem}
        mode={resolveMode}
        onClose={() => setResolveItem(null)}
      />
    </section>
  )
}
