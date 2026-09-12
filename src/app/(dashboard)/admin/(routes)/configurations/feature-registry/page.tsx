"use client"

import { useMemo, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import Modal from "@/components/custom/Modal"
import SectionCard from "@/components/custom/SectionCard"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  useDeleteFeatureRegistry,
  useFeatureRegistry,
  useUpsertFeatureRegistry,
} from "@/hooks/useFeatureRegistry"
import type {
  FeatureRegistryRecord,
  UpsertFeatureRegistryPayload,
} from "@/schemas/featureRegistry.schema"

const featureFormSchema = z.object({
  key: z
    .string()
    .min(2, "Feature key must be at least 2 characters")
    .max(50)
    .regex(
      /^[a-z][a-z0-9_]*$/,
      "Feature key must be snake_case and start with a letter"
    ),
  label: z.string().min(2, "Label is required").max(100),
  category: z.string().max(50).optional(),
  defaultEnabled: z.boolean(),
})

type FeatureFormValues = z.infer<typeof featureFormSchema>

function toDefaults(feature?: FeatureRegistryRecord): FeatureFormValues {
  return {
    key: feature?.key ?? "",
    label: feature?.label ?? "",
    category: feature?.category ?? "",
    defaultEnabled: feature?.defaultEnabled ?? false,
  }
}

export default function SystemFeaturesPage() {
  const { data: registry = [], isLoading } = useFeatureRegistry()
  const upsertMutation = useUpsertFeatureRegistry()
  const deleteMutation = useDeleteFeatureRegistry()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<FeatureRegistryRecord | null>(null)
  const [selectedDeps, setSelectedDeps] = useState<string[]>([])

  const form = useForm<FeatureFormValues>({
    resolver: zodResolver(featureFormSchema),
    defaultValues: toDefaults(),
  })
  const defaultEnabled = useWatch({
    control: form.control,
    name: "defaultEnabled",
  })

  const canSubmit = !upsertMutation.isPending

  const grouped = useMemo(() => {
    return registry.reduce<Record<string, FeatureRegistryRecord[]>>(
      (acc, item) => {
        const category = item.category?.trim() || "General"
        if (!acc[category]) acc[category] = []
        acc[category]!.push(item)
        return acc
      },
      {}
    )
  }, [registry])

  function openAdd() {
    setEditing(null)
    setSelectedDeps([])
    form.reset(toDefaults())
    setOpen(true)
  }

  function openEdit(feature: FeatureRegistryRecord) {
    setEditing(feature)
    setSelectedDeps(feature.dependencies)
    form.reset(toDefaults(feature))
    setOpen(true)
  }

  async function onDelete(feature: FeatureRegistryRecord) {
    try {
      await deleteMutation.mutateAsync(feature.key)
      toast.success(`Feature '${feature.label}' deleted`)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Delete failed")
    }
  }

  const onSubmit = form.handleSubmit(async (values) => {
    const payload: UpsertFeatureRegistryPayload = {
      key: editing?.key ?? values.key,
      label: values.label,
      category: values.category?.trim() || null,
      dependencies: selectedDeps,
      defaultEnabled: values.defaultEnabled,
    }

    try {
      await upsertMutation.mutateAsync(payload)
      toast.success(editing ? "Feature updated" : "Feature added")
      setOpen(false)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Save failed")
    }
  })

  return (
    <div className="mx-auto space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Feature Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Create and manage feature registry records used by Portal Settings.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="size-4" data-icon="inline-start" />
          Add Feature
        </Button>
      </div>

      <SectionCard title="Registry" icon={Plus}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category} className="space-y-2">
                <h2 className="text-sm font-semibold text-foreground">
                  {category}
                </h2>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-3 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          Key
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          Label
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          Default
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          Dependencies
                        </th>
                        <th className="w-24 px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {items.map((feature) => (
                        <tr key={feature.key}>
                          <td className="px-3 py-2 font-mono text-xs">
                            {feature.key}
                          </td>
                          <td className="px-3 py-2">{feature.label}</td>
                          <td className="px-3 py-2">
                            {feature.defaultEnabled ? "Enabled" : "Disabled"}
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {feature.dependencies.length > 0
                              ? feature.dependencies.join(", ")
                              : "-"}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                onClick={() => openEdit(feature)}
                                title="Edit feature"
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7 text-destructive hover:text-destructive"
                                onClick={() => onDelete(feature)}
                                disabled={deleteMutation.isPending}
                                title="Delete feature"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Feature" : "Add Feature"}
        subtitle={
          editing ? `Update ${editing.key}` : "Create a new registry entry"
        }
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={upsertMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={!canSubmit}>
              {upsertMutation.isPending && (
                <Loader2
                  className="size-4 animate-spin"
                  data-icon="inline-start"
                />
              )}
              {editing ? "Save Changes" : "Create Feature"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {!editing && (
            <div className="space-y-1.5">
              <Label htmlFor="key">Feature Key</Label>
              <Input
                id="key"
                placeholder="live_chat"
                {...form.register("key")}
              />
              {form.formState.errors.key && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.key.message}
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              placeholder="Live Chat"
              {...form.register("label")}
            />
            {form.formState.errors.label && (
              <p className="text-xs text-destructive">
                {form.formState.errors.label.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              placeholder="Communication"
              {...form.register("category")}
            />
            {form.formState.errors.category && (
              <p className="text-xs text-destructive">
                {form.formState.errors.category.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Dependencies</Label>
            <div className="max-h-44 space-y-2 overflow-y-auto rounded-lg border border-border p-2">
              {registry
                .filter((item) => item.key !== editing?.key)
                .map((item) => {
                  const checked = selectedDeps.includes(item.key)
                  return (
                    <label
                      key={item.key}
                      className="flex items-start gap-2 rounded-md p-1 hover:bg-accent/40"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) => {
                          setSelectedDeps((prev) => {
                            if (next === true) {
                              return prev.includes(item.key)
                                ? prev
                                : [...prev, item.key]
                            }
                            return prev.filter((dep) => dep !== item.key)
                          })
                        }}
                      />
                      <span className="text-sm text-foreground">
                        {item.label}
                      </span>
                    </label>
                  )
                })}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={!!defaultEnabled}
              onCheckedChange={(checked) =>
                form.setValue("defaultEnabled", checked === true, {
                  shouldValidate: true,
                })
              }
            />
            Enabled by default
          </label>
        </div>
      </Modal>
    </div>
  )
}
