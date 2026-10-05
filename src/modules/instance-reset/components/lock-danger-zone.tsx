"use client"

import { useMemo, useState } from "react"
import { Lock } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useResetAvailability } from "../hooks/use-instance-reset"
import { useLockInstance } from "../hooks/use-instance-reset-mutations"
import { parseResetError } from "../lib/reset-errors"
import { BlockedReason } from "./reset-badges"
import { ResetErrorAlert } from "./reset-error-alert"
import { TypedConfirmationForm } from "./typed-confirmation-form"

/** POST /lock: one-way "mark instance as live", in a danger zone. */
export function LockDangerZone() {
  const { canLock, lockBlockedReason, status, refetchStatus } =
    useResetAvailability()
  const lock = useLockInstance()
  const [open, setOpen] = useState(false)
  const error = useMemo(
    () => (lock.error ? parseResetError(lock.error) : null),
    [lock.error]
  )

  const close = () => {
    if (lock.isPending) return
    setOpen(false)
    lock.reset()
  }

  return (
    <section
      aria-labelledby="danger-zone-heading"
      className="rounded-2xl border border-red-300 p-5 dark:border-red-900"
    >
      <h2
        id="danger-zone-heading"
        className="text-base font-semibold text-red-700 dark:text-red-400"
      >
        Danger zone
      </h2>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            Mark instance as live
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Do this once real students and staff start using the portal. It
            permanently disables instance reset on this server, and it
            can&apos;t be undone from the portal or the API.
          </p>
        </div>
        <div className="space-y-1.5">
          <Button
            type="button"
            variant="destructive"
            disabled={!canLock}
            aria-describedby={!canLock ? "lock-reason" : undefined}
            onClick={() => {
              // Fresh institution name (it can change after a full reset).
              refetchStatus()
              setOpen(true)
            }}
          >
            <Lock data-icon="inline-start" aria-hidden="true" />
            Mark instance as live…
          </Button>
        </div>
      </div>
      <BlockedReason
        id="lock-reason"
        reason={lockBlockedReason}
        className="mt-2"
      />

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <DialogContent
          className="sm:max-w-lg"
          onEscapeKeyDown={(e) => lock.isPending && e.preventDefault()}
          onInteractOutside={(e) => lock.isPending && e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Mark this instance as live?</DialogTitle>
            <DialogDescription>
              This is irreversible. Once locked, no one, including super admins,
              can reset any data on this instance again.
            </DialogDescription>
          </DialogHeader>
          {error && !error.field && <ResetErrorAlert error={error} />}
          {status ? (
            <TypedConfirmationForm
              institutionName={status.institutionName}
              submitLabel="Lock permanently"
              isPending={lock.isPending}
              serverError={error}
              blockedReason={canLock ? null : lockBlockedReason}
              onCancel={close}
              onSubmit={(values) =>
                lock.lock(values, {
                  onSuccess: () => {
                    toast.success(
                      "Instance marked as live. Reset is now disabled."
                    )
                    setOpen(false)
                    lock.reset()
                  },
                })
              }
            />
          ) : (
            <p className="text-sm text-muted-foreground">{lockBlockedReason}</p>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
