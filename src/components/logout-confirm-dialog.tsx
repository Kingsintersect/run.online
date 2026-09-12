"use client"

import { ConfirmDialog } from "@/components/confirm-dialog"

interface LogoutConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
}

export function LogoutConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: LogoutConfirmDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Log out?"
      description="You will be signed out of your account and returned to the sign-in page."
      confirmLabel="Log out"
      variant="destructive"
    />
  )
}
