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
import {
  createUserSchema,
  type CreateUserFormValues,
  type CreateUserDto,
} from "../schemas"
import { adminCreateUser } from "@/lib/auth/backendAuth"
import { rolesQueryOptions } from "@/services/rolesApi"
import { usersKeys } from "@/services/usersApi"
import { useMajorPrograms } from "@/hooks/useCourseStructure"
import { getErrorMessage, getFieldValidationMessage } from "@/lib/errors"
import { UNSCOPED_ROLE_NAME_PATTERN } from "../lib/role-scope"

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
// Since 2026-09-26 the cross-program teaching roles (tutor, HOD, dean) are
// unscoped too: see lib/role-scope.ts.
const UNSCOPABLE_ROLE_NAME_PATTERN = UNSCOPED_ROLE_NAME_PATTERN

export function CreateUserModal({ onClose }: CreateUserModalProps) {
  const { data: roles, isLoading: rolesLoading } = useQuery(
    rolesQueryOptions.list()
  )
  const { data: majorProgramsData } = useMajorPrograms()
  const majorPrograms = (majorProgramsData?.data ?? []).filter(
    (mp) => mp.isActive
  )
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([])
  const [selectedMajorProgramId, setSelectedMajorProgramId] = useState<
    number | null
  >(null)
  const qc = useQueryClient()

  const selectedRoles = (roles ?? []).filter((r) =>
    selectedRoleIds.includes(r.id)
  )
  // Rendered (and required) only once a role is selected that isn't
  // Student/Applicant/Super Admin — those three never take a major-program
  // scope at all, per sandbox/major-program-scoping/API_CONTRACTS.md §5
  // (revised 2026-09-16). Unlike the old optional array design, this no
  // longer hides on an empty major-program catalog: the field being required
  // for a scoped role is a real backend constraint, not a frontend
  // convenience, so an empty catalog surfaces as an honest "none configured
  // yet" state below rather than silently disappearing.
  const requiresMajorProgram =
    selectedRoles.length > 0 &&
    selectedRoles.some((r) => !UNSCOPABLE_ROLE_NAME_PATTERN.test(r.name))

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CreateUserFormValues, unknown, CreateUserDto>({
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
      requires_major_program: false,
      major_program_id: undefined,
    },
  })

  const createMut = useMutation({
    mutationFn: adminCreateUser,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: usersKeys.all })
      toast.success("User created successfully")
      onClose()
    },
    onError: (err) => {
      const scopedMessage = getFieldValidationMessage(err, "majorProgramIds")
      if (scopedMessage) {
        setError("major_program_id", {
          type: "server",
          message: scopedMessage,
        })
        toast.error(scopedMessage)
        return
      }
      toast.error(getErrorMessage(err, "Failed to create user"))
    },
  })

  // Recomputes `requiresMajorProgram` for the next role selection right here
  // (rather than syncing it from an effect, which would call setState
  // synchronously during render's commit phase) and keeps the schema's
  // `requires_major_program` flag — and any stale major-program selection —
  // in sync with it in the same handler that changes role_ids.
  const toggleRole = (roleId: number) => {
    const next = selectedRoleIds.includes(roleId)
      ? selectedRoleIds.filter((id) => id !== roleId)
      : [...selectedRoleIds, roleId]
    setSelectedRoleIds(next)
    setValue("role_ids", next, { shouldValidate: true })

    const nextSelectedRoles = (roles ?? []).filter((r) => next.includes(r.id))
    const nextRequiresMajorProgram =
      nextSelectedRoles.length > 0 &&
      nextSelectedRoles.some((r) => !UNSCOPABLE_ROLE_NAME_PATTERN.test(r.name))
    setValue("requires_major_program", nextRequiresMajorProgram, {
      shouldValidate: true,
    })
    if (!nextRequiresMajorProgram) {
      setSelectedMajorProgramId(null)
      setValue("major_program_id", undefined, { shouldValidate: true })
    }
  }

  const selectMajorProgram = (id: number) => {
    const next = selectedMajorProgramId === id ? null : id
    setSelectedMajorProgramId(next)
    setValue("major_program_id", next ?? undefined, { shouldValidate: true })
  }

  const onSubmit = (values: CreateUserDto) => {
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
        values.requires_major_program && values.major_program_id
          ? [values.major_program_id]
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

        {requiresMajorProgram && (
          <div className="space-y-1.5">
            <Label>Major Program *</Label>
            {majorPrograms.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {majorPrograms.map((mp) => {
                  const selected = selectedMajorProgramId === mp.id
                  return (
                    <button
                      type="button"
                      key={mp.id}
                      onClick={() => selectMajorProgram(mp.id)}
                      aria-pressed={selected}
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
            ) : (
              <p className="text-xs text-muted-foreground">
                No major programs configured yet. Create one under Academic
                Structure before assigning this role.
              </p>
            )}
            {errors.major_program_id && (
              <p className="text-sm text-destructive">
                {errors.major_program_id.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              The selected role(s) above will be granted scoped to this major
              program.
            </p>
          </div>
        )}
      </form>
    </Modal>
  )
}
