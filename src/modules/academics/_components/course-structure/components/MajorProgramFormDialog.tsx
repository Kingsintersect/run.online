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
import {
  useCreateMajorProgram,
  useUpdateMajorProgram,
} from "@/hooks/useCourseStructure"
import {
  majorProgramSchema,
  type MajorProgramFormValues,
} from "@/schemas/school.schema"
import type { MajorProgram } from "@/types/school"

interface MajorProgramFormDialogProps {
  open: boolean
  onClose: () => void
  majorProgram?: MajorProgram | null
}

export function MajorProgramFormDialog({
  open,
  onClose,
  majorProgram,
}: MajorProgramFormDialogProps) {
  const isEditing = !!majorProgram
  const createMajorProgram = useCreateMajorProgram()
  const updateMajorProgram = useUpdateMajorProgram()
  const isPending = createMajorProgram.isPending || updateMajorProgram.isPending

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MajorProgramFormValues>({
    resolver: zodResolver(majorProgramSchema),
    defaultValues: { code: "", name: "" },
  })

  useEffect(() => {
    if (!open) return
    reset({
      code: majorProgram?.code ?? "",
      name: majorProgram?.name ?? "",
      description: majorProgram?.description ?? "",
    })
  }, [open, majorProgram, reset])

  const onSubmit = async (values: MajorProgramFormValues) => {
    try {
      if (isEditing) {
        await updateMajorProgram.mutateAsync({
          id: majorProgram.id,
          payload: values,
        })
        toast.success("Major program updated")
      } else {
        await createMajorProgram.mutateAsync(values)
        toast.success("Major program created")
      }
      onClose()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save major program"
      )
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Major Program" : "Create Major Program"}
      subtitle="e.g., Part-Time Programmes, Business School, Certificate Programmes"
      size="md"
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
            {isEditing ? "Save Changes" : "Create Major Program"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="major-program-name">Name</Label>
          <Input
            id="major-program-name"
            placeholder="Part-Time Programmes"
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="major-program-code">Code</Label>
          <Input
            id="major-program-code"
            placeholder="PART_TIME_PROGRAMMES"
            aria-invalid={!!errors.code}
            {...register("code")}
            disabled={isEditing}
          />
          {errors.code && (
            <p className="text-sm text-destructive">{errors.code.message}</p>
          )}
          {isEditing && (
            <p className="text-xs text-muted-foreground">
              Code can&apos;t be changed after creation.
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="major-program-description">Description</Label>
          <Textarea
            id="major-program-description"
            rows={2}
            placeholder="Executive & degree programmes run by the Business School"
            {...register("description")}
          />
        </div>
      </div>
    </Modal>
  )
}
