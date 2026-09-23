"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  GraduationCap,
  BookOpen,
  Briefcase,
  ShieldCheck,
  Plus,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useUserStats, useUsers } from "../hooks/useUsersData"
import { ManageRolesModal } from "./ManageRolesModal"
import { CreateUserModal } from "./CreateUserModal"
import DataTable, { type Column } from "@/components/custom/DataTable"
import Avatar from "@/components/custom/Avatar"
import StatusBadge from "@/components/custom/StatusBadge"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/store"
import { UserRole } from "@/config/nav.config"
import type { User } from "@/types/users"
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"

const COLORS = {
  students: "#10b981",
  tutors: "#8b5cf6",
  staff: "#f59e0b",
  active: "#06b6d4",
  inactive: "#ef4444",
}

const columns: Column<User & Record<string, unknown>>[] = [
  {
    key: "name",
    header: "User",
    sortable: true,
    width: "30%",
    render: (row) => (
      <div className="flex items-center gap-3">
        <Avatar
          name={`${row.first_name ?? ""} ${row.last_name ?? ""}`}
          size="sm"
          status={row.is_active ? "online" : "offline"}
        />
        <div>
          <p className="text-sm font-medium text-foreground">
            {row.first_name ?? "—"} {row.last_name ?? ""}
          </p>
          <p className="text-xs text-muted-foreground">{row.username}</p>
        </div>
      </div>
    ),
  },
  { key: "email", header: "Email", sortable: true },
  {
    key: "roles",
    header: "Roles",
    render: (row) =>
      row.roles.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {row.roles.map((r) => (
            <StatusBadge key={r} label={r} variant="purple" />
          ))}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">No role</span>
      ),
  },
  {
    key: "is_active",
    header: "Status",
    align: "center",
    render: (row) => (
      <StatusBadge
        label={row.is_active ? "Active" : "Inactive"}
        variant={row.is_active ? "success" : "destructive"}
        dot
      />
    ),
  },
  {
    key: "created_at",
    header: "Registered",
    sortable: true,
    render: (row) => (
      <span className="text-xs text-muted-foreground">
        {new Date(row.created_at).toLocaleDateString()}
      </span>
    ),
  },
]

