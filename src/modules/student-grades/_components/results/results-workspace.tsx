"use client"

import { Suspense, useMemo, useState } from "react"
import { ClipboardList, Info, RotateCcw, Search } from "lucide-react"
import EmptyState from "@/components/custom/EmptyState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { usePermissions } from "@/lib/permissions/usePermissions"
import { useAllDepartments, useAllPrograms } from "@/hooks/useCourseStructure"
import { TutorCourseMoodleGrades } from "@/modules/moodle-sync/components/grades/tutor-course-grades"
import { useResultSheets } from "../../hooks/use-results"
import { RESULTS_PERMISSIONS } from "../../lib/results-permissions"
import { useResultsUiStore } from "../../store/results-ui.store"
import { MoodlePullPanel } from "./moodle-pull-panel"
import { NotAvailableNotice } from "./not-available-notice"
import { OfferingsTable } from "./offerings-table"
import { SelectField, toId } from "./select-field"
import { SemesterPicker } from "./semester-picker"
import type { ResultSheetFilters, SheetStatus } from "../../types"

const PAGE_SIZE = 20

const STATUS_OPTIONS: { value: SheetStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "APPROVED", label: "Approved" },
  { value: "PUBLISHED", label: "Published" },
]

const FLAG_OPTIONS: {
  value: NonNullable<ResultSheetFilters["flag"]>
  label: string
}[] = [
  { value: "MISSING_CA", label: "Missing CA" },
  { value: "MISSING_EXAM", label: "Missing exam" },
  { value: "MOODLE_DRIFT", label: "Moodle drift" },
  { value: "SCHEME_UNRESOLVED", label: "No grading scheme" },
  { value: "ADJUSTMENT_SUPERSEDED", label: "Adjustment superseded" },
]

interface ResultsWorkspaceProps {
  /** Route prefix of the sheet page for this role, e.g. "/tutor/results". */
  sheetBasePath: string
}

