"use client"

import {
  TeachingScopeSelect,
  teachingScopeEmptyMessage,
} from "@/components/teaching-scope-select"
import { useAppStore } from "@/store"
import { useMyTeachingScope } from "@/hooks/use-my-teaching-scope"
import { Suspense, useMemo, useState, useCallback } from "react"
import { ClipboardList, Info, Layers } from "lucide-react"
import EmptyState from "@/components/custom/EmptyState"
import { Button } from "@/components/ui/button"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { usePermissions } from "@/lib/permissions/usePermissions"
import { TutorCourseMoodleGrades } from "@/modules/moodle-sync/components/grades/tutor-course-grades"
import { useResultSheets } from "../../hooks/use-results"
import {
  useResultsScope,
  useTeachingScopeAvailability,
} from "../../hooks/use-results-scope"
import { useTermStructure } from "@/hooks/use-term-structure"
import { RESULTS_PERMISSIONS } from "../../lib/results-permissions"
import { useResultsUiStore } from "../../store/results-ui.store"
import { MoodlePullPanel } from "./moodle-pull-panel"
import { NotAvailableNotice } from "./not-available-notice"
import { OfferingsTable } from "./offerings-table"
import { ResultsRefineFilters } from "./results-refine-filters"
import { ResultsScopeFilters, SCOPE_FIELD_IDS } from "./results-scope-filters"
import { SemesterPicker } from "./semester-picker"
import type { ResultSheetFilters } from "../../types"

const PAGE_SIZE = 20

interface ResultsWorkspaceProps {
  /** Route prefix of the sheet page for this role, e.g. "/tutor/results". */
  sheetBasePath: string
  /**
   * Admin/manager layout: major program first, then its structure, session
   * and semester, cascading. The tutor route keeps the flat filters (its
   * list is already scoped to the caller's own offerings by the backend).
   */
  majorProgramFirst?: boolean
}

