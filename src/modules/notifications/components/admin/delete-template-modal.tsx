"use client"

import { AlertTriangle, Loader2 } from "lucide-react"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import type { NotificationTemplate } from "../../types"

interface DeleteTemplateModalProps {
  open: boolean
  onClose: () => void
  template: NotificationTemplate | null
  onConfirm: () => Promise<void>
  isDeactivating: boolean
}

export function DeleteTemplateModal({
  open,
  onClose,
  template,
  onConfirm,
  isDeactivating,
}: DeleteTemplateModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      footer={
        <div className="flex justify-end gap-2 p-5 pt-0">
          <Button variant="outline" onClick={onClose} disabled={isDeactivating}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeactivating}
          >
            {isDeactivating && (
              <Loader2
                className="size-4 animate-spin"
                data-icon="inline-start"
              />
            )}
            Deactivate
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
            Deactivate template?
          </p>
          {template && (
            <p className="mt-1 text-sm text-muted-foreground">
              This will deactivate{" "}
              <span className="font-mono font-medium text-foreground">
                {template.name}
              </span>
              . It won&apos;t be usable for new sends, but notifications already
              sent will not be affected. There is no way to reactivate a
              template once deactivated.
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}
