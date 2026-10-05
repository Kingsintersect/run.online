"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type FieldPath,
} from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Plus, Trash2 } from "lucide-react"
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
import { cn } from "@/lib/utils"
import type { FeeTypeResponse } from "@/modules/fee-management/types"
import { UpsertSplitRuleSchema } from "../schemas"
import {
  classifySettlementError,
  partitionFieldErrors,
} from "../lib/settlement-errors"
import { useUpsertSplitRule } from "../hooks/use-settlement-mutations"
import type {
  SettlementAccount,
  SplitEntry,
  SplitRule,
  UpsertSplitRule,
} from "../types"
import { SAVE_DISABLED_REASON } from "./backend-unavailable-banner"
import { SplitPreviewPanel } from "./split-preview-panel"

const ALL_FEES = "_ALL_FEES_" as const
const DEFAULT_SAMPLE_AMOUNT = "100000"

const ENTRY_KEY =
  /^entries\.(\d+)\.(settlementAccountId|splitType|value|isDefault)$/
const TOP_LEVEL_FIELDS = [
  "feeTypeId",
  "feeBearer",
  "isActive",
  "entries",
] as const

/** Map a Laravel 422 key (`entries.0.value`, `feeTypeId`, …) to a form path. */
function toRulePath(
  key: string,
  entryCount: number
): FieldPath<UpsertSplitRule> | null {
  const top = TOP_LEVEL_FIELDS.find((f) => f === key)
  if (top) return top
  const match = ENTRY_KEY.exec(key)
  if (!match) return null
  const index = Number(match[1])
  if (index >= entryCount) return null
  switch (match[2]) {
    case "settlementAccountId":
      return `entries.${index}.settlementAccountId`
    case "splitType":
      return `entries.${index}.splitType`
    case "value":
      return `entries.${index}.value`
    case "isDefault":
      return `entries.${index}.isDefault`
    default:
      return null
  }
}

interface SplitRuleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null → create a new rule. */
  rule: SplitRule | null
  majorProgramId: number
  accounts: SettlementAccount[]
  feeTypes: FeeTypeResponse[]
  /** Other rules in this program, to warn about replacing one. */
  existingRules: SplitRule[]
  saveDisabled: boolean
}

function emptyEntry(isDefault: boolean): SplitEntry {
  return {
    settlementAccountId: 0,
    splitType: "PERCENTAGE",
    value: 0,
    isDefault,
  }
}

function defaultsFor(
  rule: SplitRule | null,
  majorProgramId: number
): UpsertSplitRule {
  if (rule) {
    return {
      id: rule.id,
      majorProgramId: rule.majorProgramId,
      feeTypeId: rule.feeTypeId,
      feeBearer: rule.feeBearer,
      isActive: rule.isActive,
      entries: rule.entries.map((e) => ({ ...e })),
    }
  }
  return {
    majorProgramId,
    feeTypeId: null,
    feeBearer: "CUSTOMER",
    isActive: true,
    entries: [emptyEntry(true)],
  }
}

