"use client"

import { motion } from "framer-motion"
import { Building2 } from "lucide-react"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { HostelAdminPanel } from "@/modules/hostel/components/admin/hostel-admin-panel"

export default function AdminHostelsPage() {
  return (
    <PermissionGate
      require={{ resource: "hostels", action: "view" }}
      denyBehavior="screen"
    >
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <Building2 size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Hostel Management
            </h1>
            <p className="text-xs text-muted-foreground">
              Hostels, blocks, rooms, and student room allocations.
            </p>
          </div>
        </motion.div>

        <HostelAdminPanel />
      </div>
    </PermissionGate>
  )
}
