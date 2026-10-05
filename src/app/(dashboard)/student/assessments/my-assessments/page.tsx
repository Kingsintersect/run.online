"use client"

import { QueryErrorState } from "@/components/query-error-state"
import { useMemo } from "react"
import { AssessmentFilters } from "@/modules/moodle-sync/components/assessments/assessment-filters"
import { AssessmentBrowseList } from "@/modules/moodle-sync/components/assessments/assessment-browse-list"
import { useMyAssessmentsList } from "@/modules/moodle-sync/hooks/use-sync-assessments"
import { useAssessmentsUiStore } from "@/modules/moodle-sync/store/assessments-ui.store"
import { PermissionGate } from "@/lib/permissions/PermissionGate"

export default function MyAssessmentsPage() {
  const { activeType, searchQuery, upcomingOnly, page, limit } =
    useAssessmentsUiStore()

  const { data, isLoading, isError, error, refetch } = useMyAssessmentsList({
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
        {/* A refused (403) or failed load isn't "no assessments". */}
        {isError ? (
          <QueryErrorState
            error={error}
            subject="your assessments"
            onRetry={() => void refetch()}
          />
        ) : (
          <AssessmentBrowseList
            items={items}
            isLoading={isLoading}
            baseHref="/student/assessments"
          />
        )}
      </div>
    </PermissionGate>
  )
}
