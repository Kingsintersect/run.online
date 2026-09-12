"use client"

import { Users } from "lucide-react"
import { useEnrollmentsByOffering } from "../hooks/use-enrollments"
import { EnrollmentTable } from "./enrollment-table"
import EmptyState from "@/components/custom/EmptyState"

interface OfferingRosterProps {
  offeringId: number | null
  courseLabel?: string
}

export function OfferingRoster({
  offeringId,
  courseLabel,
}: OfferingRosterProps) {
  const { data = [], isLoading } = useEnrollmentsByOffering(offeringId)
  const active = data.filter((e) => e.status === "ENROLLED")

  if (!offeringId) {
    return (
      <EmptyState
        icon={Users}
        title="Select a course offering"
        description="Choose a course offering above to view its enrolled roster."
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">
          {active.length} enrolled{courseLabel ? ` — ${courseLabel}` : ""}
        </p>
      </div>
      <EnrollmentTable data={data} loading={isLoading} />
    </div>
  )
}
