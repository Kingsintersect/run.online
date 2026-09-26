"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  Controller,
  useForm,
  useWatch,
  type UseFormRegisterReturn,
} from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Info, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { NotAvailableNotice } from "@/modules/student-grades/_components/results/not-available-notice"
import { useFeeTypes } from "@/modules/fee-management/hooks/use-fee-types"
import { usePromotionPolicy } from "../hooks/use-progression"
import { useUpdatePromotionPolicy } from "../hooks/use-progression-mutations"
import { PromotionPolicyPayloadSchema } from "../schemas"
import {
  fieldError,
  toProgressionApiError,
  type ProgressionApiError,
} from "../lib/errors"
import type {
  ElectiveFailureMode,
  ProbationMode,
  PromotionPolicy,
  PromotionPolicyPayload,
  RetakePolicy,
} from "../types"

const PROBATION_MODE_OPTIONS: Record<ProbationMode, string> = {
  PROMOTE_ON_PROBATION: "Promote on probation",
  REPEAT_LEVEL: "Repeat the level",
}

const RETAKE_OPTIONS: Record<RetakePolicy, string> = {
  COUNT_ALL_ATTEMPTS: "Count all attempts",
  REPLACE_WITH_LATEST: "Replace with the latest attempt",
  KEEP_BEST: "Keep the best attempt",
}

const RETAKE_HELP: Record<RetakePolicy, string> = {
  COUNT_ALL_ATTEMPTS:
    "Count all attempts: the failed grade stays in the CGPA alongside the retake.",
  REPLACE_WITH_LATEST:
    "Replace with the latest attempt: only the most recent attempt counts towards the CGPA, even if it's lower.",
  KEEP_BEST:
    "Keep the best attempt: only the highest grade across all attempts counts towards the CGPA.",
}

const ELECTIVE_OPTIONS: Record<ElectiveFailureMode, string> = {
  RETAKE_SAME: "Retake the same elective",
  ANY_ELECTIVE_SAME_UNITS: "Any elective with the same units",
}

const ELECTIVE_HELP: Record<ElectiveFailureMode, string> = {
  RETAKE_SAME:
    "A failed elective becomes a carryover for that exact course; the student must retake it.",
  ANY_ELECTIVE_SAME_UNITS:
    "A failed elective can be cleared by passing any elective worth the same number of units.",
}

const requiredNumber = {
  setValueAs: (v: string | number) =>
    v === "" || v == null ? Number.NaN : Number(v),
}
const nullableNumber = {
  setValueAs: (v: string | number | null) =>
    v === "" || v == null ? null : Number(v),
}

function toFormValues(p: PromotionPolicy): PromotionPolicyPayload {
  return {
    probation_cgpa_below: p.probation_cgpa_below,
    withdraw_cgpa_below: p.withdraw_cgpa_below,
    probation_mode: p.probation_mode,
    max_outstanding_units_before_repeat: p.max_outstanding_units_before_repeat,
    max_extra_sessions: p.max_extra_sessions,
    retake_policy: p.retake_policy,
    elective_failure_mode: p.elective_failure_mode,
    max_credit_units_per_semester: p.max_credit_units_per_semester,
    min_credit_units_per_semester: p.min_credit_units_per_semester,
    block_registration_on_prior_debt: p.block_registration_on_prior_debt,
    require_published_results_before_next_semester:
      p.require_published_results_before_next_semester,
    carryover_fee_type_id: p.carryover_fee_type_id,
  }
}

interface PromotionPolicyFormProps {
  majorProgramId: number
  majorProgramName: string | null
  canManage: boolean
}

