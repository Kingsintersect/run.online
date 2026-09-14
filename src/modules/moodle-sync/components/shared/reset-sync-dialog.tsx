"use client"

import { useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, Loader2, RotateCcw } from "lucide-react"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { useResetModule } from "../../hooks/use-sync-mutations"
import type { ResetModule } from "../../types"

// Moodle Sync Reset — sandbox/moodle-sync-reconciliation/. Only offered on pull-only cache modules (assessments,
// calendar, Moodle grades) — `ResetModule` excludes every module other portal
// data links to, so this can't be wired onto categories/courses/users by
// mistake.

const CONFIRM_WORD = "RESET"

interface ResetSyncButtonProps {
  module: ResetModule
  /** Lower-case description used in copy, e.g. "calendar & Zoom events". */
  moduleLabel: string
  /** Extra reassurance specific to this module, shown in the warning. */
  note?: string
}

export function ResetSyncButton({
  module,
  moduleLabel,
  note,
}: ResetSyncButtonProps) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState("")
  const [repull, setRepull] = useState(true)
  const reset = useResetModule()

  const confirmed = typed.trim().toUpperCase() === CONFIRM_WORD

  const handleClose = () => {
    setOpen(false)
    setTyped("")
    setRepull(true)
    reset.reset()
  }

  const handleReset = async () => {
    if (!confirmed) return
    try {
      const result = await reset.mutateAsync({ module, repull })
      toast.success(
        result.repullQueued
          ? `Reset queued — fresh ${moduleLabel} will appear once the pull finishes.`
          : `Deleted ${result.deleted ?? 0} ${moduleLabel} record(s).`
      )
      handleClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed")
    }
  }

  const confirmId = `reset-confirm-${module}`
  const repullId = `reset-repull-${module}`

  return (
    <>
      <PermissionGate require={{ resource: "moodle-sync", action: "reset" }}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive"
        >
          <RotateCcw size={13} />
          Reset
        </Button>
      </PermissionGate>

      <Modal
        open={open}
        onClose={handleClose}
        title={`Reset ${moduleLabel}`}
        subtitle="Clears what the portal pulled from Moodle."
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={reset.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={!confirmed || reset.isPending}
            >
              {reset.isPending && (
                <Loader2
                  className="size-4 animate-spin"
                  data-icon="inline-start"
                />
              )}
              Reset {moduleLabel}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div className="space-y-1 text-foreground">
              <p>
                Deletes every {moduleLabel} record pulled from Moodle onto this
                portal. Moodle itself is not touched.
              </p>
              {note && <p className="text-muted-foreground">{note}</p>}
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Checkbox
              id={repullId}
              checked={repull}
              onCheckedChange={(v) => setRepull(v === true)}
            />
            <Label
              htmlFor={repullId}
              className="text-sm leading-snug font-normal"
            >
              Pull from Moodle again right after (recommended — runs in one job
              so the page is never left empty)
            </Label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={confirmId}>
              Type{" "}
              <span className="font-mono font-semibold">{CONFIRM_WORD}</span> to
              confirm
            </Label>
            <Input
              id={confirmId}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              aria-invalid={typed.length > 0 && !confirmed}
            />
          </div>
        </div>
      </Modal>
    </>
  )
}
