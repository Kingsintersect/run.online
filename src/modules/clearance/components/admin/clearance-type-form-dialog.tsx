"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CreateClearanceTypeDtoSchema } from "../../schemas/clearance.schema"
import {
  useCreateClearanceType,
  useUpdateClearanceType,
} from "../../hooks/use-clearance-mutations"
import type { ClearanceType, CreateClearanceTypeDto } from "../../types"

interface ClearanceTypeFormDialogProps {
  open: boolean
  onClose: () => void
  clearanceType?: ClearanceType | null
}

export function ClearanceTypeFormDialog({
  open,
  onClose,
  clearanceType,
}: ClearanceTypeFormDialogProps) {
  const isEditing = !!clearanceType
  const createType = useCreateClearanceType()
  const updateType = useUpdateClearanceType()
  const isPending = createType.isPending || updateType.isPending

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateClearanceTypeDto>({
    resolver: zodResolver(CreateClearanceTypeDtoSchema),
    defaultValues: { name: "", description: "" },
  })

  useEffect(() => {
    if (!open) return
    reset({
      name: clearanceType?.name ?? "",
      description: clearanceType?.description ?? "",
    })
  }, [open, clearanceType, reset])

  const onSubmit = async (values: CreateClearanceTypeDto) => {
    try {
      if (isEditing) {
        await updateType.mutateAsync({ id: clearanceType.id, dto: values })
        toast.success("Clearance type updated")
      } else {
        await createType.mutateAsync(values)
        toast.success("Clearance type created")
      }
      onClose()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save clearance type"
      )
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Clearance Type" : "Create Clearance Type"}
      subtitle="e.g., Library, Bursary, Department, ICT, Hostel"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isPending}>
            {isPending && (
              <Loader2
                className="size-4 animate-spin"
                data-icon="inline-start"
              />
            )}
            {isEditing ? "Save Changes" : "Create Type"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="clearance-type-name">Name</Label>
          <Input
            id="clearance-type-name"
            placeholder="Library"
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="clearance-type-description">
            Description{" "}
            <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="clearance-type-description"
            rows={2}
            placeholder="Confirms no outstanding library books or fines."
            {...register("description")}
          />
        </div>
      </div>
    </Modal>
  )
}