// Screen A — one shared workspace for every role that works with results
// (TUTOR, HOD and DEAN on /tutor/results; ADMIN on /manager; SUPER_ADMIN on
// /admin). What each user can do is decided by permissions, never by role:
// a tutor holds only results.view, and the backend scopes the list to their
// own offerings with raw fields only (C6).
export function ResultsWorkspace({
  sheetBasePath,
  majorProgramFirst = false,
}: ResultsWorkspaceProps) {
  const { canAny } = usePermissions()
  // Anyone who works on results beyond viewing them. A tutor holds only
  // results.view and gets a read-only, Moodle-oriented intro instead.
  const isResultsStaff = canAny(
    RESULTS_PERMISSIONS.sync,
    RESULTS_PERMISSIONS.adjust,
    RESULTS_PERMISSIONS.submit,
    RESULTS_PERMISSIONS.approve,
    RESULTS_PERMISSIONS.publish
  )

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Course results
          </h2>
          {isResultsStaff ? (
            <p className="max-w-2xl text-sm text-muted-foreground">
              {majorProgramFirst
                ? "Choose a major program and work down its structure to a semester. Then pull that selection's marks from Moodle, check missing or unmapped items, normalize where needed, and submit for approval and publishing."
                : "Marks come from Moodle. Pull them in, check missing or unmapped items, normalize where needed, then submit for approval and publishing."}
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

      {majorProgramFirst ? (
        <MajorProgramWorkspace sheetBasePath={sheetBasePath} />
      ) : (
        <FlatWorkspace sheetBasePath={sheetBasePath} />
      )}
    </div>
  )
}

// Clears hand-picked rows whenever the scope they were picked in changes, so
// a pull never carries offerings from a previous selection.
function useScopedSelection(scopeKey: string) {
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [key, setKey] = useState(scopeKey)
  if (key !== scopeKey) {
    setKey(scopeKey)
    setSelectedIds([])
  }
  return [selectedIds, setSelectedIds] as const
}

function MajorProgramWorkspace({ sheetBasePath }: { sheetBasePath: string }) {
  const w = useResultsUiStore((s) => s.workspace)
  const scope = useResultsScope()
  const hasMajorProgram = w.majorProgramId != null

  const filters: ResultSheetFilters = useMemo(
    () => ({
      majorProgramId: w.majorProgramId ?? undefined,
      semesterId: w.semesterId ?? undefined,
      // B25: narrows by session when no semester is picked, and is the only
      // term filter for a SESSION-structured major program.
      academicSessionId: w.sessionId ?? undefined,
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
  const sheets = useResultSheets(filters, hasMajorProgram)
  const [selectedIds, setSelectedIds] = useScopedSelection(
    [
      w.majorProgramId,
      w.departmentId,
      w.programId,
      w.sessionId,
      w.semesterId,
    ].join(":")
  )

  return (
    <>
      <section
        aria-label="Filters"
        className="space-y-4 rounded-2xl border border-border bg-card p-4"
      >
        <ResultsScopeFilters scope={scope} />
        <fieldset
          className="min-w-0 border-t border-border pt-3"
          disabled={!hasMajorProgram}
        >
          <legend className="sr-only">Refine the list</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ResultsRefineFilters disabled={!hasMajorProgram} />
          </div>
        </fieldset>
      </section>

      <PermissionGate require={RESULTS_PERMISSIONS.sync}>
        {/* The panel reads ?pullJob= via useSearchParams. */}
        <Suspense fallback={null}>
          <MoodlePullPanel
            semesterId={w.semesterId}
            academicSessionId={w.sessionId}
            sessionBased={scope.sessionBased}
            selectedOfferingIds={selectedIds}
            recentJobId={recentPullJobId(sheets.data)}
            lockedAt={termLockedAt(
              sheets.data,
              scope.sessionBased ? w.sessionId : w.semesterId
            )}
            filterFieldIds={SCOPE_FIELD_IDS}
            scope={{
              hasMajorProgram,
              label: scope.scopeLabel,
              offeringIds: scope.pull.offeringIds,
              isLoading: scope.pull.isLoading,
              isError: scope.pull.isError,
            }}
            onStarted={() => setSelectedIds([])}
          />
        </Suspense>
      </PermissionGate>

      {!hasMajorProgram ? (
        <EmptyState
          icon={Layers}
          title="Choose a major program"
          description="Results are worked on one major program at a time. Pick one above to load its structure, sessions and course offerings."
        />
      ) : (
        <SheetsList
          sheets={sheets}
          sheetBasePath={sheetBasePath}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          emptyDescription={`No course offerings in ${scope.scopeLabel ?? "this selection"} match. Try another session or semester, or clear the status, warning and search filters.`}
        />
      )}
    </>
  )
}

// Tutor/HOD/dean list (already limited to the caller's own offerings by the
// backend). A lecturer can teach in several major programs, so the list is
// scoped the same way as their Students page: they pick one of the major
// programs, then programs, they teach in or head (useMyTeachingScope), and
// nothing loads before that. The session picker then shows that major
// program's sessions, and rows are checked against each offering's real
// owners (fetchScopedSheetPage).
function FlatWorkspace({ sheetBasePath }: { sheetBasePath: string }) {
  const { workspace: w, setWorkspace } = useResultsUiStore()
  const scope = useMyTeachingScope()
  const scopeHealth = useTeachingScopeAvailability()
  const activeRole = useAppStore((s) => s.activeRole)
  // An empty scope is only "an administrator hasn't recorded you yet" when
  // the scope service actually answered; a missing (404) or failing scope
  // route must not be blamed on admin setup.
  const scopeUnavailable = scope.isEmpty && scopeHealth.unavailable
  const pullBlockedReason = scopeUnavailable
    ? "Nothing can be pulled: your teaching scope couldn't be loaded, so there's nothing in scope to pull for."
    : scope.isEmpty
      ? "Nothing can be pulled: you have no programs in your teaching scope yet."
      : null
  const heads =
    scope.majorPrograms
      .find((mp) => mp.id === w.majorProgramId)
      ?.reasons.includes("heads") ?? false
  const ready = w.majorProgramId != null && (heads || w.programId != null)
  const { sessionBased } = useTermStructure({
    majorProgramId: w.majorProgramId,
  })
  const changeScope = useCallback(
    (next: { majorProgramId: number | null; programId: number | null }) =>
      setWorkspace(next),
    [setWorkspace]
  )

  const filters: ResultSheetFilters = useMemo(
    () => ({
      majorProgramId: w.majorProgramId ?? undefined,
      semesterId: w.semesterId ?? undefined,
      academicSessionId: w.sessionId ?? undefined,
      programId: w.programId ?? undefined,
      status: w.status ?? undefined,
      flag: w.flag ?? undefined,
      search: w.search.trim() || undefined,
      page: w.page,
      limit: PAGE_SIZE,
    }),
    [w]
  )
  const sheets = useResultSheets(filters, ready)
  const [selectedIds, setSelectedIds] = useScopedSelection(
    [w.majorProgramId, w.programId, w.sessionId, w.semesterId].join(":")
  )

  return (
    <>
      <section
        aria-label="Filters"
        className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <TeachingScopeSelect
          idPrefix="ws"
          scope={scope}
          majorProgramId={w.majorProgramId}
          programId={w.programId}
          onChange={changeScope}
          className="sm:col-span-2"
        />
        <SemesterPicker
          idPrefix="ws"
          majorProgramId={w.majorProgramId}
          sessionBased={sessionBased}
          sessionId={w.sessionId}
          semesterId={w.semesterId}
          onSessionChange={(sessionId) => setWorkspace({ sessionId })}
          onSemesterChange={(semesterId) => setWorkspace({ semesterId })}
        />
        <ResultsRefineFilters />
      </section>

      <PermissionGate require={RESULTS_PERMISSIONS.sync}>
        {/* The panel reads ?pullJob= via useSearchParams. */}
        <Suspense fallback={null}>
          <MoodlePullPanel
            semesterId={w.semesterId}
            academicSessionId={w.sessionId}
            sessionBased={sessionBased}
            selectedOfferingIds={selectedIds}
            recentJobId={recentPullJobId(sheets.data)}
            lockedAt={termLockedAt(
              sheets.data,
              sessionBased ? w.sessionId : w.semesterId
            )}
            filterFieldIds={{ session: "ws-session", semester: "ws-semester" }}
            blockedReason={pullBlockedReason}
            onStarted={() => setSelectedIds([])}
          />
        </Suspense>
      </PermissionGate>

      {scopeUnavailable ? (
        <EmptyState
          icon={ClipboardList}
          title="Your teaching scope isn't available right now"
          description={
            scopeHealth.failed
              ? "The service that lists the programs you teach in or head couldn't be reached, so your results can't be scoped. This isn't something an administrator needs to set up — try again shortly."
              : "The service that lists the programs you teach in or head isn't available on the server yet, and nothing could be worked out without it. This isn't something an administrator needs to set up — it has been flagged for the backend team."
          }
          action={
            scopeHealth.failed ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => scopeHealth.retry()}
              >
                Retry
              </Button>
            ) : undefined
          }
        />
      ) : scope.isEmpty ? (
        <EmptyState
          icon={ClipboardList}
          title="No programs in your scope yet"
          description={teachingScopeEmptyMessage(activeRole)}
        />
      ) : !ready ? (
        <EmptyState
          icon={ClipboardList}
          title={
            w.majorProgramId == null
              ? "Choose one of your major programs"
              : "Choose one of your programs"
          }
          description="Only the programs you teach in or head are listed."
        />
      ) : (
        <SheetsList
          sheets={sheets}
          sheetBasePath={sheetBasePath}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          emptyDescription="Try another semester or clear the filters. Sheets appear once marks are pulled from Moodle."
        />
      )}
    </>
  )
}

type SheetsQuery = ReturnType<typeof useResultSheets>

function recentPullJobId(data: SheetsQuery["data"]): number | null {
  const ids = (data?.available ? data.data.data : [])
    .map((r) => r.lastPullJobId)
    .filter((id): id is number => id != null)
  return ids.length ? Math.max(...ids) : null
}

// B30 item 13: the chosen term's lock time when every listed offering says
// its semester is locked. A pull always covers one semester (or one
// SESSION program's session, which has a single semester), so the rows on
// screen share its lock. null = unlocked or not known (no term, no rows).
function termLockedAt(
  data: SheetsQuery["data"],
  termId: number | null
): string | null {
  if (termId == null || !data?.available) return null
  const rows = data.data.data
  if (rows.length === 0) return null
  const first = rows[0].semesterLockedAt ?? null
  return first != null && rows.every((r) => r.semesterLockedAt != null)
    ? first
    : null
}

interface SheetsListProps {
  sheets: SheetsQuery
  sheetBasePath: string
  selectedIds: number[]
  setSelectedIds: (update: (ids: number[]) => number[]) => void
  emptyDescription: string
}

function SheetsList({
  sheets,
  sheetBasePath,
  selectedIds,
  setSelectedIds,
  emptyDescription,
}: SheetsListProps) {
  const { can } = usePermissions()
  const setWorkspace = useResultsUiStore((s) => s.setWorkspace)
  const page = sheets.data?.available ? sheets.data.data : null

  if (sheets.isLoading)
    return (
      <div className="space-y-2" aria-busy>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/40" />
        ))}
      </div>
    )
  if (sheets.isError)
    return (
      <EmptyState
        icon={ClipboardList}
        title="Couldn't load result sheets"
        description={sheets.error.message}
        action={
          <Button size="sm" variant="outline" onClick={() => sheets.refetch()}>
            Try again
          </Button>
        }
      />
    )
  if (sheets.data?.available === false)
    return (
      <NotAvailableNotice title="Result sheets aren't available on the server yet">
        <TutorCourseMoodleGrades />
      </NotAvailableNotice>
    )
  if (!page) return null
  if (page.data.length === 0)
    return (
      <EmptyState
        icon={ClipboardList}
        title="No result sheets match"
        description={emptyDescription}
      />
    )
  return (
    <OfferingsTable
      rows={page.data}
      meta={page.meta}
      sheetBasePath={sheetBasePath}
      selectable={can(RESULTS_PERMISSIONS.sync)}
      selectedIds={selectedIds}
      onToggle={(id) =>
        setSelectedIds((ids) =>
          ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
        )
      }
      onToggleAll={(ids) => setSelectedIds(() => ids)}
      onPage={(p) => setWorkspace({ page: p })}
      isFetching={sheets.isFetching}
    />
  )
}
