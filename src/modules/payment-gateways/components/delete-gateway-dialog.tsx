"use client"

import { AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useDeletePaymentGateway } from "../hooks/use-payment-gateway-mutations"
import { isGatewayInUse } from "../services/payment-gateways.service"
import type { PaymentGateway } from "../types"

interface DeleteGatewayDialogProps {
  gateway: PaymentGateway | null
  onOpenChange: (open: boolean) => void
}

export function DeleteGatewayDialog({
  gateway,
  onOpenChange,
}: DeleteGatewayDialogProps) {
  const remove = useDeletePaymentGateway()
  const inUse = isGatewayInUse(remove.error)

  const close = (open: boolean) => {
    if (remove.isPending) return
    if (!open) remove.reset()
    onOpenChange(open)
  }

  const confirm = () => {
    if (!gateway) return
    remove.mutate(gateway.id, {
      onSuccess: () => {
        toast.success(`${gateway.displayName} deleted`)
        close(false)
      },
      onError: (err) => {
        if (!isGatewayInUse(err)) toast.error(err.message)
      },
    })
  }

  return (
    <AlertDialog open={gateway !== null} onOpenChange={close}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete gateway?</AlertDialogTitle>
          <AlertDialogDescription>
            {gateway?.displayName} and its stored credentials will be removed.
            This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {inUse && (
          <div
            role="alert"
            className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          >
            <AlertTriangle
              className="mt-0.5 size-3.5 shrink-0"
              aria-hidden="true"
            />
            <span>
              This gateway is still in use: a major program is routed to it (as
              primary or fallback), or it has pending payments. Move those
              programs to another gateway in Program routing and let pending
              payments settle, then try again.
            </span>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>
            Cancel
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            onClick={confirm}
            disabled={remove.isPending || inUse}
          >
            {remove.isPending && (
              <Loader2
                className="animate-spin"
                data-icon="inline-start"
                aria-hidden="true"
              />
            )}
            Delete gateway
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
