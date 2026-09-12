"use client"

import { motion } from "framer-motion"
import { AlertTriangle } from "lucide-react"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { OverdueReport } from "@/modules/fee-management/components/admin/overdue-report"

export default function OverdueReportPage() {
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
          <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10">
            <AlertTriangle size={18} className="text-destructive" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Overdue Invoices
            </h1>
            <p className="text-sm text-muted-foreground">
              Students past their payment deadline with outstanding balances.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <OverdueReport />
        </motion.div>
      </div>
    </PermissionGate>
  )
}
