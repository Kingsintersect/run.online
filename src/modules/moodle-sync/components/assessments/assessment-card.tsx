"use client"

import { motion } from "framer-motion"
import {
  BookOpen,
  ClipboardList,
  MessageSquare,
  Calendar,
  Award,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import StatusBadge from "@/components/custom/StatusBadge"
import type { AssessmentResponse, AssessmentType } from "../../types"

// ── Assessment type config ────────────────────────────────────────────────────

const typeConfig: Record<
  AssessmentType,
  {
    icon: React.ElementType
    label: string
    colour: string
    badge: "info" | "purple" | "orange"
  }
> = {
  assignment: {
    icon: ClipboardList,
    label: "Assignment",
    colour: "text-blue-500",
    badge: "info",
  },
  quiz: {
    icon: BookOpen,
    label: "Quiz",
    colour: "text-violet-500",
    badge: "purple",
  },
  forum: {
    icon: MessageSquare,
    label: "Forum",
    colour: "text-orange-500",
    badge: "orange",
  },
}

function formatDueDate(dueDate: string | null): {
  label: string
  urgent: boolean
} {
  if (!dueDate) return { label: "No deadline", urgent: false }
  const now = Date.now()
  const due = new Date(dueDate).getTime()
  const diffMs = due - now
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffMs < 0) return { label: "Past due", urgent: true }
  if (diffHours < 24) return { label: `Due in ${diffHours}h`, urgent: true }
  if (diffDays < 3) return { label: `Due in ${diffDays}d`, urgent: true }
  return {
    label: new Date(dueDate).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    urgent: false,
  }
}

interface AssessmentCardProps {
  assessment: AssessmentResponse
  showVisibility?: boolean
  visibilityToggle?: React.ReactNode
  href?: string
  index?: number
}

export function AssessmentCard({
  assessment,
  showVisibility = false,
  visibilityToggle,
  href,
  index = 0,
}: AssessmentCardProps) {
  const {
    icon: Icon,
    label: typeLabel,
    colour,
    badge,
  } = typeConfig[assessment.assessmentType]
  const { label: dueDateLabel, urgent } = formatDueDate(assessment.dueDate)

  const CardContent = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className={cn(
        "group flex items-start gap-4 rounded-2xl border border-border bg-card p-5",
        "transition-all duration-200 hover:border-primary/30 hover:shadow-sm",
        !assessment.isVisible && "opacity-60"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/50",
          colour
        )}
      >
        <Icon size={18} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={typeLabel} variant={badge} />
            <span className="text-xs font-medium text-muted-foreground">
              {assessment.courseCode}
            </span>
          </div>
          {showVisibility && visibilityToggle}
        </div>

        <h3 className="mt-1.5 line-clamp-2 text-sm leading-snug font-semibold text-foreground transition-colors group-hover:text-primary">
          {assessment.name}
        </h3>

        {assessment.description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {assessment.description}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {/* Due date */}
          <span
            className={cn(
              "flex items-center gap-1",
              urgent && "font-semibold text-destructive"
            )}
          >
            <Calendar size={12} />
            {dueDateLabel}
          </span>

          {/* Max grade */}
          {assessment.maxGrade !== null && (
            <span className="flex items-center gap-1">
              <Award size={12} />
              {assessment.maxGrade} marks
            </span>
          )}

          {/* Course */}
          <span className="truncate text-muted-foreground/70">
            {assessment.courseTitle}
          </span>
        </div>
      </div>

      {href && (
        <ChevronRight
          size={16}
          className="mt-1 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary"
        />
      )}
    </motion.div>
  )

  if (href) {
    return <Link href={href}>{CardContent}</Link>
  }
  return CardContent
}
