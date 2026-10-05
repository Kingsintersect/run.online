"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ClipboardList, SearchX } from "lucide-react"
import { AuditTrailLink } from "@/components/audit-trail-link"
import EmptyState from "@/components/custom/EmptyState"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePermissions } from "@/lib/permissions/usePermissions"
import { useMajorProgramScope } from "@/hooks/use-major-program-scope"
import { TutorCourseMoodleGrades } from "@/modules/moodle-sync/components/grades/tutor-course-grades"
import { useResultSheet, useSheetSemesterLock } from "../../hooks/use-results"
import { semesterLockedReason } from "../../lib/results-errors"
import { RESULTS_PERMISSIONS } from "../../lib/results-permissions"
import { useResultsUiStore, type SheetTab } from "../../store/results-ui.store"
import { AdjustmentHistory } from "./adjustment-history"
import { GradeItemMappingPanel } from "./grade-item-mapping-panel"
import { NormalizationPanel } from "./normalization-panel"
import { NotAvailableNotice } from "./not-available-notice"
import { RowAdjustDialog } from "./row-adjust-dialog"
import { SheetScoreTable } from "./sheet-score-table"
import { SheetSummaryHeader } from "./sheet-summary-header"
import { SheetWorkflowBar } from "./sheet-workflow-bar"
import type { ResultSheetRow } from "../../types"

interface ResultSheetViewProps {
  offeringId: number
  backHref: string
}

