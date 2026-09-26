"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CheckCheck, Loader2, RefreshCw, Trash2, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { useRefreshPromotionRun } from "../hooks/use-progression-mutations"
import { toProgressionApiError } from "../lib/errors"
import { isRunEditable } from "../lib/outcome"
import { PROGRESSION_PERMISSIONS } from "../lib/permissions"
import { RunCommitDialog } from "./run-commit-dialog"
import { RunDiscardDialog } from "./run-discard-dialog"
import { RunReverseDialog } from "./run-reverse-dialog"
import type { PromotionRun } from "../types"

type OpenDialog = "discard" | "commit" | "reverse" | null

/**
 * Refresh preview / Discard / Commit on a ready preview, and Reverse on a
 * committed run while `is_reversible`. Each is gated by its contract
 * permission; the server re-checks both the permission and the run state.
 */
export function RunActions({ run }: { run: PromotionRun }) {
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const refresh = useRefreshPromotionRun(run.id)
  const editable = isRunEditable(run.status)
  const reversible = run.status === "COMMITTED" && run.is_reversible

  const setOpen = (d: Exclude<OpenDialog, null>) => (open: boolean) =>
    setDialog(open ? d : null)

  function onRefresh() {
    refresh.mutate(undefined, {
      onSuccess: () =>
        toast.success("Recomputing the preview — overrides are kept"),
      onError: (e) => toast.error(toProgressionApiError(e).message),
    })
  }

  if (!editable && !reversible) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {editable && (
        <>
          <PermissionGate require={PROGRESSION_PERMISSIONS.runCreate}>
            <Button
              variant="outline"
              onClick={onRefresh}
              disabled={refresh.isPending}
            >
              {refresh.isPending ? (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              ) : (
                <RefreshCw data-icon="inline-start" />
              )}
              Refresh preview
            </Button>
            <Button variant="destructive" onClick={() => setDialog("discard")}>
              <Trash2 data-icon="inline-start" />
              Discard
            </Button>
            <RunDiscardDialog
              run={run}
              open={dialog === "discard"}
              onOpenChange={setOpen("discard")}
            />
          </PermissionGate>
          <PermissionGate require={PROGRESSION_PERMISSIONS.runCommit}>
            <Button onClick={() => setDialog("commit")}>
              <CheckCheck data-icon="inline-start" />
              Commit run
            </Button>
            <RunCommitDialog
              run={run}
              open={dialog === "commit"}
              onOpenChange={setOpen("commit")}
            />
          </PermissionGate>
        </>
      )}

      {reversible && (
        <PermissionGate require={PROGRESSION_PERMISSIONS.runReverse}>
          <Button variant="destructive" onClick={() => setDialog("reverse")}>
            <Undo2 data-icon="inline-start" />
            Reverse run
          </Button>
          <RunReverseDialog
            run={run}
            open={dialog === "reverse"}
            onOpenChange={setOpen("reverse")}
          />
        </PermissionGate>
      )}
    </div>
  )
}
