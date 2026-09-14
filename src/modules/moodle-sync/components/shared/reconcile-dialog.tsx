"use client"

import { useState } from "react"
import { toast } from "sonner"
import { ArrowLeftRight, CheckCircle2, Loader2, RefreshCw } from "lucide-react"
import Modal from "@/components/custom/Modal"
import StatusBadge from "@/components/custom/StatusBadge"
import { Button } from "@/components/ui/button"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import {
  useApplyReconcile,
  usePreviewReconcile,
} from "../../hooks/use-sync-mutations"
import type {
  ReconcileChange,
  ReconcileChangeKind,
  ReconcileModule,
} from "../../types"

// Moodle Sync Reconcile — sandbox/moodle-sync-reconciliation/.

const KIND_ORDER: ReconcileChangeKind[] = [
  "REMOVED_IN_MOODLE",
  "MOVED",
  "RENAMED",
  "CREATE",
  "NEEDS_MAPPING",
]

const KIND_META: Record<
  ReconcileChangeKind,
  {
    label: string
    variant: "success" | "info" | "purple" | "orange" | "warning"
  }
> = {
  CREATE: { label: "New in Moodle", variant: "success" },
  RENAMED: { label: "Renamed", variant: "info" },
  MOVED: { label: "Moved", variant: "purple" },
  REMOVED_IN_MOODLE: { label: "Removed in Moodle", variant: "orange" },
  NEEDS_MAPPING: { label: "Needs mapping", variant: "warning" },
}

function placeOf(snapshot: ReconcileChange["before"]): string {
  if (!snapshot) return "—"
  return (
    snapshot.parentName ?? snapshot.categoryName ?? snapshot.role ?? "Top level"
  )
}

function describeChange(change: ReconcileChange): string {
  switch (change.kind) {
    case "RENAMED":
      return `${change.before?.name ?? "—"} → ${change.after?.name ?? "—"}`
    case "MOVED":
      return `${placeOf(change.before)} → ${placeOf(change.after)}`
    case "CREATE":
      return `Will be added under ${placeOf(change.after)}`
    case "REMOVED_IN_MOODLE":
      return `Was under ${placeOf(change.before)} — will be flagged, not deleted`
    case "NEEDS_MAPPING":
      return "No matching portal record — resolve it after applying"
  }
}

interface ReconcileButtonProps {
  module: ReconcileModule
  /** Lower-case plural used in copy, e.g. "categories". */
  moduleLabel: string
}

export function ReconcileButton({ module, moduleLabel }: ReconcileButtonProps) {
  const [open, setOpen] = useState(false)
  const preview = usePreviewReconcile()
  const apply = useApplyReconcile()

  const runPreview = () => {
    apply.reset()
    preview.mutate(module)
  }

  const handleOpen = () => {
    setOpen(true)
    runPreview()
  }

  const handleClose = () => {
    setOpen(false)
    preview.reset()
    apply.reset()
  }

  const handleApply = async () => {
    if (!preview.data) return
    try {
      const result = await apply.mutateAsync({
        module,
        previewId: preview.data.previewId,
      })
      const { created, renamed, moved, markedRemoved } = result.applied
      toast.success(
        `Reconciled ${moduleLabel}: ${created} added, ${renamed} renamed, ${moved} moved, ${markedRemoved} flagged as removed`
      )
      handleClose()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't apply the changes"
      )
    }
  }

  const data = preview.data
  // A courses apply skips CREATE (bruno/moodle-sync/Reconcile - Apply
  // Courses.bru) — new Moodle courses come in through Pull All instead.
  const skippedCreates =
    module === "courses"
      ? (data?.changes ?? []).filter((c) => c.kind === "CREATE").length
      : 0
  const pendingChanges = (data?.changes.length ?? 0) - skippedCreates
  const grouped = KIND_ORDER.map((kind) => ({
    kind,
    items: (data?.changes ?? []).filter((c) => c.kind === kind),
  })).filter((g) => g.items.length > 0)

  return (
    <>
      <PermissionGate require={{ resource: "moodle-sync", action: "pull" }}>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpen}
          className="h-8 gap-1.5 text-xs"
        >
          <ArrowLeftRight size={13} />
          Reconcile with Moodle
        </Button>
      </PermissionGate>

      <Modal
        open={open}
        onClose={handleClose}
        title={`Reconcile ${moduleLabel} with Moodle`}
        subtitle="Preview first — nothing changes until you apply."
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={apply.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={runPreview}
              disabled={preview.isPending || apply.isPending}
            >
              <RefreshCw
                className={preview.isPending ? "size-4 animate-spin" : "size-4"}
                data-icon="inline-start"
              />
              Run preview again
            </Button>
            <Button
              onClick={handleApply}
              disabled={!data || pendingChanges === 0 || apply.isPending}
            >
              {apply.isPending && (
                <Loader2
                  className="size-4 animate-spin"
                  data-icon="inline-start"
                />
              )}
              Apply {pendingChanges > 0 ? `${pendingChanges} change(s)` : ""}
            </Button>
          </>
        }
      >
        {preview.isPending ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-primary" />
            Comparing the portal with Moodle…
          </div>
        ) : preview.isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {preview.error instanceof Error
              ? preview.error.message
              : "Couldn't generate a preview."}
          </div>
        ) : data ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                ["Removed in Moodle", data.summary.removedInMoodle],
                ["Moved", data.summary.moved],
                ["Renamed", data.summary.renamed],
                ["New", data.summary.toCreate],
                ["Needs mapping", data.summary.needsMapping],
                ["Unchanged", data.summary.unchanged],
              ].map(([label, count]) => (
                <span
                  key={label}
                  className="rounded-full border border-border bg-muted px-2.5 py-1 text-muted-foreground"
                >
                  {label}:{" "}
                  <span className="font-semibold text-foreground tabular-nums">
                    {count}
                  </span>
                </span>
              ))}
            </div>

            {skippedCreates > 0 && (
              <p className="text-xs text-muted-foreground">
                {skippedCreates} new course(s) in Moodle won&apos;t be added by
                reconcile — use Pull All to bring them in.
              </p>
            )}

            {pendingChanges === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border py-10 text-sm text-muted-foreground">
                <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400" />
                Already in sync — nothing to apply.
              </div>
            ) : (
              <>
                <div className="max-h-[45vh] space-y-4 overflow-y-auto pr-1">
                  {grouped.map(({ kind, items }) => (
                    <div key={kind} className="space-y-1.5">
                      <StatusBadge
                        label={`${KIND_META[kind].label} (${items.length})`}
                        variant={KIND_META[kind].variant}
                      />
                      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                        {items.map((change) => (
                          <li
                            key={`${change.kind}-${change.moodleId}`}
                            className="px-3 py-2"
                          >
                            <p className="text-sm font-medium text-foreground">
                              {change.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {describeChange(change)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Nothing is deleted. Items removed in Moodle are flagged so you
                  can review them, and linked portal records (faculties,
                  programs, course offerings, user accounts) are never touched.
                  If Moodle changes before you apply, run the preview again.
                </p>
              </>
            )}
          </div>
        ) : null}
      </Modal>
    </>
  )
}