// Screen B — one offering's result sheet. Every action is gated by a C6
// permission plus the sheet's state (adjusting and mapping only in DRAFT)
// and, since B30 item 13, by the semester lock (all writes frozen).
// useMajorProgramScope().withinScope() hides actions on an out-of-scope
// offering as a UI convenience only; the backend is the real boundary.
export function ResultSheetView({
  offeringId,
  backHref,
}: ResultSheetViewProps) {
  const { can, canAny } = usePermissions()
  const { withinScope } = useMajorProgramScope()
  const sheetQuery = useResultSheet(offeringId)
  const { sheetTab, setSheetTab, resetSheetView } = useResultsUiStore()
  const [adjustRow, setAdjustRow] = useState<ResultSheetRow | null>(null)
  // B30 item 13: a locked semester refuses every result write, so those
  // actions are disabled up front (the 423 handling stays as the backstop).
  const semesterLock = useSheetSemesterLock(
    sheetQuery.data?.available ? sheetQuery.data.data.summary : null
  )

  useEffect(() => {
    resetSheetView()
  }, [offeringId, resetSheetView])

  const back = (
    <Button asChild variant="ghost" size="sm">
      <Link href={backHref}>
        <ArrowLeft className="size-4" aria-hidden /> All course results
      </Link>
    </Button>
  )

  if (sheetQuery.isLoading)
    return (
      <div className="space-y-3" aria-busy>
        {back}
        <div className="h-32 animate-pulse rounded-2xl bg-muted/40" />
        <div className="h-96 animate-pulse rounded-2xl bg-muted/30" />
      </div>
    )

  // C6: a sheet outside the caller's scope answers 404 (the route exists,
  // so it isn't "not available yet"). Retrying can't help.
  if (sheetQuery.isError && sheetQuery.error.status === 404)
    return (
      <div className="space-y-3">
        {back}
        <EmptyState
          icon={SearchX}
          title="Result sheet not found"
          description="This course offering doesn't exist, or it isn't in the courses you're responsible for."
        />
      </div>
    )

  if (sheetQuery.isError)
    return (
      <div className="space-y-3">
        {back}
        <EmptyState
          icon={ClipboardList}
          title="Couldn't load this result sheet"
          description={sheetQuery.error.message}
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => sheetQuery.refetch()}
            >
              Try again
            </Button>
          }
        />
      </div>
    )

  if (sheetQuery.data?.available === false)
    return (
      <div className="space-y-3">
        {back}
        <NotAvailableNotice title="Result sheets aren't available on the server yet">
          <TutorCourseMoodleGrades />
        </NotAvailableNotice>
      </div>
    )

  const sheet = sheetQuery.data?.data
  if (!sheet) return null

  // The offering's real owners (B20.2) decide scope; `majorProgramId` is the
  // session's and is null when sessions are shared across major programs.
  const owners = sheet.summary.majorProgramIds ?? []
  const inScope =
    owners.length > 0
      ? owners.some((id) => withinScope(id))
      : withinScope(sheet.summary.majorProgramId)
  const isDraft = sheet.summary.status === "DRAFT"
  const locked = semesterLock.locked
  const canAdjust =
    inScope && isDraft && !locked && can(RESULTS_PERMISSIONS.adjust)
  // A PUBLISHED sheet can't be reopened; a SUPER_ADMIN corrects one row at a
  // time with an audited amendment (results.amend_published).
  const canAmend =
    inScope &&
    sheet.summary.status === "PUBLISHED" &&
    can(RESULTS_PERMISSIONS.amendPublished)
  const canMap =
    inScope && isDraft && !locked && can(RESULTS_PERMISSIONS.itemsMap)
  // Would be allowed but for the lock: explain rather than silently hide.
  const mapFrozen =
    inScope && isDraft && locked && can(RESULTS_PERMISSIONS.itemsMap)
  // Staff who work on results (anything beyond results.view) see the
  // effective scores and the adjustment history. A tutor holds only
  // results.view: the backend nulls their effective fields and 403s the
  // history, so neither is shown to them.
  const isResultsStaff = canAny(
    RESULTS_PERMISSIONS.adjust,
    RESULTS_PERMISSIONS.submit,
    RESULTS_PERMISSIONS.approve,
    RESULTS_PERMISSIONS.adjustApprove,
    RESULTS_PERMISSIONS.publish
  )
  const canSeeHistory = isResultsStaff

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {back}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sheet transitions are logged under the ResultSheet row's own
              id (`sheetId`, bruno A48, 2026-10-02). It's null until the
              sheet row exists, when there's nothing logged yet; the
              offering id stands in then (and on an older server). */}
          <AuditTrailLink
            entityType="ResultSheet"
            entityId={sheet.summary.sheetId ?? offeringId}
          />
          {inScope && (
            <SheetWorkflowBar
              sheet={sheet.summary}
              lockedAt={locked ? semesterLock.lockedAt : undefined}
              locked={locked}
            />
          )}
        </div>
      </div>

      <SheetSummaryHeader
        sheet={sheet}
        locked={locked}
        lockedAt={semesterLock.lockedAt}
      />

      <Tabs value={sheetTab} onValueChange={(v) => setSheetTab(v as SheetTab)}>
        <TabsList>
          <TabsTrigger value="scores">Scores</TabsTrigger>
          <TabsTrigger value="items">Grade items</TabsTrigger>
          {canAdjust && <TabsTrigger value="normalize">Normalize</TabsTrigger>}
          {canSeeHistory && (
            <TabsTrigger value="history">Adjustment history</TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="scores" className="mt-4">
          <SheetScoreTable
            rows={sheet.rows}
            showEffective={isResultsStaff}
            onAdjustRow={canAdjust || canAmend ? setAdjustRow : undefined}
            adjustLabel={canAmend ? "Amend" : "Adjust"}
          />
        </TabsContent>
        <TabsContent value="items" className="mt-4">
          <GradeItemMappingPanel
            offeringId={offeringId}
            summary={sheet.summary}
            canMap={canMap}
            frozenReason={
              mapFrozen ? semesterLockedReason(semesterLock.lockedAt) : null
            }
          />
        </TabsContent>
        {canAdjust && (
          <TabsContent value="normalize" className="mt-4">
            <NormalizationPanel offeringId={offeringId} rows={sheet.rows} />
          </TabsContent>
        )}
        {canSeeHistory && (
          <TabsContent value="history" className="mt-4">
            <AdjustmentHistory offeringId={offeringId} canRevert={canAdjust} />
          </TabsContent>
        )}
      </Tabs>

      <RowAdjustDialog
        offeringId={offeringId}
        row={adjustRow}
        onClose={() => setAdjustRow(null)}
        mode={canAmend ? "amend" : "adjust"}
      />
    </div>
  )
}
