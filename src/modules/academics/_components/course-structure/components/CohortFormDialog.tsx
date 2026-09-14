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
import { useCreateCohort, useUpdateCohort } from "@/hooks/useCourseStructure"
import { cohortSchema, type CohortFormValues } from "@/schemas/school.schema"
import type { Cohort } from "@/types/school"

interface CohortFormDialogProps {
  open: boolean
  onClose: () => void
  programId: number
  cohort?: Cohort | null
}

export function CohortFormDialog({
  open,
  onClose,
  programId,
  cohort,
}: CohortFormDialogProps) {
  const isEditing = !!cohort
  const createCohort = useCreateCohort()
  const updateCohort = useUpdateCohort(programId)
  const isPending = createCohort.isPending || updateCohort.isPending

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CohortFormValues>({
    resolver: zodResolver(cohortSchema),
    defaultValues: { code: "", name: "", startDate: "", endDate: "" },
  })

  useEffect(() => {
    if (!open) return
    reset({
      code: cohort?.code ?? "",
      name: cohort?.name ?? "",
      startDate: cohort?.startDate?.slice(0, 10) ?? "",
      endDate: cohort?.endDate?.slice(0, 10) ?? "",
      examWindowStart: cohort?.examWindowStart?.slice(0, 10) ?? "",
      examWindowEnd: cohort?.examWindowEnd?.slice(0, 10) ?? "",
      capacity: cohort?.capacity ?? undefined,
    })
  }, [open, cohort, reset])

  const onSubmit = async (values: CohortFormValues) => {
    try {
      if (isEditing) {
        await updateCohort.mutateAsync({ id: cohort.id, payload: values })
        toast.success("Cohort updated")
      } else {
        await createCohort.mutateAsync({ ...values, programId })
        toast.success("Cohort created")
      }
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save cohort")
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Cohort" : "Create Cohort"}
      subtitle="e.g., ICAN ATS — May 2026 Sitting"
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
            {isEditing ? "Save Changes" : "Create Cohort"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="cohort-name">Name</Label>
          <Input
            id="cohort-name"
            placeholder="ICAN ATS — May 2026 Sitting"
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cohort-code">Code</Label>
          <Input
            id="cohort-code"
            placeholder="ICAN-ATS-MAY-2026"
            aria-invalid={!!errors.code}
            {...register("code")}
            disabled={isEditing}
          />
          {errors.code && (
            <p className="text-sm text-destructive">{errors.code.message}</p>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cohort-start">Start Date</Label>
            <Input
              id="cohort-start"
              type="date"
              aria-invalid={!!errors.startDate}
              {...register("startDate")}
            />
            {errors.startDate && (
              <p className="text-sm text-destructive">
                {errors.startDate.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cohort-end">End Date</Label>
            <Input
              id="cohort-end"
              type="date"
              aria-invalid={!!errors.endDate}
              {...register("endDate")}
            />
            {errors.endDate && (
              <p className="text-sm text-destructive">
                {errors.endDate.message}
              </p>
            )}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cohort-exam-start">
              Exam Window Start
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="cohort-exam-start"
              type="date"
              {...register("examWindowStart")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cohort-exam-end">
              Exam Window End
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="cohort-exam-end"
              type="date"
              {...register("examWindowEnd")}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cohort-capacity">
            Capacity
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              (optional)
            </span>
          </Label>
          <Input
            id="cohort-capacity"
            type="number"
            min={1}
            className="max-w-40"
            {...register("capacity", { valueAsNumber: true })}
          />
        </div>
      </div>
    </Modal>
  )
}
