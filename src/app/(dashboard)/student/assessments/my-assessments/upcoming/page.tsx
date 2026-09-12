"use client"

import { useMemo } from "react"
import { Clock } from "lucide-react"
import { AssessmentBrowseList } from "@/modules/moodle-sync/components/assessments/assessment-browse-list"
import { useUpcomingAssessments } from "@/modules/moodle-sync/hooks/use-sync-assessments"
import { AssessmentFilters } from "@/modules/moodle-sync/components/assessments/assessment-filters"
import { useAssessmentsUiStore } from "@/modules/moodle-sync/store/assessments-ui.store"
import { PermissionGate } from "@/lib/permissions/PermissionGate"

export default function UpcomingAssessmentsPage() {
  const { activeType, searchQuery } = useAssessmentsUiStore()

  const { data, isLoading } = useUpcomingAssessments()

  const items = useMemo(() => {
    const all = data?.data ?? []
    const byType = activeType
      ? all.filter((assessment) => assessment.assessmentType === activeType)
      : all

    const search = searchQuery.trim().toLowerCase()
    if (!search) return byType

    return byType.filter((item) => {
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
  }, [data, activeType, searchQuery])

  return (
    <PermissionGate
      require={{ resource: "my-assessments", action: "view" }}
      denyBehavior="screen"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <Clock size={16} />
          <span className="text-sm font-medium">
            Sorted by nearest deadline
          </span>
        </div>
        <AssessmentFilters />
        <AssessmentBrowseList
          items={items}
          isLoading={isLoading}
          baseHref="/student/assessments"
        />
      </div>
    </PermissionGate>
  )
}
