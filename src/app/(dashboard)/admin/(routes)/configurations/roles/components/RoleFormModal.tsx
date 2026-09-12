"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  roleSchema,
  type RoleFormInputValues,
  type RoleFormValues,
} from "@/schemas/roles.schema"
import type { Role, Permission } from "@/types/roles"
import PermissionPicker from "./PermissionPicker"

interface RoleFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (values: RoleFormValues) => Promise<void>
  role?: Role | null
  permissions: Permission[]
}

export default function RoleFormModal({
  open,
  onClose,
  onSubmit,
  role,
  permissions,
}: RoleFormModalProps) {
  const isEdit = !!role
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<RoleFormInputValues, unknown, RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: role?.name ?? "",
      slug: role?.slug ?? "",
      description: role?.description ?? "",
      is_default: role?.is_default ?? false,
      permission_ids: role?.permissions?.map((p) => p.id) ?? [],
    },
  })

  const selectedPermissions = watch("permission_ids") ?? []

  useEffect(() => {
    if (!open) return

    reset({
      name: role?.name ?? "",
      slug: role?.slug ?? "",
      description: role?.description ?? "",
      is_default: role?.is_default ?? false,
      permission_ids: role?.permissions?.map((p) => p.id) ?? [],
    })
  }, [open, reset, role])

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    setValue("name", name)
    if (!isEdit) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim()
      setValue("slug", slug)
    }
  }

  const handleFormSubmit = async (values: RoleFormValues) => {
    setSubmitting(true)
    try {
      await onSubmit(values)
      reset()
      onClose()
    } catch {
      // Error handled by parent
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Role" : "Create New Role"}
      subtitle={
        isEdit
          ? `Editing "${role.name}" role`
          : "Define a new role and assign permissions"
      }
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit(handleFormSubmit)}
            disabled={submitting}
          >
            {submitting && <Loader2 size={14} className="mr-2 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Role"}
          </Button>
        </>
      }
    >
      <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
        {/* Name & Slug */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="role-name">Role Name</Label>
            <Input
              id="role-name"
              placeholder="e.g. Head of Department"
              {...register("name")}
              onChange={handleNameChange}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role-slug">Slug</Label>
            <Input
              id="role-slug"
              placeholder="e.g. head-of-department"
              {...register("slug")}
              className="font-mono text-sm"
            />
            {errors.slug && (
              <p className="text-xs text-red-500">{errors.slug.message}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="role-desc">Description</Label>
          <Textarea
            id="role-desc"
            placeholder="Brief description of this role..."
            rows={2}
            {...register("description")}
          />
          {errors.description && (
            <p className="text-xs text-red-500">{errors.description.message}</p>
          )}
        </div>

        {/* Default toggle */}
        <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
          <div>
            <p className="text-sm font-medium text-foreground">Default Role</p>
            <p className="text-xs text-muted-foreground">
              Auto-assign this role when a new user registers
            </p>
          </div>
          <Switch
            checked={watch("is_default") ?? false}
            onCheckedChange={(val) => setValue("is_default", val)}
          />
        </div>

        {/* Permissions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Permissions</Label>
            <motion.span
              key={selectedPermissions.length}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
            >
              {selectedPermissions.length} selected
            </motion.span>
          </div>
          <PermissionPicker
            permissions={permissions}
            selected={selectedPermissions}
            onChange={(ids) => setValue("permission_ids", ids)}
          />
        </div>
      </form>
    </Modal>
  )
}
