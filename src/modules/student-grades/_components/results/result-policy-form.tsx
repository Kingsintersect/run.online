"use client"

import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useResultPolicy, useResultSchemes } from "../../hooks/use-results"
import { useUpdateResultPolicy } from "../../hooks/use-results-mutations"
import { ResultPolicyFormSchema } from "../../schemas"
import {
  fieldError,
  toResultsApiError,
  type ResultsApiError,
} from "../../lib/results-errors"
import { NotAvailableNotice } from "./not-available-notice"
import type { ResultPolicyForm as PolicyValues } from "../../types"

const nullableNumber = {
  setValueAs: (v: string | number | null) =>
    v === "" || v == null ? null : Number(v),
}

interface ResultPolicyFormProps {
  majorProgramId: number
  canManage: boolean
}

// Result policy for one major program (C5 result_policies). Client
// validation mirrors the contract; the server is the authority.
export function ResultPolicyForm({
  majorProgramId,
  canManage,
}: ResultPolicyFormProps) {
  const policy = useResultPolicy(majorProgramId)
  const schemes = useResultSchemes(majorProgramId)
  const update = useUpdateResultPolicy(majorProgramId)
  const [serverError, setServerError] = useState<ResultsApiError | null>(null)
  const form = useForm<PolicyValues>({
    resolver: zodResolver(ResultPolicyFormSchema),
  })

  const current = policy.data?.available ? policy.data.data : null
  useEffect(() => {
    if (current)
      form.reset({
        defaultGradingSchemeId: current.defaultGradingSchemeId,
        feeGateEnabled: current.feeGateEnabled,
        adjustmentApprovalThreshold: current.adjustmentApprovalThreshold,
        totalRounding: current.totalRounding,
        autoPullEnabled: current.autoPullEnabled,
      })
  }, [current, form])

  const submit = form.handleSubmit(async (body) => {
    setServerError(null)
    try {
      await update.mutateAsync(body)
      toast.success("Result policy saved.")
    } catch (error) {
      if (error instanceof Error) {
        const e = toResultsApiError(error)
        setServerError(e)
        if (Object.keys(e.fieldErrors).length === 0) toast.error(e.message)
      }
    }
  })

  if (policy.isLoading)
    return (
      <div className="h-60 animate-pulse rounded-2xl bg-muted/40" aria-busy />
    )
  if (policy.isError)
    return <p className="text-sm text-destructive">{policy.error.message}</p>
  if (policy.data?.available === false)
    return (
      <NotAvailableNotice title="Result policies aren't available on the server yet" />
    )

  const errors = form.formState.errors
  const disabled = !canManage

  return (
    <form
      onSubmit={submit}
      noValidate
      className="max-w-2xl space-y-5 rounded-2xl border border-border bg-card p-5"
    >
      <fieldset disabled={disabled} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="policy-scheme">Default grading scheme</Label>
          <select
            id="policy-scheme"
            {...form.register("defaultGradingSchemeId", nullableNumber)}
            className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm dark:bg-muted/20"
          >
            <option value="">None</option>
            {(schemes.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Used for every program in this major program that doesn&apos;t set
            its own scheme.
          </p>
        </div>

        <Controller
          control={form.control}
          name="feeGateEnabled"
          render={({ field }) => (
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor="policy-fee-gate">
                  Withhold results for outstanding fees
                </Label>
                <p className="text-xs text-muted-foreground">
                  When on, students with an unpaid, partly paid or overdue
                  mandatory invoice for the session are skipped at publish and
                  picked up by a later publish once they&apos;ve paid.
                </p>
              </div>
              <Switch
                id="policy-fee-gate"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </div>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="policy-threshold">
              Adjustment approval threshold (marks)
            </Label>
            <Input
              id="policy-threshold"
              type="number"
              step="0.01"
              placeholder="Never requires approval"
              {...form.register("adjustmentApprovalThreshold", nullableNumber)}
            />
            <p className="text-xs text-muted-foreground">
              HOD/Dean adjustments that change any student by more than this
              wait for an admin. Leave empty to never require approval.
            </p>
            <p className="text-xs text-destructive">
              {errors.adjustmentApprovalThreshold?.message ??
                fieldError(serverError, "adjustmentApprovalThreshold")}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="policy-rounding">Total rounding</Label>
            <select
              id="policy-rounding"
              {...form.register("totalRounding")}
              className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm dark:bg-muted/20"
            >
              <option value="NONE">None (keep 2 decimals)</option>
              <option value="HALF_UP_INTEGER">
                Round half up to a whole number
              </option>
            </select>
          </div>
        </div>

        <Controller
          control={form.control}
          name="autoPullEnabled"
          render={({ field }) => (
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="policy-auto-pull">
                  Pull from Moodle automatically
                </Label>
                <p className="text-xs text-muted-foreground">
                  Keeps draft sheets in step with Moodle without a manual pull.
                </p>
              </div>
              <Switch
                id="policy-auto-pull"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </div>
          )}
        />
      </fieldset>

      {canManage && (
        <Button type="submit" disabled={update.isPending}>
          {update.isPending && (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          )}
          Save policy
        </Button>
      )}
    </form>
  )
}
