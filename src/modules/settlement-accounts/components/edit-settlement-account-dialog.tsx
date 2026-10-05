"use client"

import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { EditSettlementAccountFormSchema } from "../schemas"
import {
  classifySettlementError,
  partitionFieldErrors,
} from "../lib/settlement-errors"
import { useUpdateSettlementAccount } from "../hooks/use-settlement-mutations"
import type { EditSettlementAccountForm, SettlementAccount } from "../types"
import { MaskedAccountNumber } from "./masked-account-number"

interface EditSettlementAccountDialogProps {
  account: SettlementAccount | null
  onOpenChange: (open: boolean) => void
}

export function EditSettlementAccountDialog({
  account,
  onOpenChange,
}: EditSettlementAccountDialogProps) {
  const update = useUpdateSettlementAccount()
  // Keyed by account so an error never carries over to another account.
  const [submitError, setSubmitError] = useState<{
    accountId: number
    message: string
  } | null>(null)
  const shownError =
    submitError && submitError.accountId === account?.id
      ? submitError.message
      : null
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<EditSettlementAccountForm>({
    resolver: zodResolver(EditSettlementAccountFormSchema),
    defaultValues: { label: "", isActive: true },
  })

  useEffect(() => {
    if (account) reset({ label: account.label, isActive: account.isActive })
  }, [account, reset])

  function onSubmit(values: EditSettlementAccountForm) {
    if (!account) return
    setSubmitError(null)
    const deactivating = account.isActive && !values.isActive
    update.mutate(
      { id: account.id, payload: values },
      {
        onSuccess: () => onOpenChange(false),
        onError: (error) => {
          const classified = classifySettlementError(
            error,
            deactivating ? "deactivate-account" : "update-account"
          )
          if (classified.kind !== "validation") {
            setSubmitError({
              accountId: account.id,
              message: classified.message,
            })
            return
          }
          const { mapped, unmapped } = partitionFieldErrors(
            classified.fieldErrors,
            (key) => (key === "label" ? "label" : null)
          )
          for (const { path, message } of mapped) {
            setError(path, { type: "server", message })
          }
          if (unmapped.length > 0 || mapped.length === 0) {
            setSubmitError({
              accountId: account.id,
              message: unmapped.join(" ") || classified.message,
            })
          }
        },
      }
    )
  }

  return (
    <Dialog open={account !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit settlement account</DialogTitle>
          <DialogDescription>
            Only the label and active status can change.
          </DialogDescription>
        </DialogHeader>

        {account && (
          <div className="space-y-1 rounded-lg border border-border bg-muted/30 p-3 text-sm dark:bg-muted/10">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Lock size={12} aria-hidden /> Bank details (read-only)
            </p>
            <p className="text-foreground">{account.bankName}</p>
            <MaskedAccountNumber value={account.accountNumber} />
            <p className="text-muted-foreground">{account.accountName}</p>
            <p className="pt-1 text-xs text-muted-foreground">
              Bank details are immutable because gateway subaccounts are created
              from them. To change bank or account number, add a new settlement
              account and deactivate this one.
            </p>
          </div>
        )}

        <form
          id="edit-settlement-account-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="sa-edit-label">
              Label <span className="text-destructive">*</span>
            </Label>
            <Input
              id="sa-edit-label"
              aria-invalid={!!errors.label}
              aria-describedby={
                errors.label ? "sa-edit-label-error" : undefined
              }
              {...register("label")}
            />
            {errors.label && (
              <p id="sa-edit-label-error" className="text-xs text-destructive">
                {errors.label.message}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label htmlFor="sa-edit-active">Active</Label>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Switch
                  id="sa-edit-active"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
          {shownError && (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive dark:bg-destructive/10"
            >
              {shownError}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-settlement-account-form"
            disabled={!isDirty || update.isPending}
            className="gap-1.5"
          >
            {update.isPending && (
              <Loader2 size={14} className="animate-spin" aria-hidden />
            )}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
