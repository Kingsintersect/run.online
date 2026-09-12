"use client"

import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { SyncStatusTable } from "@/modules/moodle-sync/components/assessments/sync-status-table"
import { PermissionGate } from "@/lib/permissions/PermissionGate"

export default function AdminAssessmentsSyncStatusPage() {
  return (
    <PermissionGate
      require={{ resource: "assessments", action: "sync" }}
      denyBehavior="modal"
    >
      <div className="space-y-6 p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <Link
            href="/admin/assessments"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={13} /> Back to Assessments
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold">Moodle Sync Status</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Monitor and trigger assessment sync across all course offerings.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Sync status table */}
        <SyncStatusTable />
      </div>
    </PermissionGate>
  )
}
