"use client"

import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import Modal from "@/components/custom/Modal"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createTemplateSchema } from "../../schemas"
import type { CreateTemplatePayload, NotificationTemplate } from "../../types"

const CHANNELS = [
  { value: "EMAIL", label: "Email" },
  { value: "SMS", label: "SMS" },
  { value: "IN_APP", label: "In-App" },
  { value: "PUSH", label: "Push" },
] as const

interface TemplateFormModalProps {
  open: boolean
  onClose: () => void
  mode: "create" | "edit"
  template?: NotificationTemplate
  onSubmit: (data: CreateTemplatePayload) => Promise<void>
  isSubmitting: boolean
}

export function TemplateFormModal({
  open,
  onClose,
  mode,
  template,
  onSubmit,
  isSubmitting,
}: TemplateFormModalProps) {
  const isEdit = mode === "edit"

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<CreateTemplatePayload>({
    resolver: zodResolver(createTemplateSchema),
    defaultValues: { name: "", subject: "", body: "", channel: "EMAIL" },
  })

  const channel = useWatch({ control, name: "channel" })

  useEffect(() => {
    if (open && isEdit && template) {
      setValue("name", template.name)
      setValue("subject", template.subject)
      setValue("body", template.body)
      setValue("channel", template.channel)
    }
    if (!open) reset()
  }, [open, isEdit, template, setValue, reset])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Template" : "New Template"}
      subtitle={
        isEdit
          ? `Editing: ${template?.name}`
          : "Create a reusable notification template with variable support"
      }
      size="lg"
      footer={
        <div className="flex justify-end gap-2 p-5 pt-0">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting && (
              <Loader2
                className="size-4 animate-spin"
                data-icon="inline-start"
              />
            )}
            {isEdit ? "Save changes" : "Create template"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="tpl-name">Template Name</Label>
            <Input
              id="tpl-name"
              placeholder="e.g. welcome_email"
              disabled={isEdit}
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Unique slug, lowercase_snake_case
              </p>
            )}
          </div>

          {/* Channel */}
          <div className="space-y-1.5">
            <Label>Channel</Label>
            <Select
              value={channel}
              onValueChange={(v) =>
                setValue("channel", v as CreateTemplatePayload["channel"], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger aria-invalid={!!errors.channel}>
                <SelectValue placeholder="Select channel…" />
              </SelectTrigger>
              <SelectContent>
                {CHANNELS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.channel && (
              <p className="text-xs text-destructive">
                {errors.channel.message}
              </p>
            )}
          </div>
        </div>

        {/* Subject */}
        <div className="space-y-1.5">
          <Label htmlFor="tpl-subject">Subject</Label>
          <Input
            id="tpl-subject"
            placeholder="e.g. Welcome, {{firstName}}!"
            aria-invalid={!!errors.subject}
            {...register("subject")}
          />
          {errors.subject && (
            <p className="text-xs text-destructive">{errors.subject.message}</p>
          )}
        </div>

        {/* Body */}
        <div className="space-y-1.5">
          <Label htmlFor="tpl-body">Body</Label>
          <Textarea
            id="tpl-body"
            rows={6}
            placeholder={
              "Dear {{firstName}},\n\nYour message here...\n\nBest regards,\nAdmin Team"
            }
            aria-invalid={!!errors.body}
            {...register("body")}
          />
          {errors.body ? (
            <p className="text-xs text-destructive">{errors.body.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Supported variables:{" "}
              <code className="rounded bg-muted px-1">{"{{firstName}}"}</code>,{" "}
              <code className="rounded bg-muted px-1">{"{{lastName}}"}</code>,{" "}
              <code className="rounded bg-muted px-1">{"{{email}}"}</code>.
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}
