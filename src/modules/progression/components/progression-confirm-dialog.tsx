"use client"

import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"
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
import type { ReadinessIssue } from "../types"

interface ProgressionConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel: string
  onConfirm: () => void
  pending: boolean
  /** Outstanding blockers, repeated here so they're seen before confirming. */
  blockers?: ReadinessIssue[]
  variant?: "default" | "destructive"
}

// Confirmation for calendar actions (lock/activate). Stays open while the
// request is in flight — the caller closes it on success — so a failure is
// never hidden behind a dialog that already dismissed itself.
export function ProgressionConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  pending,
  blockers = [],
  variant = "default",
}: ProgressionConfirmDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              {description}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {blockers.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
            <p className="text-xs font-semibold text-red-800 dark:text-red-200">
              The readiness check still reports {blockers.length} blocker
              {blockers.length === 1 ? "" : "s"}:
            </p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-red-700 dark:text-red-300">
              {blockers.map((b, i) => (
                <li key={`${b.code}-${i}`}>{b.message}</li>
              ))}
            </ul>
            <p className="mt-1.5 text-[11px] text-red-700/80 dark:text-red-300/80">
              The server has the final say and may refuse this action.
            </p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button variant={variant} onClick={onConfirm} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
