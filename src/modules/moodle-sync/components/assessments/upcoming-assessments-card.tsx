"use client"

import { AnimatePresence } from "framer-motion"
import { Clock, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useUpcomingAssessments } from "../../hooks/use-sync-assessments"
import { AssessmentCard } from "./assessment-card"

interface UpcomingAssessmentsCardProps {
  /** If provided, a "View all" link is shown */
  viewAllHref?: string
  /** Where each item links to */
  detailBaseHref?: string
}

function SkeletonRow() {
  return (
    <div className="flex animate-pulse items-start gap-3">
      <div className="h-9 w-9 shrink-0 rounded-xl bg-muted/60" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-16 rounded bg-muted/60" />
        <div className="h-4 w-3/4 rounded bg-muted/60" />
        <div className="h-3 w-24 rounded bg-muted/60" />
      </div>
    </div>
  )
}

export function UpcomingAssessmentsCard({
  viewAllHref,
  detailBaseHref = "/student/assessments",
}: UpcomingAssessmentsCardProps) {
  const { data, isLoading } = useUpcomingAssessments()
  const items = data?.data ?? []

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10">
            <Clock size={14} className="text-amber-500" />
          </div>
          <span className="text-sm font-semibold">Upcoming Deadlines</span>
        </div>
        {viewAllHref && (
          <Link href={viewAllHref}>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
              View all <ArrowRight size={12} />
            </Button>
          </Link>
        )}
      </div>

      {/* Items */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          No upcoming deadlines — you&apos;re all clear!
        </p>
      ) : (
        <AnimatePresence>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <AssessmentCard
                key={item.id}
                assessment={item}
                index={idx}
                href={`${detailBaseHref}/${item.id}`}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  )
}
