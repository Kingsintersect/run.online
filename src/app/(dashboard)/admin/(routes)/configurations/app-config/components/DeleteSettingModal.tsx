"use client"

import { AlertTriangle, Loader2 } from "lucide-react"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import type { Setting } from "@/types/school"

interface DeleteSettingModalProps {
  open: boolean
  onClose: () => void
  setting: Setting | null
  onConfirm: () => Promise<void>
  isDeleting: boolean
}

export function DeleteSettingModal({
  open,
  onClose,
  setting,
  onConfirm,
  isDeleting,
}: DeleteSettingModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      footer={
        <div className="flex justify-end gap-2 p-5 pt-0">
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting && (
              <Loader2
                className="size-4 animate-spin"
                data-icon="inline-start"
              />
            )}
            Delete
          </Button>
        </div>
      }
    >
      <div className="flex gap-3 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
          <AlertTriangle size={18} className="text-destructive" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Delete setting?
          </p>
          {setting && (
            <p className="mt-1 text-sm text-muted-foreground">
              This will permanently remove{" "}
              <span className="font-mono font-medium text-foreground">
                {setting.key}
              </span>
              . This action cannot be undone.
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}
