"use client"

import { useEffect } from "react"
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
  useCreateDepartment,
  useUpdateDepartment,
  useEligibleHods,
} from "@/hooks/useCourseStructure"
import {
  departmentSchema,
  type DepartmentFormValues,
} from "@/schemas/school.schema"
import type { Department } from "@/types/school"

const NONE = "_NONE_"

interface DepartmentFormDialogProps {
  open: boolean
  onClose: () => void
  facultyId: number
  department?: Department | null
}

export function DepartmentFormDialog({
  open,
  onClose,
  facultyId,
  department,
}: DepartmentFormDialogProps) {
  const isEditing = !!department
  const createDepartment = useCreateDepartment()
  const updateDepartment = useUpdateDepartment()
  const isPending = createDepartment.isPending || updateDepartment.isPending

  // Head of Department candidates: users holding the `hod` role. That is
  // what the backend accepts for `hodUserId` (UpdateDepartmentRequest checks
  // the role). The department's nested `lecturers` can't be offered: live
  // they carry only {id, staffNumber, name} (the lecturer id, no user id),
  // and a plain tutor would be rejected anyway. HOD access follows the
  // department they head.
  const { data: hodUsers = [] } = useEligibleHods()

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { name: "", code: "" },
  })

  useEffect(() => {
    if (!open) return
    reset({
      name: department?.name ?? "",
      code: department?.code ?? "",
      description: department?.description ?? "",
      hodUserId: department?.hodUserId ?? undefined,
      email: department?.email ?? "",
      phoneNumber: department?.phoneNumber ?? "",
    })
  }, [open, department, reset])

  const onSubmit = async (values: DepartmentFormValues) => {
    try {
      if (isEditing) {
        await updateDepartment.mutateAsync({
          id: department.id,
          payload: values,
        })
        toast.success("Department updated")
      } else {
        await createDepartment.mutateAsync({ ...values, facultyId })
        toast.success("Department created")
      }
      onClose()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save department"
      )
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Department" : "Create Department"}
      subtitle="e.g., Department of Computer Science (code: CSC)"
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
            {isEditing ? "Save Changes" : "Create Department"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="dept-name">Department Name</Label>
            <Input
              id="dept-name"
              placeholder="Computer Science"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dept-code">Code</Label>
            <Input
              id="dept-code"
              placeholder="CSC"
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
          <Label htmlFor="dept-description">Description</Label>
          <Textarea
            id="dept-description"
            rows={2}
            {...register("description")}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="dept-email">Email</Label>
            <Input
              id="dept-email"
              type="email"
              placeholder="csc@run.edu"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dept-phone">Phone</Label>
            <Input
              id="dept-phone"
              placeholder="+2348012345678"
              {...register("phoneNumber")}
            />
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-1.5">
            <Label>Head of Department</Label>
            <Controller
              control={control}
              name="hodUserId"
              render={({ field }) => (
                <Select
                  value={field.value?.toString() ?? NONE}
                  onValueChange={(v) =>
                    field.onChange(v === NONE ? undefined : Number(v))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a head of department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>
                      <span className="text-muted-foreground italic">
                        — No HOD assigned —
                      </span>
                    </SelectItem>
                    {hodUsers.map((u) => (
                      <SelectItem key={`hod-${u.id}`} value={u.id.toString()}>
                        {[u.first_name, u.last_name]
                          .filter(Boolean)
                          .join(" ") || u.email}
                        {" — HOD role"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {hodUsers.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No users hold the HOD role yet. Give someone the HOD role (Users
                → Staff, or Manage Roles) first.
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              The head sees this department&apos;s students and results across
              every major program.
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            You can assign a Head of Department after creating it.
          </p>
        )}
      </div>
    </Modal>
  )
}
