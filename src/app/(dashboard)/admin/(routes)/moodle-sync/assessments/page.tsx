"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, ClipboardList } from "lucide-react"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { AssessmentList } from "@/modules/moodle-sync/components/assessments/assessment-list"

export default function MoodleSyncAssessmentsPage() {
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
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <ClipboardList size={18} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Assessments</h1>
              <p className="text-xs text-muted-foreground">
                Assignments, quizzes, and forums pulled from Moodle.
              </p>
            </div>
          </div>
        </motion.div>

        <AssessmentList />
      </div>
    </PermissionGate>
  )
}
