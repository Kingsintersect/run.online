"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, Link2, AlertTriangle } from "lucide-react"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { EnrollmentSyncTable } from "@/modules/moodle-sync/components/enrollments/enrollment-sync-table"

export default function MoodleSyncEnrollmentsPage() {
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
            href="/admin/moodle-sync"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={13} /> Back to Moodle Sync
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                <Link2 size={18} className="text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Enrollments
                </h1>
                <p className="text-xs text-muted-foreground">
                  Student ↔ course enrollment sync to Moodle.
                </p>
              </div>
            </div>
            <Link
              href="/admin/moodle-sync/enrollments/errors"
              className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
            >
              <AlertTriangle size={12} />
              View Errors
            </Link>
          </div>
        </motion.div>

        <EnrollmentSyncTable />
      </div>
    </PermissionGate>
  )
}
