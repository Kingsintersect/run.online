"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Wrench,
} from "lucide-react"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { useAcademicUnits } from "@/hooks/useAcademicStructure"
import { cn } from "@/lib/utils"
import { useSyncCategories } from "../../hooks/use-sync-categories"
import { useRepairCategoryHierarchy } from "../../hooks/use-sync-mutations"
import { planHierarchyRepair } from "../../lib/repair-plan"

// "Repair hierarchy": re-parents each mapped portal node under its Moodle
// parent's node (POST /moodle-sync/categories/repair-hierarchy). The dialog
// first shows exactly what it would move, computed from the loaded mappings
// and tree, and refuses to run while any move is unsafe (a crossed mapping
// would otherwise move a faculty under a semester, or a major program under
// another one). Fix those mappings with "Re-link" on the tree first. Since
// B23 the server also refuses major-program and cycle-making moves itself
// and reports them; its ?dryRun=1 preview isn't used (see the service).
export function RepairHierarchyButton() {
  const [open, setOpen] = useState(false)
  const { data: mappings = [], isLoading: loadingMappings } =
    useSyncCategories()
  const { data: unitsRes, isLoading: loadingUnits } = useAcademicUnits()
  const repair = useRepairCategoryHierarchy()

  const plan = useMemo(
    () =>
      planHierarchyRepair(
        mappings,
        (unitsRes?.data ?? []).map((u) => ({
          id: u.id,
          name: u.name,
          typeCode: u.typeCode,
          parentId: u.parentId,
        }))
      ),
    [mappings, unitsRes]
  )
  const loading = loadingMappings || loadingUnits
  const unsafe = plan.moves.filter((m) => m.unsafeReason != null)

  const run = async () => {
    try {
      const r = await repair.mutateAsync()
      const refused = r.refusedMajorProgram + r.refusedCycle
      toast.success(
        `Hierarchy repaired: ${r.moved} node${r.moved === 1 ? "" : "s"} moved, ${r.skippedAlreadyCorrect} already correct.` +
          (refused > 0
            ? ` The server refused ${refused} unsafe move${refused === 1 ? "" : "s"} (major-program nodes or loops); Re-link those rows.`
            : "")
      )
      setOpen(false)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "The repair didn't complete."
      )
    }
  }

  return (
    <PermissionGate require={{ resource: "moodle-sync", action: "pull" }}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Wrench className="size-3.5" data-icon="inline-start" />
        Repair hierarchy
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Repair the portal tree from Moodle"
        subtitle="Moves portal nodes under the parent their Moodle category has. Preview below; nothing changes until you run it."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={run}
              disabled={
                loading ||
                repair.isPending ||
                !plan.safe ||
                plan.moves.length === 0
              }
            >
              {repair.isPending && (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              )}
              {plan.moves.length === 0
                ? "Nothing to repair"
                : `Move ${plan.moves.length} node${plan.moves.length === 1 ? "" : "s"}`}
            </Button>
          </>
        }
      >
        {loading ? (
          <p className="text-sm text-muted-foreground" aria-busy>
            Working out what would change…
          </p>
        ) : (
          <div className="space-y-4 text-sm">
            {plan.problems.length > 0 && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"
              >
                <p className="font-semibold">
                  Fix these first. Until then, Reconcile, Pull All and Repair
                  can move nodes to the wrong place:
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {plan.problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            {plan.conflicts.length > 0 && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"
              >
                <p className="font-semibold">
                  Some portal nodes are linked to more than one Moodle category:
                </p>
                <ul className="mt-1 list-disc pl-4">
                  {plan.conflicts.map((c) => (
                    <li key={c.unitId}>
                      {c.unitName} ← {c.moodleNames.join(", ")}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {unsafe.length > 0 && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  The repair is blocked: {unsafe.length} move
                  {unsafe.length === 1 ? " would" : "s would"} damage the tree
                  because a Moodle category is linked to the wrong portal node.
                  Use <strong>Re-link</strong> on those rows in the tree to link
                  each Moodle category to its real portal record, then open this
                  again.
                </span>
              </p>
            )}
            {plan.moves.length === 0 && plan.safe ? (
              <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="size-4" aria-hidden />
                Every mapped node already sits under its Moodle parent.
              </p>
            ) : plan.moves.length === 0 ? null : (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {plan.moves.map((m) => (
                  <li
                    key={m.mappingId}
                    className={cn(
                      "px-3 py-2",
                      m.unsafeReason && "bg-destructive/5"
                    )}
                  >
                    <p className="font-medium text-foreground">
                      {m.unitName}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({m.unitTypeCode.toLowerCase().replace("_", " ")})
                      </span>
                    </p>
                    <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                      {m.fromParentName ?? "Top level"}
                      <ArrowRight className="size-3" aria-hidden />
                      {m.toParentName}
                    </p>
                    {m.unsafeReason && (
                      <p className="mt-0.5 text-xs text-destructive">
                        {m.unsafeReason}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {plan.skipped > 0 && (
              <p className="text-xs text-muted-foreground">
                {plan.skipped} categor{plan.skipped === 1 ? "y is" : "ies are"}{" "}
                skipped because their Moodle parent isn&apos;t linked yet;
                resolve the parent first, then repair again.
              </p>
            )}
          </div>
        )}
      </Modal>
    </PermissionGate>
  )
}
