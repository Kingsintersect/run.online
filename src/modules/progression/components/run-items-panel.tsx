"use client"

import { useState } from "react"
import { AlertTriangle, Users } from "lucide-react"
import EmptyState from "@/components/custom/EmptyState"
import { Button } from "@/components/ui/button"
import { usePermissions } from "@/lib/permissions/usePermissions"
import { NotAvailableNotice } from "@/modules/student-grades/_components/results/not-available-notice"
import { usePromotionRunItems } from "../hooks/use-progression"
import {
  RUN_ITEMS_PER_PAGE_OPTIONS,
  useRunItemsUrlState,
} from "../hooks/use-run-items-url-state"
import { toProgressionApiError } from "../lib/errors"
import { isRunActive, isRunEditable, RUN_STATUS_LABELS } from "../lib/outcome"
import { PROGRESSION_PERMISSIONS } from "../lib/permissions"
import { RunBulkOverrideDialog } from "./run-bulk-override-dialog"
import { RunItemsFilters } from "./run-items-filters"
import { RunItemsTable } from "./run-items-table"
import { RunOverrideDrawer } from "./run-override-drawer"
import { RunPagination } from "./run-pagination"
import { RunSummaryCards } from "./run-summary-cards"
import type { PromotionRun, PromotionRunItem } from "../types"

interface Selection {
  /** The filter/page the selection was made on — it resets when that changes. */
  key: string
  ids: Set<number>
}

/**
 * Summary cards + filters + server-paginated items table + overrides. All
 * filter/page state is URL-synced (render inside <Suspense>); selection is
 * per page and clears whenever the filters or page change.
 */
export function RunItemsPanel({ run }: { run: PromotionRun }) {
  const url = useRunItemsUrlState()
  const { can } = usePermissions()
  const itemsQuery = usePromotionRunItems(run.id, url.filters)
  const canOverride =
    isRunEditable(run.status) && can(PROGRESSION_PERMISSIONS.runOverride)

  const selectionKey = JSON.stringify(url.filters)
  const [selection, setSelection] = useState<Selection>({
    key: selectionKey,
    ids: new Set(),
  })
  const selectedIds =
    selection.key === selectionKey ? selection.ids : new Set<number>()

  const [overriding, setOverriding] = useState<PromotionRunItem | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)

  const page = itemsQuery.data?.available ? itemsQuery.data.data : null
  const items = page?.data ?? []

  function toggle(id: number, checked: boolean) {
    const ids = new Set(selectedIds)
    if (checked) ids.add(id)
    else ids.delete(id)
    setSelection({ key: selectionKey, ids })
  }

  function togglePage(checked: boolean) {
    setSelection({
      key: selectionKey,
      ids: checked ? new Set(items.map((i) => i.id)) : new Set(),
    })
  }

  const clearSelection = () =>
    setSelection({ key: selectionKey, ids: new Set() })

  if (itemsQuery.data && !itemsQuery.data.available)
    return (
      <NotAvailableNotice
        title="Run preview rows aren't available yet"
        description="The server doesn't list promotion run items yet (GET /promotion-runs/{id}/items). It has been flagged for the backend team and the table will appear here automatically once it ships."
      />
    )

  return (
    <section aria-labelledby="run-items-heading" className="space-y-4">
      <h2 id="run-items-heading" className="sr-only">
        Students in this run
      </h2>

      <RunSummaryCards
        run={run}
        filters={url.filters}
        onSelect={url.replaceFilters}
      />

      <RunItemsFilters
        filters={url.filters}
        majorProgramId={run.major_program.id}
        onChange={url.setFilters}
        onClear={url.clear}
        hasActiveFilters={url.hasActiveFilters}
      />

      {canOverride && selectedIds.size > 0 && (
        <div
          role="region"
          aria-label="Bulk actions"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm dark:bg-primary/10"
        >
          <span>
            {selectedIds.size} student{selectedIds.size === 1 ? "" : "s"}{" "}
            selected on this page
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear selection
            </Button>
            <Button size="sm" onClick={() => setBulkOpen(true)}>
              Override selected
            </Button>
          </div>
        </div>
      )}

      {!isRunEditable(run.status) && !isRunActive(run.status) && (
        <p className="text-xs text-muted-foreground">
          This run is {RUN_STATUS_LABELS[run.status].toLowerCase()} — outcomes
          can no longer be overridden.
        </p>
      )}

      {itemsQuery.isError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            {toProgressionApiError(itemsQuery.error).message}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void itemsQuery.refetch()}
          >
            Try again
          </Button>
        </div>
      ) : !itemsQuery.isPending && items.length === 0 ? (
        <EmptyState
          icon={Users}
          title={
            isRunActive(run.status)
              ? "The preview is still being built"
              : url.hasActiveFilters
                ? "No students match these filters"
                : "No students in this run"
          }
          description={
            url.hasActiveFilters
              ? "Try a different outcome, program or search."
              : undefined
          }
          action={
            url.hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={url.clear}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <RunItemsTable
          items={items}
          loading={itemsQuery.isFetching}
          canOverride={canOverride}
          selectedIds={selectedIds}
          onToggle={toggle}
          onTogglePage={togglePage}
          onOverride={setOverriding}
        />
      )}

      {page && page.meta.total > 0 && (
        <RunPagination
          meta={page.meta}
          noun="students"
          onPageChange={url.setPage}
          perPageOptions={RUN_ITEMS_PER_PAGE_OPTIONS}
          onPerPageChange={url.setPerPage}
          disabled={itemsQuery.isFetching}
        />
      )}

      {canOverride && (
        <>
          <RunOverrideDrawer
            runId={run.id}
            item={overriding}
            onClose={() => setOverriding(null)}
          />
          <RunBulkOverrideDialog
            runId={run.id}
            itemIds={[...selectedIds]}
            open={bulkOpen}
            onClose={() => setBulkOpen(false)}
            onDone={() => {
              setBulkOpen(false)
              clearSelection()
            }}
          />
        </>
      )}
    </section>
  )
}
