"use client"

import { motion } from "framer-motion"
import { UserCheck } from "lucide-react"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { CourseRegistration } from "@/modules/enrollment/components/course-registration"

export default function StudentEnrollmentPage() {
  return (
    <PermissionGate
      require={{ resource: "enrollment", action: "view.own" }}
      denyBehavior="screen"
    >
      <div className="space-y-6 p-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <UserCheck size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Course Registration</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Register for open course offerings and manage your enrollment
            </p>
          </div>
        </motion.div>

        <CourseRegistration />
      </div>
    </PermissionGate>
  )
}