export default function UsersSummaryPage() {
  const router = useRouter()
  const { data: statsData, isLoading: statsLoading } = useUserStats()
  const { data: usersData, isLoading: usersLoading } = useUsers()
  const stats = statsData?.data
  const [managingRolesFor, setManagingRolesFor] = useState<User | null>(null)
  const [showCreateUser, setShowCreateUser] = useState(false)

  // Creating a user and assigning roles both hit backend endpoints gated
  // on the literal `admin` role (UserController::store(),
  // UserRoleController — see BaseUserController::requireRoles(['admin'])
  // and UserRoleController::requireAdmin()), not a permission. DEAN and
  // STAFF share this same page/layout (manager/layout.tsx's RoleGuard)
  // and have real, broader permissions for plenty of what's on it, but
  // NOT this — showing them these two controls unconditionally meant
  // clicking either always 403'd. Fixed 2026-09-16, direct product
  // instruction ("Deans should not have all the admin permissions").
  const { user } = useAppStore()
  const isAdmin = user?.role === UserRole.ADMIN

  return (
    <div className="mx-auto space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            User Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of all platform users. Use the tabs in the sidebar to
            manage Students, Tutors, and Staff.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreateUser(true)}>
            <Plus className="size-4" data-icon="inline-start" />
            Add User
          </Button>
        )}
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Distribution Donut */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <h2 className="mb-1 text-sm font-semibold text-foreground">
            User Distribution
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Breakdown by role — {stats?.total_users ?? 0} total users
          </p>
          {statsLoading ? (
            <div className="flex h-55 items-center justify-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="60%" height={220}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Students", value: stats?.total_students ?? 0 },
                      { name: "Tutors", value: stats?.total_tutors ?? 0 },
                      { name: "Staff", value: stats?.total_staff ?? 0 },
                    ]}
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    <Cell fill={COLORS.students} />
                    <Cell fill={COLORS.tutors} />
                    <Cell fill={COLORS.staff} />
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      fontSize: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                    }}
                    itemStyle={{ color: "var(--foreground)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {[
                  {
                    label: "Students",
                    value: stats?.total_students ?? 0,
                    color: COLORS.students,
                    icon: GraduationCap,
                  },
                  {
                    label: "Tutors",
                    value: stats?.total_tutors ?? 0,
                    color: COLORS.tutors,
                    icon: BookOpen,
                  },
                  {
                    label: "Staff",
                    value: stats?.total_staff ?? 0,
                    color: COLORS.staff,
                    icon: Briefcase,
                  },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: item.color }}
                    />
                    <item.icon size={14} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {item.label}
                    </span>
                    <span className="ml-auto text-sm font-bold text-foreground">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Active vs Inactive Bar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <h2 className="mb-1 text-sm font-semibold text-foreground">
            Activity Status
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Active vs inactive users
          </p>
          {statsLoading ? (
            <div className="flex h-55 items-center justify-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={[
                  {
                    name: "Students",
                    active: stats?.total_students ?? 0,
                    inactive: 0,
                  },
                  {
                    name: "Tutors",
                    active: stats?.total_tutors ?? 0,
                    inactive: 0,
                  },
                  {
                    name: "Staff",
                    active: stats?.total_staff ?? 0,
                    inactive: 0,
                  },
                  {
                    name: "Overall",
                    active: stats?.active_users ?? 0,
                    inactive:
                      (stats?.total_users ?? 0) - (stats?.active_users ?? 0),
                  },
                ]}
                barGap={4}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    fontSize: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                  }}
                  itemStyle={{ color: "var(--foreground)" }}
                />
                <Bar
                  dataKey="active"
                  name="Active"
                  fill={COLORS.active}
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="inactive"
                  name="Inactive"
                  fill={COLORS.inactive}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            label: "Manage Students",
            desc: "View & update student records",
            icon: GraduationCap,
            href: "/admin/users/students",
            color: "text-emerald-500",
          },
          {
            label: "Manage Tutors",
            desc: "Add tutors from existing users",
            icon: BookOpen,
            href: "/admin/users/tutors",
            color: "text-violet-500",
          },
          {
            label: "Manage Staff",
            desc: "Add staff & assign roles",
            icon: Briefcase,
            href: "/admin/users/staff",
            color: "text-amber-500",
          },
        ].map((item, i) => (
          <motion.button
            key={item.href}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.08 }}
            onClick={() => router.push(item.href)}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-colors hover:bg-accent"
          >
            <div className="rounded-xl bg-muted p-3">
              <item.icon size={22} className={item.color} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {item.label}
              </p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* All users table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          All Users
        </h2>
        <DataTable
          data={(usersData?.data ?? []) as (User & Record<string, unknown>)[]}
          columns={[
            ...columns,
            ...(isAdmin
              ? [
                  {
                    key: "actions",
                    header: "",
                    align: "center" as const,
                    width: "70px",
                    render: (row: User) => (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setManagingRolesFor(row)}
                        title="Manage roles"
                      >
                        <ShieldCheck className="size-3.5" />
                      </Button>
                    ),
                  },
                ]
              : []),
          ]}
          loading={usersLoading}
          searchPlaceholder="Search by name, email, or username…"
          searchExtractor={(row) =>
            `${row.first_name ?? ""} ${row.last_name ?? ""} ${row.email} ${row.username}`
          }
          rowKey="id"
          pageSize={10}
          emptyMessage="No users found"
        />
      </motion.div>

      {managingRolesFor && (
        <ManageRolesModal
          userId={managingRolesFor.id}
          userName={
            managingRolesFor.first_name || managingRolesFor.last_name
              ? `${managingRolesFor.first_name ?? ""} ${managingRolesFor.last_name ?? ""}`.trim()
              : managingRolesFor.username
          }
          onClose={() => setManagingRolesFor(null)}
        />
      )}

      {showCreateUser && (
        <CreateUserModal onClose={() => setShowCreateUser(false)} />
      )}
    </div>
  )
}
