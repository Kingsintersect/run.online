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

interface CreateUserModalProps {
  onClose: () => void
}

export function CreateUserModal({ onClose }: CreateUserModalProps) {
  const { data: roles, isLoading: rolesLoading } = useQuery(
    rolesQueryOptions.list()
  )
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([])
  const qc = useQueryClient()

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
      </form>
    </Modal>
  )
}
