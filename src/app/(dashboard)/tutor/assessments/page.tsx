"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { BookOpen } from "lucide-react"
import { AssessmentFilters } from "@/modules/moodle-sync/components/assessments/assessment-filters"
import { AssessmentBrowseList } from "@/modules/moodle-sync/components/assessments/assessment-browse-list"
import { useAssessmentsList } from "@/modules/moodle-sync/hooks/use-sync-assessments"
import { useAssessmentsUiStore } from "@/modules/moodle-sync/store/assessments-ui.store"
import { PermissionGate } from "@/lib/permissions/PermissionGate"

export default function TutorAssessmentsPage() {
  const { activeType, visibilityFilter, page, limit } = useAssessmentsUiStore()

  const isVisibleFilter =
    visibilityFilter === "visible"
      ? true
      : visibilityFilter === "hidden"
        ? false
        : undefined

  const { data, isLoading } = useAssessmentsList({
    type: activeType ?? undefined,
    isVisible: isVisibleFilter,
    page,
    limit,
  })

  const items = useMemo(() => data?.data ?? [], [data])
  const total = data?.meta?.total ?? 0

  return (
    <PermissionGate
      require={{ resource: "assessments", action: "view" }}
      denyBehavior="screen"
    >
      <div className="space-y-6 p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-start justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <BookOpen size={18} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Course Assessments</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Manage visibility for your assigned courses
              </p>
            </div>
          </div>
          {total > 0 && (
            <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
              {total} assessment{total !== 1 ? "s" : ""}
            </span>
          )}
        </motion.div>

        {/* Filters */}
        <AssessmentFilters showVisibilityFilter />

        {/* List with visibility toggles */}
        <AssessmentBrowseList
          items={items}
          isLoading={isLoading}
          showVisibilityToggle
          baseHref="/tutor/assessments"
        />
      </div>
    </PermissionGate>
  )
}
