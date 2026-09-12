"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, AlertTriangle } from "lucide-react"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { EnrollmentErrorsPanel } from "@/modules/moodle-sync/components/enrollments/enrollment-errors-panel"

export default function MoodleSyncEnrollmentErrorsPage() {
  return (
    <PermissionGate
      require={{ resource: "moodle-sync", action: "view" }}
      denyBehavior="screen"
    >
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <Link
            href="/admin/moodle-sync/enrollments"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={13} /> Back to Enrollments
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10">
              <AlertTriangle size={18} className="text-destructive" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Failed Enrollment Syncs
              </h1>
              <p className="text-xs text-muted-foreground">
                Debug and retry enrollments that failed to sync to Moodle.
              </p>
            </div>
          </div>
        </motion.div>

        <EnrollmentErrorsPanel />
      </div>
    </PermissionGate>
  )
}
