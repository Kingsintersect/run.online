"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertTriangle, Loader2, ShieldCheck, ShieldOff } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { DebtOverridePayloadSchema } from "../schemas"
import {
  useAddDebtOverride,
  useRemoveDebtOverride,
} from "../hooks/use-progression-mutations"
import { toProgressionApiError } from "../lib/errors"
import { PROGRESSION_PERMISSIONS } from "../lib/permissions"
import type { DebtOverridePayload, SessionStanding } from "../types"

interface StandingDebtOverrideProps {
  standing: SessionStanding
}

function ErrorLine({ error }: { error: Error | null }) {
  if (!error) return null
  const e = toProgressionApiError(error)
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
    >
      <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden />
      {e.message}
      {e.notAvailable ? " Nothing was changed." : ""}
    </p>
  )
}

// "Allow registration with debt" / "Remove allowance" on the student's
// current target standing (standings.debt_override). The reason is required
// (Zod + RHF); removal always confirms. Whether the student actually owes
// anything is the backend's call — an advisory is shown, never a lock.
export function StandingDebtOverride({ standing }: StandingDebtOverrideProps) {
  return (
    <PermissionGate require={PROGRESSION_PERMISSIONS.standingsDebtOverride}>
      {standing.debt_override ? (
        <RemoveAllowance standing={standing} />
      ) : (
        <AddAllowance standing={standing} />
      )}
    </PermissionGate>
  )
}

function AddAllowance({ standing }: StandingDebtOverrideProps) {
  const [open, setOpen] = useState(false)
  const add = useAddDebtOverride(standing.student_id)
  const fieldId = `debt-override-reason-${standing.id}`

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DebtOverridePayload>({
    resolver: zodResolver(DebtOverridePayloadSchema),
    defaultValues: { reason: "" },
  })

  function close() {
    reset()
    add.reset()
    setOpen(false)
  }

  function onSubmit(payload: DebtOverridePayload) {
    add.mutate(
      { standingId: standing.id, payload },
      {
        onSuccess: () => {
          toast.success("Registration allowed despite outstanding fees")
          close()
        },
      }
    )
  }

  if (!open) {
    return (
      <div className="mt-3">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => setOpen(true)}
        >
          <ShieldCheck size={13} aria-hidden />
          Allow registration with debt
        </Button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mt-3 space-y-2.5 rounded-xl border border-border bg-muted/30 p-3 dark:bg-muted/20"
      aria-label={`Allow registration with debt for ${standing.academic_session.name}`}
    >
      {standing.financial_status === "CLEARED" && (
        <p className="text-[11px] text-muted-foreground">
          The server reports no outstanding fees for this student right now. You
          can still record an allowance.
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor={fieldId}>
          Reason <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id={fieldId}
          rows={3}
          placeholder="e.g. Payment plan agreed with the bursary"
          aria-required="true"
          aria-invalid={!!errors.reason}
          aria-describedby={errors.reason ? `${fieldId}-error` : undefined}
          {...register("reason")}
        />
        {errors.reason && (
          <p id={`${fieldId}-error`} className="text-xs text-destructive">
            {errors.reason.message}
          </p>
        )}
      </div>
      <ErrorLine error={add.error} />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={close}
          disabled={add.isPending}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={add.isPending}>
          {add.isPending && (
            <Loader2 size={13} className="mr-1.5 animate-spin" aria-hidden />
          )}
          Allow registration
        </Button>
      </div>
    </form>
  )
}

function RemoveAllowance({ standing }: StandingDebtOverrideProps) {
  const [confirming, setConfirming] = useState(false)
  const remove = useRemoveDebtOverride(standing.student_id)

  return (
    <div className="mt-3 space-y-2">
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 text-destructive hover:text-destructive"
        onClick={() => {
          remove.reset()
          setConfirming(true)
        }}
        disabled={remove.isPending}
      >
        {remove.isPending ? (
          <Loader2 size={13} className="animate-spin" aria-hidden />
        ) : (
          <ShieldOff size={13} aria-hidden />
        )}
        Remove allowance
      </Button>
      <ErrorLine error={remove.error} />
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Remove the registration allowance?"
        description={`The student will again be blocked from registering for ${standing.academic_session.name} until their outstanding fees are paid or waived.`}
        confirmLabel="Remove allowance"
        onConfirm={() => {
          setConfirming(false)
          remove.mutate(standing.id, {
            onSuccess: () => toast.success("Registration allowance removed"),
          })
        }}
      />
    </div>
  )
}