export function SplitRuleDialog({
  open,
  onOpenChange,
  rule,
  majorProgramId,
  accounts,
  feeTypes,
  existingRules,
  saveDisabled,
}: SplitRuleDialogProps) {
  const upsert = useUpsertSplitRule()
  const [sampleAmount, setSampleAmount] = useState(DEFAULT_SAMPLE_AMOUNT)
  const [sampleTouched, setSampleTouched] = useState(false)
  const [validatedOnly, setValidatedOnly] = useState(false)
  /** Form-level server error (409, 403, unmapped 422, …). */
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    setError,
    formState: { errors },
  } = useForm<UpsertSplitRule>({
    resolver: zodResolver(UpsertSplitRuleSchema),
    defaultValues: defaultsFor(rule, majorProgramId),
  })
  const { fields, append, remove } = useFieldArray({ control, name: "entries" })

  useEffect(() => {
    if (open) {
      reset(defaultsFor(rule, majorProgramId))
      setSampleTouched(false)
      setValidatedOnly(false)
      setSubmitError(null)
      upsert.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on open only
  }, [open, rule, majorProgramId, reset])

  const entries = useWatch({ control, name: "entries" })
  const feeTypeId = useWatch({ control, name: "feeTypeId" })
  const selectedFeeType = feeTypes.find((ft) => ft.id === feeTypeId)

  // The sample amount follows the chosen fee type until the user edits it.
  useEffect(() => {
    if (sampleTouched) return
    const amount = selectedFeeType ? Number(selectedFeeType.amount) : NaN
    setSampleAmount(
      Number.isFinite(amount) && amount > 0
        ? String(amount)
        : DEFAULT_SAMPLE_AMOUNT
    )
  }, [selectedFeeType, sampleTouched])

  const accountLabels = useMemo(
    () => new Map(accounts.map((a) => [a.id, a.label])),
    [accounts]
  )

  const replacing = existingRules.find(
    (r) => r.id !== rule?.id && r.feeTypeId === (feeTypeId ?? null)
  )

  function setDefault(index: number) {
    getValues("entries").forEach((_, i) => {
      setValue(`entries.${i}.isDefault`, i === index, { shouldDirty: true })
    })
    setValue(`entries.${index}.value`, 0, { shouldDirty: true })
  }

  function removeEntry(index: number) {
    const wasDefault = getValues(`entries.${index}.isDefault`)
    remove(index)
    // Keep exactly one default: hand it to the first remaining entry.
    if (wasDefault && getValues("entries").length > 0) setDefault(0)
  }

  function onSubmit(values: UpsertSplitRule) {
    if (saveDisabled) {
      setValidatedOnly(true)
      return
    }
    const payload: UpsertSplitRule = {
      ...values,
      majorProgramId,
      entries: values.entries.map((e) =>
        e.isDefault ? { ...e, value: 0 } : e
      ),
    }
    setSubmitError(null)
    upsert.mutate(payload, {
      onSuccess: () => onOpenChange(false),
      onError: (error) => {
        const classified = classifySettlementError(error, "save-split-rule")
        if (classified.kind !== "validation") {
          // 409 SPLIT_RULE_EXISTS, 403, … — shown inline, dialog stays open.
          setSubmitError(classified.message)
          return
        }
        const { mapped, unmapped } = partitionFieldErrors(
          classified.fieldErrors,
          (key) => toRulePath(key, payload.entries.length)
        )
        for (const { path, message } of mapped) {
          setError(path, { type: "server", message })
        }
        if (unmapped.length > 0 || mapped.length === 0) {
          setSubmitError(unmapped.join(" ") || classified.message)
        }
      },
    })
  }

  const entriesRootError =
    errors.entries?.root?.message ?? errors.entries?.message

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl lg:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {rule ? "Edit split rule" : "New split rule"}
          </DialogTitle>
          <DialogDescription>
            Divide each payment across settlement accounts by percentage or
            exact amount. One account receives whatever is left.
          </DialogDescription>
        </DialogHeader>

        <form
          id="split-rule-form"
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]"
          noValidate
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sr-fee-type">Applies to</Label>
                <Controller
                  control={control}
                  name="feeTypeId"
                  render={({ field }) => (
                    <Select
                      value={field.value?.toString() ?? ALL_FEES}
                      onValueChange={(v) =>
                        field.onChange(v === ALL_FEES ? null : Number(v))
                      }
                    >
                      <SelectTrigger
                        id="sr-fee-type"
                        className="w-full"
                        aria-invalid={!!errors.feeTypeId}
                        aria-describedby={
                          errors.feeTypeId ? "sr-fee-type-error" : undefined
                        }
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_FEES}>
                          All fees of this program
                        </SelectItem>
                        {feeTypes.map((ft) => (
                          <SelectItem key={ft.id} value={ft.id.toString()}>
                            {ft.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  A fee-type rule wins over the all-fees rule.
                </p>
                {errors.feeTypeId && (
                  <p
                    id="sr-fee-type-error"
                    className="text-xs text-destructive"
                  >
                    {errors.feeTypeId.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sr-fee-bearer">Gateway charge paid by</Label>
                <Controller
                  control={control}
                  name="feeBearer"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="sr-fee-bearer" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CUSTOMER">
                          Customer (student)
                        </SelectItem>
                        <SelectItem value="INSTITUTION">Institution</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.feeBearer && (
                  <p className="text-xs text-destructive">
                    {errors.feeBearer.message}
                  </p>
                )}
              </div>
            </div>

            {replacing && (
              <p className="rounded-md bg-amber-50 p-2.5 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                {replacing.isActive
                  ? `An active rule for ${replacing.feeTypeName ?? "all fees of this program"} already exists. The server only allows one active rule per fee type, so edit that one instead, or save this one as inactive.`
                  : `An inactive rule for ${replacing.feeTypeName ?? "all fees of this program"} already exists; it stays as it is.`}
              </p>
            )}

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label htmlFor="sr-active">Active</Label>
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <Switch
                    id="sr-active"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium text-foreground">
                Accounts
              </legend>
              {accounts.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No settlement accounts to choose yet — add one on the Accounts
                  tab. The preview still works with unnamed entries.
                </p>
              )}

              {fields.map((field, index) => {
                const entry = entries?.[index]
                const isDefault = entry?.isDefault ?? false
                const entryErrors = errors.entries?.[index]
                return (
                  <div
                    key={field.id}
                    className={cn(
                      "grid gap-2 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_9rem_7rem_auto]",
                      isDefault
                        ? "border-primary/40 bg-primary/5 dark:bg-primary/10"
                        : "border-border"
                    )}
                  >
                    <div className="space-y-1">
                      <Label
                        htmlFor={`sr-account-${index}`}
                        className="text-xs"
                      >
                        Account
                      </Label>
                      <Controller
                        control={control}
                        name={`entries.${index}.settlementAccountId`}
                        render={({ field: f }) => (
                          <Select
                            value={f.value ? f.value.toString() : ""}
                            onValueChange={(v) => f.onChange(Number(v))}
                          >
                            <SelectTrigger
                              id={`sr-account-${index}`}
                              className="w-full"
                              aria-invalid={!!entryErrors?.settlementAccountId}
                            >
                              <SelectValue placeholder="Choose account" />
                            </SelectTrigger>
                            <SelectContent>
                              {accounts.map((a) => (
                                <SelectItem
                                  key={a.id}
                                  value={a.id.toString()}
                                  disabled={!a.isActive && a.id !== f.value}
                                >
                                  {a.label} · {a.bankName} ••
                                  {a.accountNumber.slice(-4)}
                                  {!a.isActive && " (inactive)"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {entryErrors?.settlementAccountId && (
                        <p className="text-xs text-destructive">
                          {entryErrors.settlementAccountId.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`sr-type-${index}`} className="text-xs">
                        Type
                      </Label>
                      <Controller
                        control={control}
                        name={`entries.${index}.splitType`}
                        render={({ field: f }) => (
                          <Select
                            value={f.value}
                            onValueChange={f.onChange}
                            disabled={isDefault}
                          >
                            <SelectTrigger
                              id={`sr-type-${index}`}
                              className="w-full"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PERCENTAGE">
                                Percentage
                              </SelectItem>
                              <SelectItem value="FLAT">Exact amount</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`sr-value-${index}`} className="text-xs">
                        {isDefault
                          ? "Value (ignored)"
                          : entry?.splitType === "FLAT"
                            ? "Amount (₦)"
                            : "Value (%)"}
                      </Label>
                      <Input
                        id={`sr-value-${index}`}
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min={0}
                        // readOnly, not disabled: RHF drops disabled inputs'
                        // values, and the default entry must still send 0.
                        readOnly={isDefault}
                        tabIndex={isDefault ? -1 : undefined}
                        className={cn(isDefault && "opacity-60")}
                        aria-invalid={!!entryErrors?.value}
                        {...register(`entries.${index}.value`, {
                          valueAsNumber: true,
                        })}
                      />
                      {entryErrors?.value && (
                        <p className="text-xs text-destructive">
                          {entryErrors.value.message}
                        </p>
                      )}
                    </div>

                    <div className="flex items-end justify-between gap-2 sm:flex-col sm:items-end sm:justify-between">
                      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-foreground">
                        <input
                          type="radio"
                          name="split-rule-default"
                          checked={isDefault}
                          onChange={() => setDefault(index)}
                          className="size-3.5 accent-primary"
                        />
                        Receives remainder
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeEntry(index)}
                        disabled={fields.length === 1}
                        aria-label={`Remove entry ${index + 1}`}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 size={14} aria-hidden />
                      </Button>
                    </div>
                  </div>
                )
              })}

              {entriesRootError && (
                <p role="alert" className="text-xs text-destructive">
                  {entriesRootError}
                </p>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append(emptyEntry(false))}
                className="gap-1.5"
              >
                <Plus size={13} data-icon="inline-start" />
                Add account
              </Button>
            </fieldset>
          </div>

          <SplitPreviewPanel
            entries={entries ?? []}
            accountLabels={accountLabels}
            sampleAmount={sampleAmount}
            onSampleAmountChange={(v) => {
              setSampleTouched(true)
              setSampleAmount(v)
            }}
            sampleHint={
              sampleTouched
                ? "Your own sample amount."
                : selectedFeeType
                  ? `Defaults to ${selectedFeeType.name}'s amount.`
                  : "Defaults to ₦100,000 — pick a fee type to use its amount."
            }
          />
        </form>

        {submitError && !saveDisabled && (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive dark:bg-destructive/10"
          >
            {submitError}
          </p>
        )}

        {saveDisabled && (
          <p
            role="status"
            className="rounded-md bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
          >
            {validatedOnly
              ? "Looks good — this rule is valid. "
              : "You can build and preview this rule now. "}
            {SAVE_DISABLED_REASON}
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {saveDisabled && (
            <Button type="submit" form="split-rule-form" variant="secondary">
              Check rule
            </Button>
          )}
          <Button
            type="submit"
            form="split-rule-form"
            disabled={saveDisabled || upsert.isPending}
            title={saveDisabled ? SAVE_DISABLED_REASON : undefined}
            className="gap-1.5"
          >
            {upsert.isPending && (
              <Loader2 size={14} className="animate-spin" aria-hidden />
            )}
            Save rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
