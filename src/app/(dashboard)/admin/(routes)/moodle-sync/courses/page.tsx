"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { ArrowLeft, BookOpen, Loader2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { CourseSyncTable } from "@/modules/moodle-sync/components/courses/course-sync-table"
import { usePullCourses } from "@/modules/moodle-sync/hooks/use-sync-mutations"

export default function MoodleSyncCoursesPage() {
  const pullCourses = usePullCourses()

  const handlePullAll = async () => {
    try {
      const result = await pullCourses.mutateAsync()
      toast.success(
        `Pulled ${result.pulled} course(s), created ${result.created}`
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Pull failed")
    }
  }

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
                <BookOpen size={18} className="text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Courses</h1>
                <p className="text-xs text-muted-foreground">
                  Course offerings mapped to Moodle courses.
                </p>
              </div>
            </div>
            <PermissionGate
              require={{ resource: "moodle-sync", action: "pull" }}
            >
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                disabled={pullCourses.isPending}
                onClick={handlePullAll}
              >
                {pullCourses.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Download size={13} />
                )}
                Pull from Moodle
              </Button>
            </PermissionGate>
          </div>
        </motion.div>

        <CourseSyncTable />
      </div>
    </PermissionGate>
  )
}
