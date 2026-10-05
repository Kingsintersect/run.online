"use client"

import { useEffect } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useCreateMajorProgram,
  useUpdateMajorProgram,
} from "@/hooks/useCourseStructure"
import {
  majorProgramFormSchema,
  type MajorProgramFormValues,
} from "@/modules/academics/schemas"
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
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MajorProgramFormValues>({
    resolver: zodResolver(majorProgramFormSchema),
    defaultValues: { code: "", name: "", termStructure: "SEMESTER" },
  })
  const termStructure = useWatch({ control, name: "termStructure" })
  const originalTermStructure = majorProgram?.termStructure ?? "SEMESTER"

  useEffect(() => {
    if (!open) return
    reset({
      code: majorProgram?.code ?? "",
      name: majorProgram?.name ?? "",
      description: majorProgram?.description ?? "",
      termStructure: majorProgram?.termStructure ?? "SEMESTER",
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
        <div className="space-y-1.5">
          <Label htmlFor="major-program-term-structure">Term structure</Label>
          <Controller
            control={control}
            name="termStructure"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="major-program-term-structure"
                  className="h-10 w-full"
                  aria-describedby="major-program-term-structure-help"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEMESTER">
                    Semesters (sessions split into semesters)
                  </SelectItem>
                  <SelectItem value="SESSION">
                    Full session (no semesters)
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          <p
            id="major-program-term-structure-help"
            className="text-xs text-muted-foreground"
          >
            {termStructure === "SESSION"
              ? "Courses are offered for the whole academic session. There are no semesters to set up: the system keeps one automatic “Full Session” semester per session. Use this for Certificate or Foundational-style programmes."
              : "Each academic session is split into semesters, and every course offering belongs to one semester. This is the usual setup for degree programmes."}
          </p>
          {isEditing && termStructure !== originalTermStructure && (
            <p
              role="note"
              className="rounded-lg bg-amber-400/15 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-400"
            >
              Changing the term structure only affects new course offerings and
              Moodle result pulls. Existing semesters and offerings are left
              exactly as they are, and nothing checks them, so only change this
              for a program without academic history, or after deciding how its
              existing records should be handled.
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}
