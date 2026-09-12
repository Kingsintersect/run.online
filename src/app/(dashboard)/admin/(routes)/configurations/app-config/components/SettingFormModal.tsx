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
import type { Setting } from "@/types/school"
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

type CreateFormValues = z.infer<typeof createSchema>
// type EditFormValues = z.infer<typeof editSchema>;

// ── Sensitive keys that should be masked ────
const SENSITIVE_KEYS = ["gateway_key", "api_token", "password", "secret"]
const isSensitive = (key: string) =>
  SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k))

// ── Groups list (excluding "all") ───────────
const groupOptions = SETTING_GROUPS.filter((g) => g.value !== "all")

// ── Props ────────────────────────────────────

interface SettingFormModalProps {
  open: boolean
  onClose: () => void
  mode: "create" | "edit"
  setting?: Setting
  onSubmit: (data: {
    key?: string
    value: string
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

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(
      isEdit ? (editSchema as unknown as typeof createSchema) : createSchema
    ),
    defaultValues: { key: "", value: "", group: "" },
  })

  const currentGroup = useWatch({ control, name: "group" })

  // Pre-fill when editing
  useEffect(() => {
    if (open && isEdit && setting) {
      setValue("value", setting.value)
      setValue("group", setting.group)
    }
    if (!open) reset()
  }, [open, isEdit, setting, setValue, reset])

  const handleFormSubmit = async (data: CreateFormValues) => {
    await onSubmit(isEdit ? { value: data.value, group: data.group } : data)
  }

  const sensitive = isEdit && setting ? isSensitive(setting.key) : false

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
          <Label htmlFor="value">Value</Label>
          {sensitive ? (
            <Input
              id="value"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.value}
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
