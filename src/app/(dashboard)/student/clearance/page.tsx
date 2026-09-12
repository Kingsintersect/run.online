"use client"

import { MyClearanceDashboard } from "@/modules/clearance/components/student/my-clearance-dashboard"

export default function StudentClearancePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">My Clearance</h1>
        <p className="text-xs text-muted-foreground">
          Track and request clearance from each checkpoint (Library, Bursary,
          Department, etc.).
        </p>
      </div>
      <MyClearanceDashboard />
    </div>
  )
}