// Screen A — one shared workspace for every role that works with results
// (TUTOR, HOD and DEAN on /tutor/results; ADMIN on /manager; SUPER_ADMIN on
// /admin). What each user can do is decided by permissions, never by role:
// a tutor holds only results.view, and the backend scopes the list to their
// own offerings with raw fields only (C6).
export function ResultsWorkspace({ sheetBasePath }: ResultsWorkspaceProps) {
  const { can, canAny } = usePermissions()
  const canSync = can(RESULTS_PERMISSIONS.sync)
  // Anyone who works on results beyond viewing them. A tutor holds only
  // results.view and gets a read-only, Moodle-oriented intro instead.
  const isResultsStaff = canAny(
    RESULTS_PERMISSIONS.sync,
    RESULTS_PERMISSIONS.adjust,
    RESULTS_PERMISSIONS.submit,
    RESULTS_PERMISSIONS.approve,
    RESULTS_PERMISSIONS.publish
  )
  const { workspace: w, setWorkspace, resetWorkspace } = useResultsUiStore()
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const { data: programsRes } = useAllPrograms()
  const { data: departmentsRes } = useAllDepartments()

  const filters: ResultSheetFilters = useMemo(
    () => ({
      semesterId: w.semesterId ?? undefined,
      programId: w.programId ?? undefined,
      departmentId: w.departmentId ?? undefined,
      status: w.status ?? undefined,
      flag: w.flag ?? undefined,
      search: w.search.trim() || undefined,
      page: w.page,
      limit: PAGE_SIZE,
    }),
    [w]
  )
  const sheets = useResultSheets(filters)
  const notAvailable = sheets.data?.available === false
  const page = sheets.data?.available ? sheets.data.data : null
  const recentJobIds = (page?.data ?? [])
    .map((r) => r.lastPullJobId)
    .filter((id): id is number => id != null)
  const recentJobId = recentJobIds.length ? Math.max(...recentJobIds) : null

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Course results
          </h2>
          {isResultsStaff ? (
            <p className="max-w-2xl text-sm text-muted-foreground">
              Marks come from Moodle. Pull them in, check missing or unmapped
              items, normalize where needed, then submit for approval and
              publishing.
            </p>
          ) : (
            <div className="max-w-2xl space-y-1 text-sm text-muted-foreground">
              <p>
                The marks pulled from Moodle for the courses you teach, read
                only. You grade in Moodle; the portal never edits your marks.
              </p>
              <p className="flex items-start gap-1.5 text-xs">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                CA and exam weights are set in the Moodle gradebook: put each
                activity in the CA or EXAM category and weight the categories
                there.
              </p>
            </div>
          )}
        </div>
      </header>

      <section
        aria-label="Filters"
        className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <SemesterPicker
          idPrefix="ws"
          sessionId={w.sessionId}
          semesterId={w.semesterId}
          onSessionChange={(sessionId) => setWorkspace({ sessionId })}
          onSemesterChange={(semesterId) => setWorkspace({ semesterId })}
        />
        <SelectField
          id="ws-program"
          label="Program"
          value={w.programId ? String(w.programId) : ""}
          onChange={(v) => setWorkspace({ programId: toId(v) })}
          placeholder="All programs"
          options={(programsRes?.data ?? []).map((p) => ({
            value: String(p.id),
            label: p.name,
          }))}
        />
        <SelectField
          id="ws-department"
          label="Department"
          value={w.departmentId ? String(w.departmentId) : ""}
          onChange={(v) => setWorkspace({ departmentId: toId(v) })}
          placeholder="All departments"
          options={(departmentsRes?.data ?? []).map((d) => ({
            value: String(d.id),
            label: d.name,
          }))}
        />
        <SelectField
          id="ws-status"
          label="Status"
          value={w.status ?? ""}
          onChange={(v) =>
            setWorkspace({
              status: STATUS_OPTIONS.find((o) => o.value === v)?.value ?? null,
            })
          }
          placeholder="Any status"
          options={STATUS_OPTIONS}
        />
        <SelectField
          id="ws-flag"
          label="Warning"
          value={w.flag ?? ""}
          onChange={(v) =>
            setWorkspace({
              flag: FLAG_OPTIONS.find((o) => o.value === v)?.value ?? null,
            })
          }
          placeholder="Any"
          options={FLAG_OPTIONS}
        />
        <div className="space-y-1 sm:col-span-2 lg:col-span-1">
          <label
            htmlFor="ws-search"
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
              id="ws-search"
              value={w.search}
              onChange={(e) => setWorkspace({ search: e.target.value })}
              placeholder="Course code or title"
              className="h-9 pl-8"
            />
          </div>
        </div>
        <div className="flex items-end">
          <Button variant="ghost" size="sm" onClick={resetWorkspace}>
            <RotateCcw className="size-3.5" aria-hidden /> Reset filters
          </Button>
        </div>
      </section>

      <PermissionGate require={RESULTS_PERMISSIONS.sync}>
        {/* The panel reads ?pullJob= via useSearchParams. */}
        <Suspense fallback={null}>
          <MoodlePullPanel
            semesterId={w.semesterId}
            selectedOfferingIds={selectedIds}
            recentJobId={recentJobId}
            onStarted={() => setSelectedIds([])}
          />
        </Suspense>
      </PermissionGate>

      {sheets.isLoading ? (
        <div className="space-y-2" aria-busy>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-xl bg-muted/40"
            />
          ))}
        </div>
      ) : sheets.isError ? (
        <EmptyState
          icon={ClipboardList}
          title="Couldn't load result sheets"
          description={sheets.error.message}
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => sheets.refetch()}
            >
              Try again
            </Button>
          }
        />
      ) : notAvailable ? (
        <NotAvailableNotice title="Result sheets aren't available on the server yet">
          <TutorCourseMoodleGrades />
        </NotAvailableNotice>
      ) : page && page.data.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No result sheets match"
          description="Try another semester or clear the filters. Sheets appear once marks are pulled from Moodle."
        />
      ) : page ? (
        <OfferingsTable
          rows={page.data}
          meta={page.meta}
          sheetBasePath={sheetBasePath}
          selectable={canSync}
          selectedIds={selectedIds}
          onToggle={(id) =>
            setSelectedIds((ids) =>
              ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
            )
          }
          onToggleAll={setSelectedIds}
          onPage={(p) => setWorkspace({ page: p })}
          isFetching={sheets.isFetching}
        />
      ) : null}
    </div>
  )
}
