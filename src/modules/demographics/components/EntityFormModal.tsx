"use client"

import { useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { DemographicsEntityRow } from "./DemographicsEntityPanel"

const entityFormSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  code: z.string().trim().max(10, "Keep the code short").optional(),
  isActive: z.boolean(),
})

export type EntityFormValues = z.infer<typeof entityFormSchema>

interface EntityFormModalProps {
  open: boolean
  onClose: () => void
  title: string
  nameLabel: string
  namePlaceholder?: string
  /** Show the optional short "code" field (used by Countries/States, not Local Governments). */
  showCode?: boolean
  editing: DemographicsEntityRow | null
  onSubmit: (values: EntityFormValues) => Promise<void> | void
  isSubmitting: boolean
}

function toDefaults(item: DemographicsEntityRow | null): EntityFormValues {
  return {
    name: item?.name ?? "",
    code: item?.code ?? "",
    isActive: item?.isActive ?? true,
  }
}

export default function EntityFormModal({
  open,
  onClose,
  title,
  nameLabel,
  namePlaceholder,
  showCode,
  editing,
  onSubmit,
  isSubmitting,
}: EntityFormModalProps) {
  const form = useForm<EntityFormValues>({
    resolver: zodResolver(entityFormSchema),
    defaultValues: toDefaults(editing),
  })

  useEffect(() => {
    if (open) form.reset(toDefaults(editing))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing])

  const submit = form.handleSubmit(async (values) => {
    await onSubmit(values)
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${title}` : `Add ${title}`}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isSubmitting}>
            {isSubmitting && (
              <Loader2
                className="size-4 animate-spin"
                data-icon="inline-start"
              />
            )}
            {editing ? "Save Changes" : "Create"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="entity-name">{nameLabel}</Label>
          <Input
            id="entity-name"
            placeholder={namePlaceholder}
            {...form.register("name")}
          />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>

        {showCode && (
          <div className="space-y-1.5">
            <Label htmlFor="entity-code">Code (optional)</Label>
            <Input
              id="entity-code"
              placeholder="e.g. NG"
              {...form.register("code")}
            />
            {form.formState.errors.code && (
              <p className="text-xs text-destructive">
                {form.formState.errors.code.message}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <div>
            <p className="text-sm font-medium text-foreground">Active</p>
            <p className="text-xs text-muted-foreground">
              Inactive entries are hidden from selection dropdowns.
            </p>
          </div>
          <Controller
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                className="data-checked:bg-success"
              />
            )}
          />
        </div>
      </div>
    </Modal>
  )
}
