"use client"

import { useEffect, useMemo } from "react"
import { useForm, Controller } from "react-hook-form"
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
  useCreateFaculty,
  useUpdateFaculty,
  useEligibleDeans,
  useMajorPrograms,
} from "@/hooks/useCourseStructure"
import { facultySchema, type FacultyFormValues } from "@/schemas/school.schema"
import type { Faculty } from "@/types/school"

// Sentinel value for "no selection" in the optional Major Program select.
const NONE = "_NONE_" as const

interface FacultyFormDialogProps {
  open: boolean
  onClose: () => void
  faculty?: Faculty | null
}

export function FacultyFormDialog({
  open,
  onClose,
  faculty,
}: FacultyFormDialogProps) {
  const isEditing = !!faculty
  const createFaculty = useCreateFaculty()
  const updateFaculty = useUpdateFaculty()
  const { data: deansRes } = useEligibleDeans()
  const eligibleDeans = deansRes?.data ?? []
  const { data: majorProgramsRes } = useMajorPrograms()
  const majorPrograms = useMemo(
    () => (majorProgramsRes?.data ?? []).filter((mp) => mp.isActive),
    [majorProgramsRes]
  )
  const hasMultipleMajorPrograms = majorPrograms.length > 1
  const isPending = createFaculty.isPending || updateFaculty.isPending

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FacultyFormValues>({
    resolver: zodResolver(facultySchema),
    defaultValues: { name: "", code: "" },
  })

  useEffect(() => {
    if (!open) return
    reset({
      name: faculty?.name ?? "",
      code: faculty?.code ?? "",
      description: faculty?.description ?? "",
      deanUserId: faculty?.deanUserId ?? undefined,
      email: faculty?.email ?? "",
      phoneNumber: faculty?.phoneNumber ?? "",
      majorProgramId: faculty?.majorProgramId ?? null,
    })
  }, [open, faculty, reset])

  const onSubmit = async (values: FacultyFormValues) => {
    try {
      if (isEditing) {
        await updateFaculty.mutateAsync({ id: faculty.id, payload: values })
        toast.success("Faculty updated")
      } else {
        await createFaculty.mutateAsync(values)
        toast.success("Faculty created")
      }
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save faculty")
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Faculty" : "Create Faculty"}
      subtitle="e.g., Faculty of Science (code: SCI)"
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
            {isEditing ? "Save Changes" : "Create Faculty"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="faculty-name">Faculty Name</Label>
            <Input
              id="faculty-name"
              placeholder="Faculty of Science"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="faculty-code">Code</Label>
            <Input
              id="faculty-code"
              placeholder="SCI"
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
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="faculty-description">Description</Label>
          <Textarea
            id="faculty-description"
            rows={2}
            {...register("description")}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="faculty-email">Email</Label>
            <Input
              id="faculty-email"
              type="email"
              placeholder="science@run.edu"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="faculty-phone">Phone</Label>
            <Input
              id="faculty-phone"
              placeholder="+2348012345678"
              {...register("phoneNumber")}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="faculty-dean">
            Dean
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              (optional — users with the Dean role)
            </span>
          </Label>
          <select
            id="faculty-dean"
            className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
            {...register("deanUserId", {
              setValueAs: (v) => (v === "" ? undefined : Number(v)),
            })}
          >
            <option value="">— No dean assigned —</option>
            {eligibleDeans.map((d) => (
              <option key={d.id} value={d.id}>
                {[d.firstName, d.lastName].filter(Boolean).join(" ") || d.email}
                {" — "}
                {d.email}
              </option>
            ))}
          </select>
          {eligibleDeans.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No users hold the Dean role yet — assign one under Users first.
            </p>
          )}
        </div>
        {hasMultipleMajorPrograms && (
          <div className="space-y-1.5">
            <Label htmlFor="faculty-major-program">
              Major Program
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                (optional — blank = institution-wide)
              </span>
            </Label>
            <Controller
              control={control}
              name="majorProgramId"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : NONE}
                  onValueChange={(v) =>
                    field.onChange(v === NONE ? null : Number(v))
                  }
                >
                  <SelectTrigger id="faculty-major-program" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>
                      <span className="text-muted-foreground italic">
                        Institution-wide
                      </span>
                    </SelectItem>
                    {majorPrograms.map((mp) => (
                      <SelectItem key={mp.id} value={String(mp.id)}>
                        {mp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Backend support for tagging a faculty with its own major program
              is pending (sandbox/major-program-scoping A17) — until it ships,
              this faculty still groups under a major program only once one of
              its programs is assigned to it.
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
