"use client"

import { useEffect, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { BadgeCheck, Loader2, SearchCheck } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { CreateSettlementAccountSchema } from "../schemas"
import {
  describeApiError,
  isWriteRouteMissing,
} from "../services/settlement-accounts.service"
import {
  useCreateSettlementAccount,
  useResolveAccountName,
} from "../hooks/use-settlement-mutations"
import type { SettlementProgramOption } from "../hooks/use-settlement-programs"
import type { CreateSettlementAccount } from "../types"
import { BankSelect } from "./bank-select"
import { SAVE_DISABLED_REASON } from "./backend-unavailable-banner"

interface AddSettlementAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  programs: SettlementProgramOption[]
  defaultMajorProgramId: number | null
  /** True in fallback mode — the form still validates, Save is disabled. */
  saveDisabled: boolean
}

interface ResolvedName {
  bankCode: string
  accountNumber: string
  accountName: string
}

export function AddSettlementAccountDialog({
  open,
  onOpenChange,
  programs,
  defaultMajorProgramId,
  saveDisabled,
}: AddSettlementAccountDialogProps) {
  const create = useCreateSettlementAccount()
  const resolve = useResolveAccountName()
  const [resolved, setResolved] = useState<ResolvedName | null>(null)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [validatedOnly, setValidatedOnly] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    reset,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<CreateSettlementAccount>({
    resolver: zodResolver(CreateSettlementAccountSchema),
    defaultValues: {
      majorProgramId: defaultMajorProgramId,
      label: "",
      bankCode: "",
      accountNumber: "",
      isActive: true,
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        majorProgramId: defaultMajorProgramId,
        label: "",
        bankCode: "",
        accountNumber: "",
        isActive: true,
      })
      setResolved(null)
      setResolveError(null)
      setValidatedOnly(false)
      resolve.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on open only
  }, [open, defaultMajorProgramId, reset])

  const bankCode = useWatch({ control, name: "bankCode" })
  const accountNumber = useWatch({ control, name: "accountNumber" })
  const currentResolved =
    resolved &&
    resolved.bankCode === bankCode &&
    resolved.accountNumber === accountNumber.trim()
      ? resolved
      : null

  async function onVerify() {
    setResolveError(null)
    const ok = await trigger(["bankCode", "accountNumber"])
    if (!ok) return
    const values = getValues()
    resolve.mutate(
      { bankCode: values.bankCode, accountNumber: values.accountNumber.trim() },
      {
        onSuccess: (res) =>
          setResolved({
            bankCode: values.bankCode,
            accountNumber: values.accountNumber.trim(),
            accountName: res.accountName,
          }),
        onError: (error) =>
          setResolveError(
            isWriteRouteMissing(error)
              ? "Name enquiry isn't available on the server yet."
              : describeApiError(error, "Couldn't find that account.")
          ),
      }
    )
  }

  function onSubmit(values: CreateSettlementAccount) {
    if (saveDisabled) {
      setValidatedOnly(true)
      return
    }
    create.mutate(values, { onSuccess: () => onOpenChange(false) })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add settlement account</DialogTitle>
          <DialogDescription>
            The bank account payments for this major program settle into. The
            server verifies the account name and links it to each split-capable
            payment gateway.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-settlement-account-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="sa-label">
              Label <span className="text-destructive">*</span>
            </Label>
            <Input
              id="sa-label"
              placeholder="e.g. Part-Time Programme Collections"
              aria-invalid={!!errors.label}
              aria-describedby={errors.label ? "sa-label-error" : undefined}
              {...register("label")}
            />
            {errors.label && (
              <p id="sa-label-error" className="text-xs text-destructive">
                {errors.label.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sa-program">Major program</Label>
            <Controller
              control={control}
              name="majorProgramId"
              render={({ field }) => (
                <Select
                  value={field.value?.toString() ?? ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger id="sa-program" className="w-full">
                    <SelectValue placeholder="Select major program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sa-bank">
              Bank <span className="text-destructive">*</span>
            </Label>
            <Controller
              control={control}
              name="bankCode"
              render={({ field }) => (
                <BankSelect
                  id="sa-bank"
                  value={field.value}
                  onChange={field.onChange}
                  invalid={!!errors.bankCode}
                  describedBy={errors.bankCode ? "sa-bank-error" : undefined}
                />
              )}
            />
            {errors.bankCode && (
              <p id="sa-bank-error" className="text-xs text-destructive">
                {errors.bankCode.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sa-account-number">
              Account number <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="sa-account-number"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit NUBAN"
                className="font-mono tracking-wider"
                aria-invalid={!!errors.accountNumber}
                aria-describedby={
                  errors.accountNumber ? "sa-account-number-error" : undefined
                }
                {...register("accountNumber")}
              />
              <Button
                type="button"
                variant="outline"
                onClick={onVerify}
                disabled={saveDisabled || resolve.isPending}
                className="shrink-0 gap-1.5"
              >
                {resolve.isPending ? (
                  <Loader2 size={14} className="animate-spin" aria-hidden />
                ) : (
                  <SearchCheck size={14} aria-hidden />
                )}
                Verify account name
              </Button>
            </div>
            {errors.accountNumber && (
              <p
                id="sa-account-number-error"
                className="text-xs text-destructive"
              >
                {errors.accountNumber.message}
              </p>
            )}
            <div aria-live="polite">
              {saveDisabled ? (
                <p className="text-xs text-muted-foreground">
                  Account name verification isn&apos;t available until the
                  server ships name enquiry.
                </p>
              ) : currentResolved ? (
                <p className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
                  <BadgeCheck size={14} aria-hidden />
                  <span>
                    Account name: <strong>{currentResolved.accountName}</strong>
                  </span>
                </p>
              ) : resolveError ? (
                <p role="alert" className="text-xs text-destructive">
                  {resolveError}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="sa-active">Active</Label>
              <p className="text-xs text-muted-foreground">
                Inactive accounts can&apos;t be used in split rules.
              </p>
            </div>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Switch
                  id="sa-active"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          {saveDisabled && (
            <p
              role="status"
              className="rounded-md bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
            >
              {validatedOnly
                ? "Looks good — the details are valid. "
                : "You can fill in and check these details now. "}
              {SAVE_DISABLED_REASON}
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
          {saveDisabled ? (
            <Button
              type="submit"
              form="add-settlement-account-form"
              variant="secondary"
            >
              Check details
            </Button>
          ) : null}
          <Button
            type="submit"
            form="add-settlement-account-form"
            disabled={saveDisabled || create.isPending}
            title={saveDisabled ? SAVE_DISABLED_REASON : undefined}
            className="gap-1.5"
          >
            {create.isPending && (
              <Loader2 size={14} className="animate-spin" aria-hidden />
            )}
            Save account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
