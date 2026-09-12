"use client"

import { AnimatePresence, motion } from "framer-motion"
import EmptyState from "@/components/custom/EmptyState"
import { ClipboardList } from "lucide-react"
import { AssessmentCard } from "./assessment-card"
import { VisibilityToggle } from "./visibility-toggle"
import type { AssessmentResponse } from "../../types"

interface AssessmentBrowseListProps {
  items: AssessmentResponse[]
  isLoading?: boolean
  showVisibilityToggle?: boolean
  /** If provided, each card links to the detail page */
  baseHref?: string
}

function SkeletonCard() {
  return (
    <div className="flex animate-pulse gap-4 rounded-2xl border border-border bg-card p-5">
      <div className="h-10 w-10 shrink-0 rounded-xl bg-muted/60" />
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <div className="h-4 w-16 rounded-full bg-muted/60" />
          <div className="h-4 w-12 rounded-full bg-muted/60" />
        </div>
        <div className="h-4 w-3/4 rounded bg-muted/60" />
        <div className="h-3 w-full rounded bg-muted/60" />
        <div className="mt-2 flex gap-3">
          <div className="h-3 w-20 rounded bg-muted/60" />
          <div className="h-3 w-16 rounded bg-muted/60" />
        </div>
      </div>
    </div>
  )
}

export function AssessmentBrowseList({
  items,
  isLoading = false,
  showVisibilityToggle = false,
  baseHref,
}: AssessmentBrowseListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No assessments found"
        description="Try adjusting your filters or check back after the next Moodle sync."
      />
    )
  }

  return (
    <AnimatePresence mode="popLayout">
      <div className="space-y-3">
        {items.map((item, idx) => (
          <motion.div key={item.id} layout>
            <AssessmentCard
              assessment={item}
              index={idx}
              showVisibility={showVisibilityToggle}
              href={baseHref ? `${baseHref}/${item.id}` : undefined}
              visibilityToggle={
                showVisibilityToggle ? (
                  <VisibilityToggle
                    assessmentId={item.id}
                    isVisible={item.isVisible}
                  />
                ) : undefined
              }
            />
          </motion.div>
        ))}
      </div>
    </AnimatePresence>
  )
}
