"use client"

import { motion } from "framer-motion"
import { ClipboardCheck } from "lucide-react"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { ClearanceReviewQueue } from "@/modules/clearance/components/staff/clearance-review-queue"

export default function ManagerClearancePage() {
  return (
    <PermissionGate
      require={{ resource: "clearance", action: "view" }}
      denyBehavior="screen"
    >
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <ClipboardCheck size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Clearance Review
            </h1>
            <p className="text-xs text-muted-foreground">
              Approve or reject student clearance requests for your
              checkpoint(s).
            </p>
          </div>
        </motion.div>

        <ClearanceReviewQueue />
      </div>
    </PermissionGate>
  )
}
