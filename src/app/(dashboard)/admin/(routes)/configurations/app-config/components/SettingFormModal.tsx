"use client"

import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import Modal from "@/components/custom/Modal"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  isSecretSettingKey,
  type SafeSetting,
} from "@/services/configurationApi"
import { SETTING_GROUPS } from "./GroupTabs"

// ── Validation schema ────────────────────────

const createSchema = z.object({
  key: z
    .string()
    .min(3, "Key must be at least 3 characters")
    .max(100, "Key too long")
    .regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers and underscores"),
  value: z.string().min(1, "Value is required"),
  group: z.string().min(1, "Group is required"),
})

const editSchema = z.object({
  value: z.string().min(1, "Value is required"),
  group: z.string().min(1, "Group is required"),
})

// A secret is write-only (sandbox/payment-secrets API_CONTRACTS §2): the form
// never has its current value, so a blank field means "keep the current key".
const secretEditSchema = z.object({
  value: z.string(),
  group: z.string().min(1, "Group is required"),
})

type CreateFormValues = z.infer<typeof createSchema>

// ── Groups list (excluding "all") ───────────
const groupOptions = SETTING_GROUPS.filter((g) => g.value !== "all")

// ── Props ────────────────────────────────────

interface SettingFormModalProps {
  open: boolean
  onClose: () => void
  mode: "create" | "edit"
  setting?: SafeSetting
  onSubmit: (data: {
    key?: string
    /** Omitted when editing a secret and the field was left blank. */
    value?: string
    group: string
  }) => Promise<void>
  isSubmitting: boolean
}

export function SettingFormModal({
  open,
  onClose,
  mode,
  setting,
  onSubmit,
  isSubmitting,
}: SettingFormModalProps) {
  const isEdit = mode === "edit"
  const editingSecret = isEdit && !!setting?.isSecret

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(
      editingSecret
        ? (secretEditSchema as unknown as typeof createSchema)
        : isEdit
          ? (editSchema as unknown as typeof createSchema)
          : createSchema
    ),
    defaultValues: { key: "", value: "", group: "" },
  })

  const currentGroup = useWatch({ control, name: "group" })
  const typedKey = useWatch({ control, name: "key" })

  // Pre-fill when editing. A secret's value is never pre-filled: the portal
  // doesn't hold it, and the field asks for a replacement instead.
  useEffect(() => {
    if (open && isEdit && setting) {
      setValue("value", setting.isSecret ? "" : (setting.value ?? ""))
      setValue("group", setting.group)
    }
    if (!open) reset()
  }, [open, isEdit, setting, setValue, reset])

  const handleFormSubmit = async (data: CreateFormValues) => {
    if (!isEdit) return onSubmit(data)
    if (editingSecret && data.value === "") {
      return onSubmit({ group: data.group })
    }
    await onSubmit({ value: data.value, group: data.group })
  }

  const sensitive = isEdit ? editingSecret : isSecretSettingKey(typedKey ?? "")

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Setting" : "Add Setting"}
      subtitle={
        isEdit
          ? `Updating key: ${setting?.key}`
          : "Add a new key-value configuration entry"
      }
      size="md"
      footer={
        <div className="flex justify-end gap-2 p-5 pt-0">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit(handleFormSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting && (
              <Loader2
                className="size-4 animate-spin"
                data-icon="inline-start"
              />
            )}
            {isEdit ? "Save changes" : "Add setting"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        {/* Key — only shown when creating */}
        {!isEdit && (
          <div className="space-y-1.5">
            <Label htmlFor="key">Key</Label>
            <Input
              id="key"
              placeholder="e.g. university_name"
              autoComplete="off"
              aria-invalid={!!errors.key}
              {...register("key")}
            />
            {errors.key && (
              <p className="text-xs text-destructive">{errors.key.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Use lowercase snake_case. Convention: <code>group_name</code>
            </p>
          </div>
        )}

        {/* Value */}
        <div className="space-y-1.5">
          <Label htmlFor="value">{editingSecret ? "New value" : "Value"}</Label>
          {sensitive ? (
            <Input
              id="value"
              type="password"
              autoComplete="new-password"
              placeholder={
                editingSecret ? "Leave blank to keep the current key" : ""
              }
              aria-invalid={!!errors.value}
              aria-describedby={editingSecret ? "value-secret-hint" : undefined}
              {...register("value")}
            />
          ) : (
            <Textarea
              id="value"
              rows={2}
              aria-invalid={!!errors.value}
              {...register("value")}
            />
          )}
          {errors.value && (
            <p className="text-xs text-destructive">{errors.value.message}</p>
          )}
          {editingSecret && (
            <p id="value-secret-hint" className="text-xs text-muted-foreground">
              {setting?.isSet ? (
                <>
                  Current:{" "}
                  <span className="font-mono text-foreground">
                    {setting.maskedValue}
                  </span>
                  . This is a secret: it can be replaced but is never shown
                  here.
                </>
              ) : (
                "No value is set yet. This is a secret: it can be replaced but is never shown here."
              )}
            </p>
          )}
        </div>

        {/* Group */}
        <div className="space-y-1.5">
          <Label htmlFor="group">Group</Label>
          <Select
            value={currentGroup}
            onValueChange={(v) =>
              setValue("group", v, { shouldValidate: true })
            }
          >
            <SelectTrigger id="group" aria-invalid={!!errors.group}>
              <SelectValue placeholder="Select group…" />
            </SelectTrigger>
            <SelectContent>
              {groupOptions.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.group && (
            <p className="text-xs text-destructive">{errors.group.message}</p>
          )}
        </div>
      </div>
    </Modal>
  )
}
