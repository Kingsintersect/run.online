"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createUserSchema, type CreateUserFormValues } from "../schemas"
import { adminCreateUser } from "@/lib/auth/backendAuth"
import { rolesQueryOptions } from "@/services/rolesApi"
import { usersKeys } from "@/services/usersApi"
import { useMajorPrograms } from "@/hooks/useCourseStructure"

interface CreateUserModalProps {
  onClose: () => void
}

// A role that shouldn't be offered a major-program scope at all — Students
// are scoped implicitly via their enrolled Program, and Super Admin is
// always unscoped by definition (CLAUDE.md's Role-Based Route Ownership:
// "total control over the system"). Matched by substring on the role's
// display name rather than a fixed slug, since the live catalog's exact
// slug spelling for these two roles isn't guaranteed — see
// sandbox/major-program-scoping/FRONTEND_IMPLEMENTATION_PLAN.md §2.
const UNSCOPABLE_ROLE_NAME_PATTERN = /student|super\s*admin/i

export function CreateUserModal({ onClose }: CreateUserModalProps) {
  const { data: roles, isLoading: rolesLoading } = useQuery(
    rolesQueryOptions.list()
  )
  const { data: majorProgramsData } = useMajorPrograms()
  const majorPrograms = (majorProgramsData?.data ?? []).filter(
    (mp) => mp.isActive
  )
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([])
  const [selectedMajorProgramIds, setSelectedMajorProgramIds] = useState<
    number[]
  >([])
  const qc = useQueryClient()

  const selectedRoles = (roles ?? []).filter((r) =>
    selectedRoleIds.includes(r.id)
  )
  // Hidden entirely (not just empty) until at least one MajorProgram exists —
  // a single-major-program deployment must render identically to today, per
  // sandbox/major-program-scoping/README.md §0's governing rule.
  const showMajorProgramPicker =
    majorPrograms.length > 0 &&
    selectedRoles.length > 0 &&
    selectedRoles.some((r) => !UNSCOPABLE_ROLE_NAME_PATTERN.test(r.name))

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      first_name: "",
      middle_name: "",
      last_name: "",
      phone_number: "",
      role_ids: [],
      major_program_ids: [],
    },
  })

  const createMut = useMutation({
    mutationFn: adminCreateUser,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: usersKeys.all })
      toast.success("User created successfully")
      onClose()
    },
    onError: () => toast.error("Failed to create user"),
  })

  const toggleRole = (roleId: number) => {
    const next = selectedRoleIds.includes(roleId)
      ? selectedRoleIds.filter((id) => id !== roleId)
      : [...selectedRoleIds, roleId]
    setSelectedRoleIds(next)
    setValue("role_ids", next, { shouldValidate: true })
  }

  const toggleMajorProgram = (id: number) => {
    const next = selectedMajorProgramIds.includes(id)
      ? selectedMajorProgramIds.filter((mpId) => mpId !== id)
      : [...selectedMajorProgramIds, id]
    setSelectedMajorProgramIds(next)
    setValue("major_program_ids", next, { shouldValidate: true })
  }

  const onSubmit = (values: CreateUserFormValues) => {
    createMut.mutate({
      email: values.email,
      username: values.username,
      password: values.password,
      firstName: values.first_name || undefined,
      middleName: values.middle_name || undefined,
      lastName: values.last_name || undefined,
      phoneNumber: values.phone_number || undefined,
      roleIds: values.role_ids,
      majorProgramIds:
        showMajorProgramPicker && values.major_program_ids?.length
          ? values.major_program_ids
          : undefined,
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Add User"
      subtitle="Create a new user account and assign role(s)"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={createMut.isPending}
          >
            {createMut.isPending && (
              <Loader2
                className="size-4 animate-spin"
                data-icon="inline-start"
              />
            )}
            Create User
          </Button>
        </>
      }
    >
      <form className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input
              type="email"
              placeholder="user@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Username *</Label>
            <Input placeholder="jdoe" {...register("username")} />
            {errors.username && (
              <p className="text-sm text-destructive">
                {errors.username.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Password *</Label>
            <Input
              type="password"
              placeholder="Minimum 6 characters"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>First Name</Label>
            <Input {...register("first_name")} />
          </div>
          <div className="space-y-1.5">
            <Label>Last Name</Label>
            <Input {...register("last_name")} />
          </div>
          <div className="space-y-1.5">
            <Label>Middle Name</Label>
            <Input {...register("middle_name")} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone Number</Label>
            <Input {...register("phone_number")} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Roles *</Label>
          {rolesLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Loading roles…
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(roles ?? []).map((role) => {
                const selected = selectedRoleIds.includes(role.id)
                return (
                  <button
                    type="button"
                    key={role.id}
                    onClick={() => toggleRole(role.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {role.name}
                  </button>
                )
              })}
            </div>
          )}
          {errors.role_ids && (
            <p className="text-sm text-destructive">
              {errors.role_ids.message}
            </p>
          )}
        </div>

        {showMajorProgramPicker && (
          <div className="space-y-1.5">
            <Label>
              Major Program Scope
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {majorPrograms.map((mp) => {
                const selected = selectedMajorProgramIds.includes(mp.id)
                return (
                  <button
                    type="button"
                    key={mp.id}
                    onClick={() => toggleMajorProgram(mp.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {mp.name}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Leave unselected for an institution-wide (unscoped) grant. Each
              selected role above will be granted scoped to each major program
              selected here.
            </p>
          </div>
        )}
      </form>
    </Modal>
  )
}
