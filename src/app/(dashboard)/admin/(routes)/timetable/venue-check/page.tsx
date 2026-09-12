"use client"

import { motion } from "framer-motion"
import { Building } from "lucide-react"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { VenueAvailabilityChecker } from "@/modules/timetable/components/VenueAvailabilityChecker"

export default function VenueCheckPage() {
  return (
    <PermissionGate
      require={{ resource: "timetable", action: "manage" }}
      denyBehavior="modal"
    >
      <div className="space-y-6 p-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Building size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Venue Availability</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Check which time windows are free for a given venue and day
            </p>
          </div>
        </motion.div>

        <VenueAvailabilityChecker />
      </div>
    </PermissionGate>
  )
}
