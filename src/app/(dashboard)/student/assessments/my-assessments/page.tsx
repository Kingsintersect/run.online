"use client"

import { useMemo } from "react"
import { AssessmentFilters } from "@/modules/moodle-sync/components/assessments/assessment-filters"
import { AssessmentBrowseList } from "@/modules/moodle-sync/components/assessments/assessment-browse-list"
import { useMyAssessmentsList } from "@/modules/moodle-sync/hooks/use-sync-assessments"
import { useAssessmentsUiStore } from "@/modules/moodle-sync/store/assessments-ui.store"
import { PermissionGate } from "@/lib/permissions/PermissionGate"

export default function MyAssessmentsPage() {
  const { activeType, searchQuery, upcomingOnly, page, limit } =
    useAssessmentsUiStore()

  const { data, isLoading } = useMyAssessmentsList({
    type: activeType ?? undefined,
    upcoming: upcomingOnly || undefined,
    page,
    limit,
  })

  const items = useMemo(() => {
    const all = data?.data ?? []
    const search = searchQuery.trim().toLowerCase()
    if (!search) return all

    return all.filter((item) => {
      const haystack = [
        item.name,
        item.description ?? "",
        item.courseCode,
        item.courseTitle,
        item.assessmentType,
      ]
        .join(" ")
        .toLowerCase()

      return haystack.includes(search)
    })
  }, [data, searchQuery])

  return (
    <PermissionGate
      require={{ resource: "my-assessments", action: "view" }}
      denyBehavior="screen"
    >
      <div className="space-y-4">
        <AssessmentFilters showUpcomingToggle />
        <AssessmentBrowseList
          items={items}
          isLoading={isLoading}
          baseHref="/student/assessments"
        />
      </div>
    </PermissionGate>
  )
}
