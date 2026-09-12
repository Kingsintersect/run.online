"use client"

import { motion } from "framer-motion"
import {
  BookOpen,
  ClipboardList,
  MessageSquare,
  ExternalLink,
  RefreshCw,
  ArrowLeft,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import StatusBadge from "@/components/custom/StatusBadge"
import { useAssessment } from "../../hooks/use-sync-assessments"
import type { AssessmentType } from "../../types"

const typeConfig: Record<
  AssessmentType,
  {
    icon: React.ElementType
    label: string
    badge: "info" | "purple" | "orange"
  }
> = {
  assignment: { icon: ClipboardList, label: "Assignment", badge: "info" },
  quiz: { icon: BookOpen, label: "Quiz", badge: "purple" },
  forum: { icon: MessageSquare, label: "Forum", badge: "orange" },
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3 last:border-none sm:flex-row sm:items-center">
      <span className="w-36 shrink-0 text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-4 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-muted/60" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 rounded bg-muted/60" />
          <div className="h-5 w-64 rounded bg-muted/60" />
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-4 w-full rounded bg-muted/60" />
      ))}
    </div>
  )
}

interface AssessmentDetailViewProps {
  id: number
  backHref?: string
}

export function AssessmentDetailView({
  id,
  backHref,
}: AssessmentDetailViewProps) {
  const { data, isLoading, isError, refetch, isFetching } = useAssessment(id)

  if (isLoading) return <DetailSkeleton />

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <p className="text-sm text-muted-foreground">
          Failed to load assessment. It may have been removed.
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw size={14} className="mr-2" /> Retry
        </Button>
      </div>
    )
  }

  const {
    icon: Icon,
    label: typeLabel,
    badge,
  } = typeConfig[data.assessmentType]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Back link */}
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} /> Back
        </Link>
      )}

      {/* Header card */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted/50">
            <Icon size={22} className="text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={typeLabel} variant={badge} />
              <StatusBadge
                label={data.isVisible ? "Visible" : "Hidden"}
                variant={data.isVisible ? "success" : "default"}
              />
            </div>
            <h1 className="mt-2 text-xl leading-snug font-bold text-foreground">
              {data.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.courseCode} — {data.courseTitle}
            </p>
          </div>

          {isFetching && (
            <RefreshCw
              size={14}
              className="mt-1 shrink-0 animate-spin text-muted-foreground"
            />
          )}
        </div>

        {data.description && (
          <div className="mt-4 rounded-xl bg-muted/30 p-4">
            <p className="text-sm leading-relaxed text-foreground">
              {data.description}
            </p>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="rounded-2xl border border-border bg-card px-6">
        <InfoRow
          label="Due date"
          value={
            data.dueDate ? (
              new Date(data.dueDate).toLocaleString("en-GB", {
                dateStyle: "long",
                timeStyle: "short",
              })
            ) : (
              <span className="text-muted-foreground">No deadline</span>
            )
          }
        />
        <InfoRow
          label="Max grade"
          value={
            data.maxGrade !== null ? (
              `${data.maxGrade} marks`
            ) : (
              <span className="text-muted-foreground">Ungraded</span>
            )
          }
        />
        {data.semesterName && (
          <InfoRow
            label="Semester"
            value={
              data.academicSessionName
                ? `${data.semesterName} — ${data.academicSessionName}`
                : data.semesterName
            }
          />
        )}
        {data.moodleFullName && (
          <InfoRow
            label="Moodle course"
            value={
              <span className="flex items-center gap-1.5">
                {data.moodleFullName}
                <ExternalLink size={12} className="text-muted-foreground" />
              </span>
            }
          />
        )}
        <InfoRow
          label="Last synced"
          value={
            data.lastSyncAt ? (
              new Date(data.lastSyncAt).toLocaleString("en-GB", {
                dateStyle: "medium",
                timeStyle: "short",
              })
            ) : (
              <span className="text-muted-foreground">Never</span>
            )
          }
        />
      </div>
    </motion.div>
  )
}
