"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { UserCheck, Plus, Layers } from "lucide-react"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { Button } from "@/components/ui/button"
import { useEnrollments } from "@/modules/enrollment/hooks/use-enrollments"
import { EnrollmentTable } from "@/modules/enrollment/components/enrollment-table"
import { EnrollStudentDialog } from "@/modules/enrollment/components/enroll-student-dialog"
import { BulkEnrollDialog } from "@/modules/enrollment/components/bulk-enroll-dialog"
import { DropEnrollmentDialog } from "@/modules/enrollment/components/drop-enrollment-dialog"
import { usePermissions } from "@/lib/permissions/usePermissions"
import type { EnrollmentRecord } from "@/modules/enrollment/types"

export default function AdminEnrollmentPage() {
  const { data, isLoading } = useEnrollments()
  const { can } = usePermissions()
  const canManage = can({ resource: "enrollment", action: "manage" })

  const [enrollOpen, setEnrollOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [dropping, setDropping] = useState<EnrollmentRecord | null>(null)

  const enrollments = data?.data ?? []
  const total = data?.meta?.total ?? enrollments.length

  return (
    <PermissionGate
      require={{ resource: "enrollment", action: "view.all" }}
      denyBehavior="screen"
    >
      <div className="space-y-6 p-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-start justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <UserCheck size={18} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Enrollment Management</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {total} enrollment record{total !== 1 ? "s" : ""} across all
                course offerings
              </p>
            </div>
          </div>

          {canManage && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setBulkOpen(true)}
              >
                <Layers size={13} />
                Bulk Enroll
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setEnrollOpen(true)}
              >
                <Plus size={13} />
                Enroll Student
              </Button>
            </div>
          )}
        </motion.div>

        <EnrollmentTable
          data={enrollments}
          loading={isLoading}
          canDrop={canManage}
          onDrop={setDropping}
        />
      </div>

      {canManage && (
        <>
          <EnrollStudentDialog
            open={enrollOpen}
            onClose={() => setEnrollOpen(false)}
          />
          <BulkEnrollDialog
            open={bulkOpen}
            onClose={() => setBulkOpen(false)}
          />
          <DropEnrollmentDialog
            enrollment={dropping}
            onClose={() => setDropping(null)}
          />
        </>
      )}
    </PermissionGate>
  )
}
