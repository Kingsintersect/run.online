"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Pencil, Users, Key, Shield, Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import StatusBadge from "@/components/custom/StatusBadge"
import EmptyState from "@/components/custom/EmptyState"
import { useRoleDetail } from "../hooks/useRolesData"

interface RoleDetailViewProps {
  roleId: number
}

const moduleColors: Record<
  string,
  "success" | "info" | "purple" | "warning" | "orange"
> = {
  academics: "info",
  finance: "success",
  admin: "purple",
  students: "warning",
}

export default function RoleDetailView({ roleId }: RoleDetailViewProps) {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<"permissions" | "users">(
    "permissions"
  )
  const { role, permissions, users, groupedPermissions, loading } =
    useRoleDetail(roleId)

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-32 rounded bg-muted" />
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-40 rounded bg-muted" />
              <div className="h-4 w-24 rounded bg-muted" />
            </div>
          </div>
          <div className="h-4 w-full rounded bg-muted" />
          <div className="mt-2 h-4 w-3/4 rounded bg-muted" />
        </div>
      </div>
    )
  }

  if (!role) {
    return (
      <EmptyState
        icon={Shield}
        title="Role not found"
        description="The role you're looking for doesn't exist or has been deleted."
        action={
          <Button
            onClick={() => router.push("/admin/configurations/roles")}
            variant="outline"
          >
            <ArrowLeft size={16} className="mr-1.5" />
            Back to Roles
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push("/admin/configurations/roles")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Back to Roles & Permissions
      </button>

      {/* Role header card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
              <Shield size={24} className="text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">
                  {role.name}
                </h1>
                {role.is_default && (
                  <StatusBadge label="Default" variant="info" dot />
                )}
              </div>
              <p className="font-mono text-sm text-muted-foreground">
                {role.slug}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(`/admin/configurations/roles/${roleId}/edit`)
              }
            >
              <Pencil size={14} className="mr-1.5" />
              Edit
            </Button>
          </div>
        </div>
        {role.description && (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {role.description}
          </p>
        )}

        {/* Quick stats */}
        <div className="mt-5 flex items-center gap-6 border-t border-border pt-5">
          <div className="flex items-center gap-2 text-sm">
            <Key size={14} className="text-muted-foreground" />
            <span className="font-medium text-foreground">
              {permissions.length}
            </span>
            <span className="text-muted-foreground">permissions</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users size={14} className="text-muted-foreground" />
            <span className="font-medium text-foreground">{users.length}</span>
            <span className="text-muted-foreground">users assigned</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Created</span>
            <span className="font-medium text-foreground">
              {new Date(role.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Section toggle */}
      <div className="flex w-fit items-center gap-0.5 rounded-xl bg-muted p-1">
        {(["permissions", "users"] as const).map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={cn(
              "relative flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              activeSection === section
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeSection === section && (
              <motion.div
                layoutId="role-detail-tab"
                className="absolute inset-0 rounded-lg border border-border bg-card shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {section === "permissions" ? (
                <Key size={14} />
              ) : (
                <Users size={14} />
              )}
              <span className="capitalize">{section}</span>
              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                {section === "permissions" ? permissions.length : users.length}
              </span>
            </span>
          </button>
        ))}
      </div>

      {/* Permissions section */}
      <AnimatePresence mode="wait">
        {activeSection === "permissions" ? (
          <motion.div
            key="permissions"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {Object.keys(groupedPermissions).length === 0 ? (
              <EmptyState
                icon={Key}
                title="No permissions assigned"
                description="This role doesn't have any permissions yet. Edit the role to assign permissions."
                action={
                  <Button
                    size="sm"
                    onClick={() =>
                      router.push(`/admin/configurations/roles/${roleId}/edit`)
                    }
                  >
                    <Pencil size={14} className="mr-1.5" />
                    Assign Permissions
                  </Button>
                }
              />
            ) : (
              Object.entries(groupedPermissions).map(([module, perms], i) => (
                <motion.div
                  key={module}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="overflow-hidden rounded-2xl border border-border bg-card"
                >
                  <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        label={module}
                        variant={moduleColors[module] ?? "default"}
                      />
                      <span className="text-xs text-muted-foreground">
                        {perms.length} permission
                        {perms.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="divide-y divide-border">
                    {perms.map((perm) => (
                      <div
                        key={perm.id}
                        className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-accent/30"
                      >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10">
                          <Check size={12} className="text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm">
                            <span className="font-medium text-foreground">
                              {perm.resource}
                            </span>
                            <span className="text-muted-foreground">
                              .{perm.action}
                            </span>
                          </p>
                          {perm.description && (
                            <p className="truncate text-xs text-muted-foreground">
                              {perm.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        ) : (
          <motion.div
            key="users"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
          >
            {users.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No users assigned"
                description="No users have been assigned to this role yet."
              />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="divide-y divide-border">
                  {users.map((user, i) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-accent/30"
                    >
                      {/* Avatar */}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {(
                          user.first_name?.[0] ??
                          user.username[0] ??
                          "?"
                        ).toUpperCase()}
                        {user.last_name?.[0]?.toUpperCase() ?? ""}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {user.first_name || user.last_name
                            ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
                            : user.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge
                          label={user.is_active ? "Active" : "Inactive"}
                          variant={user.is_active ? "success" : "destructive"}
                          dot
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
