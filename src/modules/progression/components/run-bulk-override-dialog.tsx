"use client"

import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useBulkOverrideRunItems } from "../hooks/use-progression-mutations"
import { toProgressionApiError } from "../lib/errors"
import { RunOverrideForm } from "./run-override-form"
import type { OverrideRunItemPayload } from "../types"

interface RunBulkOverrideDialogProps {
  runId: number
  itemIds: number[]
  open: boolean
  onClose: () => void
  onDone: () => void
}

/** Apply one final outcome + reason to every selected student. */
export function RunBulkOverrideDialog({
  runId,
  itemIds,
  open,
  onClose,
  onDone,
}: RunBulkOverrideDialogProps) {
  const bulk = useBulkOverrideRunItems(runId)
  const error = bulk.error ? toProgressionApiError(bulk.error) : null
  const n = itemIds.length

  function close() {
    bulk.reset()
    onClose()
  }

  function submit(values: OverrideRunItemPayload) {
    bulk.mutate(
      { item_ids: itemIds, ...values },
      {
        onSuccess: () => {
          toast.success(`Outcome updated for ${n} student${n === 1 ? "" : "s"}`)
          bulk.reset()
          onDone()
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Override {n} student{n === 1 ? "" : "s"}
          </DialogTitle>
          <DialogDescription>
            Every selected student gets the same final outcome and reason. The
            system&apos;s proposed outcome stays visible beside it.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <RunOverrideForm
            idPrefix="run-bulk"
            submitLabel={`Override ${n} student${n === 1 ? "" : "s"}`}
            pending={bulk.isPending}
            error={error}
            onSubmit={submit}
            onCancel={close}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