// One PromotionPolicy per major program. The registry owns the values; this
// form never suggests defaults. Client validation mirrors the contract, and
// the server remains the authority (its 422 field errors are shown inline).
export function PromotionPolicyForm({
  majorProgramId,
  majorProgramName,
  canManage,
}: PromotionPolicyFormProps) {
  const policy = usePromotionPolicy(majorProgramId)
  const update = useUpdatePromotionPolicy(majorProgramId)
  const feeTypes = useFeeTypes({ majorProgramId })
  const [serverError, setServerError] = useState<ProgressionApiError | null>(
    null
  )
  const form = useForm<PromotionPolicyPayload>({
    resolver: zodResolver(PromotionPolicyPayloadSchema),
    defaultValues: {
      block_registration_on_prior_debt: false,
      require_published_results_before_next_semester: false,
      max_outstanding_units_before_repeat: null,
      carryover_fee_type_id: null,
    },
  })

  const retake = useWatch({ control: form.control, name: "retake_policy" })
  const elective = useWatch({
    control: form.control,
    name: "elective_failure_mode",
  })

  const current = policy.data?.available ? policy.data.data : null
  useEffect(() => {
    if (current) form.reset(toFormValues(current))
  }, [current, form])

  const feeTypeOptions = useMemo(
    () =>
      (feeTypes.data ?? []).filter(
        (f) => f.majorProgramId == null || f.majorProgramId === majorProgramId
      ),
    [feeTypes.data, majorProgramId]
  )

  const submit = form.handleSubmit(async (body) => {
    setServerError(null)
    try {
      await update.mutateAsync(body)
      toast.success(
        `Progression policy saved${majorProgramName ? ` for ${majorProgramName}` : ""}.`
      )
    } catch (error) {
      if (error instanceof Error) {
        const e = toProgressionApiError(error)
        setServerError(e)
        if (Object.keys(e.fieldErrors).length === 0) toast.error(e.message)
      }
    }
  })

  if (policy.isLoading)
    return (
      <div
        className="h-96 animate-pulse rounded-2xl bg-muted/40"
        aria-busy
        aria-label="Loading policy"
      />
    )
  if (policy.isError)
    return (
      <p role="alert" className="text-sm text-destructive">
        {toProgressionApiError(policy.error).message}
      </p>
    )
  if (policy.data?.available === false)
    return (
      <NotAvailableNotice title="Progression policies aren't available on the server yet" />
    )

  const errors = form.formState.errors
  const err = (name: keyof PromotionPolicyPayload): string | undefined =>
    errors[name]?.message ?? fieldError(serverError, name)

  return (
    <form
      onSubmit={submit}
      noValidate
      className="max-w-3xl space-y-6 rounded-2xl border border-border bg-card p-5"
    >
      {!current && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-200"
        >
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            No progression policy has been saved for this major program yet.
            {canManage
              ? " Fill in every field with the values your registry has approved, then save."
              : " Ask an administrator with policy access to set one up."}
          </p>
        </div>
      )}

      <fieldset disabled={!canManage} className="space-y-6">
        <PolicyGroup title="Probation and withdrawal">
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              id="policy-probation-cgpa"
              label="Probation CGPA threshold"
              step="0.01"
              help="Students whose CGPA falls below this value are placed on probation."
              error={err("probation_cgpa_below")}
              registration={form.register(
                "probation_cgpa_below",
                requiredNumber
              )}
            />
            <NumberField
              id="policy-withdraw-cgpa"
              label="Withdrawal CGPA threshold"
              step="0.01"
              help="Students whose CGPA falls below this value are advised to withdraw."
              error={err("withdraw_cgpa_below")}
              registration={form.register(
                "withdraw_cgpa_below",
                requiredNumber
              )}
            />
          </div>
          <SelectInput
            id="policy-probation-mode"
            label="What happens on probation"
            help="Promote on probation: the student moves up a level and is flagged on probation. Repeat the level: the student stays at the same level for another session."
            error={err("probation_mode")}
            options={PROBATION_MODE_OPTIONS}
            registration={form.register("probation_mode")}
          />
        </PolicyGroup>

        <PolicyGroup title="Carryovers and duration">
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              id="policy-max-outstanding"
              label="Maximum carryover units before repeating"
              placeholder="No limit"
              help="If a student has more failed credit units than this, they repeat the level instead of moving up with carryovers. Leave empty for no limit."
              error={err("max_outstanding_units_before_repeat")}
              registration={form.register(
                "max_outstanding_units_before_repeat",
                nullableNumber
              )}
            />
            <NumberField
              id="policy-max-extra"
              label="Maximum extra sessions"
              help="How many sessions beyond the programme's normal length a student may spend finishing outstanding courses (spillover). Beyond this they are flagged for review."
              error={err("max_extra_sessions")}
              registration={form.register("max_extra_sessions", requiredNumber)}
            />
          </div>
          <SelectInput
            id="policy-retake"
            label="How retakes count towards the CGPA"
            help={
              retake
                ? RETAKE_HELP[retake]
                : "Choose how a failed course's grade is treated once the student retakes it."
            }
            error={err("retake_policy")}
            options={RETAKE_OPTIONS}
            registration={form.register("retake_policy")}
          />
          <SelectInput
            id="policy-elective"
            label="When an elective is failed"
            help={
              elective
                ? ELECTIVE_HELP[elective]
                : "Choose what a student must do to clear a failed elective."
            }
            error={err("elective_failure_mode")}
            options={ELECTIVE_OPTIONS}
            registration={form.register("elective_failure_mode")}
          />
        </PolicyGroup>

        <PolicyGroup title="Course registration">
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              id="policy-min-units"
              label="Minimum credit units per semester"
              help="Students must register at least this many units each semester, carryovers included."
              error={err("min_credit_units_per_semester")}
              registration={form.register(
                "min_credit_units_per_semester",
                requiredNumber
              )}
            />
            <NumberField
              id="policy-max-units"
              label="Maximum credit units per semester"
              help="Students can't register more than this many units in one semester, carryovers included."
              error={err("max_credit_units_per_semester")}
              registration={form.register(
                "max_credit_units_per_semester",
                requiredNumber
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="block_registration_on_prior_debt"
            render={({ field }) => (
              <SwitchRow
                id="policy-block-debt"
                label="Block registration for students owing previous-session fees"
                help="When on, a student who still owes fees from an earlier session can't register courses until the debt is paid, waived or overridden. Promotion itself is never affected by fees."
                checked={field.value}
                onChange={field.onChange}
              />
            )}
          />

          <div className="space-y-1.5">
            <Label htmlFor="policy-carryover-fee">Carryover fee type</Label>
            <select
              id="policy-carryover-fee"
              {...form.register("carryover_fee_type_id", nullableNumber)}
              aria-describedby="policy-carryover-fee-help"
              className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none dark:bg-muted/20"
            >
              <option value="">No carryover fee</option>
              {feeTypeOptions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                  {f.session ? ` (${f.session.name})` : ""}
                </option>
              ))}
            </select>
            <p
              id="policy-carryover-fee-help"
              className="text-xs text-muted-foreground"
            >
              The fee charged for each carryover course a student registers.
              Choose &ldquo;No carryover fee&rdquo; if carryovers are free.
              {feeTypes.isError && " (Fee types couldn't be loaded.)"}
            </p>
            <FieldError message={err("carryover_fee_type_id")} />
          </div>
        </PolicyGroup>

        <PolicyGroup title="Semester rollover">
          <Controller
            control={form.control}
            name="require_published_results_before_next_semester"
            render={({ field }) => (
              <SwitchRow
                id="policy-require-published"
                label="Require published results before the next semester"
                help="When on, unpublished results block activating the next semester. When off, they only show as a warning on the rollover checklist."
                checked={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </PolicyGroup>
      </fieldset>

      {canManage ? (
        <Button type="submit" disabled={update.isPending}>
          {update.isPending && (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          )}
          Save policy
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">
          You can view this policy. Changing it needs policy management access.
        </p>
      )}
    </form>
  )
}

// ─── Field building blocks ────────────────────────────────────────────────────

function PolicyGroup({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="space-y-4">
      <h3 className="border-b border-border pb-1.5 text-sm font-semibold text-foreground">
        {title}
      </h3>
      {children}
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="text-xs text-destructive">
      {message}
    </p>
  )
}

type Registration = UseFormRegisterReturn<keyof PromotionPolicyPayload>

interface NumberFieldProps {
  id: string
  label: string
  help: string
  error?: string
  registration: Registration
  step?: string
  placeholder?: string
}

function NumberField({
  id,
  label,
  help,
  error,
  registration,
  step = "1",
  placeholder,
}: NumberFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        min={0}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-help`}
        {...registration}
      />
      <p id={`${id}-help`} className="text-xs text-muted-foreground">
        {help}
      </p>
      <FieldError message={error} />
    </div>
  )
}

interface SelectInputProps {
  id: string
  label: string
  help: string
  error?: string
  options: Record<string, string>
  registration: Registration
}

function SelectInput({
  id,
  label,
  help,
  error,
  options,
  registration,
}: SelectInputProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-help`}
        {...registration}
        className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none dark:bg-muted/20"
      >
        <option value="">Choose…</option>
        {Object.entries(options).map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
      <p id={`${id}-help`} className="text-xs text-muted-foreground">
        {help}
      </p>
      <FieldError message={error ? "Choose an option" : undefined} />
    </div>
  )
}

interface SwitchRowProps {
  id: string
  label: string
  help: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function SwitchRow({ id, label, help, checked, onChange }: SwitchRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <Label htmlFor={id}>{label}</Label>
        <p id={`${id}-help`} className="mt-0.5 text-xs text-muted-foreground">
          {help}
        </p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        aria-describedby={`${id}-help`}
      />
    </div>
  )
}
