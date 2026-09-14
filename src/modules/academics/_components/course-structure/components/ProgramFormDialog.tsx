"use client"

import { useEffect, useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
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
  useCreateProgram,
  useUpdateProgram,
  useMajorPrograms,
  useLevels,
} from "@/hooks/useCourseStructure"
import {
  resolveFacultyAcademicUnit,
  academicStructureKeys,
} from "@/services/academicStructureApi"
import { programSchema, type ProgramFormValues } from "@/schemas/school.schema"
import type { Program } from "@/types/school"

interface ProgramFormDialogProps {
  open: boolean
  onClose: () => void
  /** Attach the new program under this department. Ignored when editing. */
  departmentId?: number
  /** Attach the new program directly under this faculty (no department) — pass instead of departmentId. Ignored when editing. */
  faculty?: { id: number; name: string }
  program?: Program | null
}

export function ProgramFormDialog({
  open,
  onClose,
  departmentId,
  faculty,
  program,
}: ProgramFormDialogProps) {
  const isEditing = !!program
  const createProgram = useCreateProgram()
  const updateProgram = useUpdateProgram()
  const { data: majorProgramsData } = useMajorPrograms()
  const majorPrograms = (majorProgramsData?.data ?? []).filter(
    (mp) => mp.isActive
  )
  const { data: levelsData } = useLevels()
  const levels = [...(levelsData?.data ?? [])].sort(
    (a, b) => a.numericValue - b.numericValue
  )
  const queryClient = useQueryClient()
  const [isResolving, setIsResolving] = useState(false)
  const isPending =
    createProgram.isPending || updateProgram.isPending || isResolving

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProgramFormValues>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      name: "",
      code: "",
      degreeType: "",
      durationYears: 4,
      minCreditUnits: 120,
      programCategory: "DEGREE",
      majorProgramId: null,
      entryLevelId: null,
    },
  })

  useEffect(() => {
    if (!open) return
    reset({
      name: program?.name ?? "",
      code: program?.code ?? "",
      degreeType: program?.degreeType ?? "",
      durationYears: program?.durationYears ?? 4,
      description: program?.description ?? "",
      admissionRequirements: program?.admissionRequirements ?? "",
      minCreditUnits: program?.minCreditUnits ?? 120,
      programCategory: program?.programCategory ?? "DEGREE",
      majorProgramId: program?.majorProgramId ?? null,
      entryLevelId: program?.entryLevelId ?? null,
    })
  }, [open, program, reset])

  const onSubmit = async (values: ProgramFormValues) => {
    try {
      if (isEditing) {
        await updateProgram.mutateAsync({ id: program.id, payload: values })
        toast.success("Program updated")
      } else if (faculty) {
        setIsResolving(true)
        const unit = await resolveFacultyAcademicUnit(faculty.id, faculty.name)
        // resolveFacultyAcademicUnit calls academicUnitsApi.create() directly
        // (not via useCreateAcademicUnit()), so it never triggers that hook's
        // own cache invalidation — do it here, otherwise a lazily-created
        // unit is invisible to useAcademicUnits() until a manual refetch.
        await queryClient.invalidateQueries({
          queryKey: academicStructureKeys.units.all,
        })
        setIsResolving(false)
        await createProgram.mutateAsync({
          ...values,
          departmentId: null,
          parentAcademicUnitId: unit.id,
        })
        toast.success("Program created")
      } else if (departmentId) {
        await createProgram.mutateAsync({ ...values, departmentId })
        toast.success("Program created")
      }
      onClose()
    } catch (err) {
      setIsResolving(false)
      toast.error(err instanceof Error ? err.message : "Failed to save program")
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Program" : "Create Program"}
      subtitle={
        !isEditing && faculty
          ? `e.g., B.Sc. Computer Science — attaches directly to ${faculty.name}, no department`
          : "e.g., B.Sc. Computer Science (code: CSC-BSC)"
      }
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
            {isEditing ? "Save Changes" : "Create Program"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="program-name">Program Name</Label>
          <Input
            id="program-name"
            placeholder="B.Sc. Computer Science"
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Program Category</Label>
          <Controller
            control={control}
            name="programCategory"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEGREE">Degree</SelectItem>
                  <SelectItem value="POSTGRADUATE">Postgraduate</SelectItem>
                  <SelectItem value="CERTIFICATE">Certificate</SelectItem>
                  <SelectItem value="DIPLOMA">Diploma</SelectItem>
                  <SelectItem value="FOUNDATIONAL">Foundational</SelectItem>
                  <SelectItem value="PART_TIME">Part-Time</SelectItem>
                  <SelectItem value="SECONDARY_SCHOOL">
                    Secondary School
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-xs text-muted-foreground">
            Drives which grading scheme and admission workflow this program gets
            — see sandbox/multi-program-platform/.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>
            Major Program
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              (optional)
            </span>
          </Label>
          <Controller
            control={control}
            name="majorProgramId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : "none"}
                onValueChange={(v) =>
                  field.onChange(v === "none" ? null : Number(v))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Not assigned —</SelectItem>
                  {majorPrograms.map((mp) => (
                    <SelectItem key={mp.id} value={String(mp.id)}>
                      {mp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-xs text-muted-foreground">
            Which administrative grouping (Degree, Part-Time, Business School,
            …) this program is scoped under — see
            sandbox/major-program-scoping/. Independent of Program Category
            above.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>
            Entry Level
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              (optional)
            </span>
          </Label>
          <Controller
            control={control}
            name="entryLevelId"
            render={({ field }) => (
              <Select
                value={field.value ? String(field.value) : "none"}
                onValueChange={(v) =>
                  field.onChange(v === "none" ? null : Number(v))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No restriction —</SelectItem>
                  {levels.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-xs text-muted-foreground">
            Lowest Level a fresh admission offer into this program can target —
            e.g. 200 Level for a Part-Time direct-entry program.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="program-code">Code</Label>
            <Input
              id="program-code"
              placeholder="CSC-BSC"
              aria-invalid={!!errors.code}
              {...register("code")}
              disabled={isEditing}
            />
            {errors.code && (
              <p className="text-sm text-destructive">{errors.code.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="program-degree">Degree Type</Label>
            <Input
              id="program-degree"
              placeholder="B.Sc"
              aria-invalid={!!errors.degreeType}
              {...register("degreeType")}
            />
            {errors.degreeType && (
              <p className="text-sm text-destructive">
                {errors.degreeType.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="program-duration">Duration (years)</Label>
            <Input
              id="program-duration"
              type="number"
              min={1}
              aria-invalid={!!errors.durationYears}
              {...register("durationYears", { valueAsNumber: true })}
            />
            {errors.durationYears && (
              <p className="text-sm text-destructive">
                {errors.durationYears.message}
              </p>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="program-min-units">Minimum Credit Units</Label>
          <Input
            id="program-min-units"
            type="number"
            min={1}
            className="max-w-40"
            aria-invalid={!!errors.minCreditUnits}
            {...register("minCreditUnits", { valueAsNumber: true })}
          />
          {errors.minCreditUnits && (
            <p className="text-sm text-destructive">
              {errors.minCreditUnits.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="program-description">Description</Label>
          <Textarea
            id="program-description"
            rows={2}
            {...register("description")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="program-requirements">Admission Requirements</Label>
          <Textarea
            id="program-requirements"
            rows={2}
            placeholder="5 O'Level credits including Mathematics and English"
            {...register("admissionRequirements")}
          />
        </div>
      </div>
    </Modal>
  )
}
