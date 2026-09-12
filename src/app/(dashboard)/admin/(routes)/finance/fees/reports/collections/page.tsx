"use client"

import { motion } from "framer-motion"
import { BarChart3 } from "lucide-react"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { CollectionsReport } from "@/modules/fee-management/components/admin/collections-report"

export default function CollectionsReportPage() {
  return (
    <PermissionGate
      require={{ resource: "fee-management", action: "view" }}
      denyBehavior="screen"
    >
      <div className="space-y-6 p-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <BarChart3 size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Collections Report
            </h1>
            <p className="text-sm text-muted-foreground">
              Revenue collected vs. total invoiced, grouped by fee type.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <CollectionsReport />
        </motion.div>
      </div>
    </PermissionGate>
  )
}
