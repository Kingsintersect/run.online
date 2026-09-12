"use client"

import { motion } from "framer-motion"
import { CalendarCheck } from "lucide-react"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { MyAttendanceSummary } from "@/modules/enrollment/components/my-attendance-summary"

export default function StudentAttendancePage() {
  return (
    <PermissionGate
      require={{ resource: "attendance", action: "view.own" }}
      denyBehavior="screen"
    >
      <div className="space-y-6 p-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <CalendarCheck size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">My Attendance</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Your attendance record across all enrolled courses
            </p>
          </div>
        </motion.div>

        <MyAttendanceSummary />
      </div>
    </PermissionGate>
  )
}
