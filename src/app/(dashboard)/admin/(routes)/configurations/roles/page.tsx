"use client"

import { motion } from "framer-motion"
import { ShieldCheck, Key } from "lucide-react"
import Tabs from "@/components/custom/Tabs"
import StatsCard from "./components/StatsCard"
import RolesPanel from "./components/RolesPanel"
import PermissionsPanel from "./components/PermissionsPanel"
import { useRoles, usePermissions } from "./hooks/useRolesData"

const tabs = [
  { key: "roles", label: "Roles", icon: <ShieldCheck size={16} /> },
  { key: "permissions", label: "Permissions", icon: <Key size={16} /> },
]

export default function RolesAndPermissionsPage() {
  const { roles } = useRoles()
  const { permissions, modules } = usePermissions()

  return (
    <div className="mx-auto space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Roles & Permissions
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage system roles, assign permissions, and control access across the
          platform.
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Roles"
          value={roles.length}
          icon="roles"
          delay={0}
        />
        <StatsCard
          title="Permissions"
          value={permissions.length}
          icon="permissions"
          delay={0.08}
        />
        <StatsCard
          title="Modules"
          value={modules.length}
          icon="modules"
          delay={0.16}
        />
        <StatsCard
          title="Default Roles"
          value={roles.filter((r) => r.is_default).length}
          icon="users"
          delay={0.24}
        />
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} defaultTab="roles">
        {(activeTab) => (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {activeTab === "roles" ? <RolesPanel /> : <PermissionsPanel />}
          </motion.div>
        )}
      </Tabs>
    </div>
  )
}
