"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ClipboardList, SearchX } from "lucide-react"
import EmptyState from "@/components/custom/EmptyState"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePermissions } from "@/lib/permissions/usePermissions"
import { useMajorProgramScope } from "@/hooks/use-major-program-scope"
import { TutorCourseMoodleGrades } from "@/modules/moodle-sync/components/grades/tutor-course-grades"
import { useResultSheet } from "../../hooks/use-results"
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
// permission plus the sheet's state (adjusting and mapping only in DRAFT).
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

  const inScope = withinScope(sheet.summary.majorProgramId)
  const isDraft = sheet.summary.status === "DRAFT"
  const canAdjust = inScope && isDraft && can(RESULTS_PERMISSIONS.adjust)
  const canMap = inScope && isDraft && can(RESULTS_PERMISSIONS.itemsMap)
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
        {inScope && <SheetWorkflowBar sheet={sheet.summary} />}
      </div>

      <SheetSummaryHeader sheet={sheet} />

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
            onAdjustRow={canAdjust ? setAdjustRow : undefined}
          />
        </TabsContent>
        <TabsContent value="items" className="mt-4">
          <GradeItemMappingPanel offeringId={offeringId} canMap={canMap} />
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
      />
    </div>
  )
}
