"use client"

import { useForm, useWatch, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { CreateFeeTypeDtoSchema } from "../../schemas/fee-type.schema"
import { FeeTypeScopeSelector } from "./fee-type-scope-selector"
import {
  useCreateFeeType,
  useUpdateFeeType,
} from "../../hooks/use-fee-mutations"
import type {
  CreateFeeTypeDto,
  CreateFeeTypeInputValues,
  FeeTypeResponse,
} from "../../types"

interface FeeTypeFormProps {
  /** Provide to pre-fill form for edit mode */
  defaultValues?: Partial<FeeTypeResponse>
  onSuccess?: (feeType: FeeTypeResponse) => void
  onCancel?: () => void
}

export function FeeTypeForm({
  defaultValues,
  onSuccess,
  onCancel,
}: FeeTypeFormProps) {
  const isEditing = !!defaultValues?.id
  const createMutation = useCreateFeeType()
  const updateMutation = useUpdateFeeType()

  const form = useForm<CreateFeeTypeInputValues, unknown, CreateFeeTypeDto>({
    resolver: zodResolver(CreateFeeTypeDtoSchema),
    defaultValues: defaultValues?.id
      ? {
          name: defaultValues.name ?? "",
          description: defaultValues.description ?? undefined,
          category: defaultValues.category,
          amount: defaultValues.amount
            ? Number(defaultValues.amount)
            : undefined,
          sessionId: defaultValues.sessionId ?? undefined,
          programId: defaultValues.programId ?? undefined,
          levelId: defaultValues.levelId ?? undefined,
          studentType: defaultValues.studentType ?? "ALL",
          isMandatory: defaultValues.isMandatory ?? true,
          allowInstallments: defaultValues.allowInstallments ?? false,
          defaultDueDate: defaultValues.createdAt ? undefined : undefined,
        }
      : {
          studentType: "ALL",
          isMandatory: true,
          allowInstallments: false,
        },
  })

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = form
  const isPending = createMutation.isPending || updateMutation.isPending
  const [defaultDueDate, isMandatory, allowInstallments] = useWatch({
    control,
    name: ["defaultDueDate", "isMandatory", "allowInstallments"],
  })

  function onSubmit(dto: CreateFeeTypeDto) {
    if (isEditing && defaultValues?.id) {
      updateMutation.mutate(
        { id: defaultValues.id, dto },
        { onSuccess: (data) => onSuccess?.(data) }
      )
    } else {
      createMutation.mutate(dto, {
        onSuccess: (data) => onSuccess?.(data),
      })
    }
  }

  return (
    // FormProvider lets FeeTypeScopeSelector read the form context via useFormContext
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Name ─────────────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label htmlFor="fee-name">
            Fee Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="fee-name"
            placeholder="e.g. 2026/2027 Tuition — Economics, Level 100"
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        {/* ── Description ──────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label htmlFor="fee-description">Description</Label>
          <Textarea
            id="fee-description"
            placeholder="Optional notes about this fee"
            rows={2}
            {...register("description")}
          />
          {errors.description && (
            <p className="text-xs text-destructive">
              {errors.description.message}
            </p>
          )}
        </div>

        {/* ── Amount ───────────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label htmlFor="fee-amount">
            Amount (₦) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="fee-amount"
            type="number"
            min="1"
            step="0.01"
            placeholder="0.00"
            aria-invalid={!!errors.amount}
            {...register("amount", { valueAsNumber: true })}
          />
          {errors.amount && (
            <p className="text-xs text-destructive">{errors.amount.message}</p>
          )}
        </div>

        <Separator />

        {/* ── Scope selector ───────────────────────────────────────────── */}
        <FeeTypeScopeSelector />

        <Separator />

        {/* ── Toggles ──────────────────────────────────────────────────── */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Mandatory</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                All eligible students are billed automatically
              </p>
            </div>
            <Switch
              checked={isMandatory ?? true}
              onCheckedChange={(v) => setValue("isMandatory", v)}
              aria-label="Mandatory fee"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Allow Installments</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Students can make partial payments
              </p>
            </div>
            <Switch
              checked={allowInstallments ?? false}
              onCheckedChange={(v) => setValue("allowInstallments", v)}
              aria-label="Allow installments"
            />
          </div>
        </div>

        {/* ── Default Due Date ─────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label htmlFor="fee-due-date">Default Due Date</Label>
          <div className="relative">
            <CalendarIcon
              size={14}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="fee-due-date"
              type="date"
              className="pl-9"
              value={
                defaultDueDate
                  ? new Date(defaultDueDate).toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) => {
                const v = e.target.value
                setValue(
                  "defaultDueDate",
                  v ? new Date(v).toISOString() : undefined
                )
              }}
            />
          </div>
          {errors.defaultDueDate && (
            <p className="text-xs text-destructive">
              {errors.defaultDueDate.message}
            </p>
          )}
        </div>

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <div className="flex gap-3 pt-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending && (
              <Loader2
                size={14}
                className="mr-2 animate-spin"
                data-icon="inline-start"
              />
            )}
            {isEditing ? "Save Changes" : "Create Fee Type"}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
