"use client"

import { Loader2 } from "lucide-react"
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
import { parseGatewayError } from "../lib/gateway-errors"
import type { PaymentGateway } from "../types"
import { GatewayErrorAlert } from "./gateway-error-alert"

interface DeleteGatewayDialogProps {
  gateway: PaymentGateway | null
  onOpenChange: (open: boolean) => void
}

export function DeleteGatewayDialog({
  gateway,
  onOpenChange,
}: DeleteGatewayDialogProps) {
  const remove = useDeletePaymentGateway()
  // Shown inline instead of a toast; 409 GATEWAY_IN_USE lists what uses it.
  const failure = remove.error ? parseGatewayError(remove.error) : null
  const inUse = failure?.inUse ?? null

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
        {failure && (
          <GatewayErrorAlert
            message={
              inUse
                ? "This gateway is still in use, so it can't be deleted:"
                : failure.message
            }
            inUse={inUse}
            action="delete"
          />
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>
            Cancel
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            onClick={confirm}
            disabled={remove.isPending || inUse !== null}
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
