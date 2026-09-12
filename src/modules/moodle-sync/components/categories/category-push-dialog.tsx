"use client"

import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, UploadCloud } from "lucide-react"
import { toast } from "sonner"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Combobox from "@/components/custom/Combobox"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { useAcademicUnits } from "@/hooks/useAcademicStructure"
import { PushCategoryDtoSchema } from "../../schemas/category.schema"
import { usePushCategory } from "../../hooks/use-sync-mutations"
import type { PushCategoryDto } from "../../types"

export function CategoryPushDialog() {
  const [open, setOpen] = useState(false)
  const pushCategory = usePushCategory()
  const { data: unitsData } = useAcademicUnits(undefined, { enabled: open })
  const unitOptions = (unitsData?.data ?? []).map((u) => ({
    value: u.id,
    label: u.name,
    description: u.typeCode,
  }))

  const form = useForm<PushCategoryDto>({
    resolver: zodResolver(PushCategoryDtoSchema),
    defaultValues: {
      academicUnitId: 0,
      parentMoodleCategoryId: undefined,
    },
  })

  const submit = form.handleSubmit(async (values) => {
    try {
      await pushCategory.mutateAsync(values)
      toast.success("Node pushed to Moodle")
      setOpen(false)
      form.reset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to push node")
    }
  })

  return (
    <PermissionGate require={{ resource: "moodle-sync", action: "push" }}>
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={() => setOpen(true)}
      >
        <UploadCloud size={13} />
        Push Node
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Push Node to Moodle"
        subtitle="Manually push one node from the Academic Structure tree."
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pushCategory.isPending}
            >
              Cancel
            </Button>
            <Button onClick={submit} disabled={pushCategory.isPending}>
              {pushCategory.isPending && (
                <Loader2
                  className="size-4 animate-spin"
                  data-icon="inline-start"
                />
              )}
              Push
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Structure Node</Label>
            <Controller
              control={form.control}
              name="academicUnitId"
              render={({ field }) => (
                <Combobox
                  options={unitOptions}
                  value={field.value || null}
                  onChange={(v) => field.onChange(Number(v))}
                  placeholder="Search for a node…"
                />
              )}
            />
            {form.formState.errors.academicUnitId && (
              <p className="text-xs text-destructive">
                {form.formState.errors.academicUnitId.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="parent-category-id">
              Parent Moodle Category ID (optional)
            </Label>
            <Input
              id="parent-category-id"
              type="number"
              min={1}
              placeholder="Leave empty for a top-level category"
              {...form.register("parentMoodleCategoryId", {
                valueAsNumber: true,
              })}
            />
          </div>
        </div>
      </Modal>
    </PermissionGate>
  )
}
