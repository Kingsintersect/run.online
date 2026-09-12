"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronDown, BookOpen, AlertCircle } from "lucide-react"
import { courseOfferingQueryOptions } from "@/services/courseOfferingApi"
import EmptyState from "@/components/custom/EmptyState"
import { GradesTable } from "./grades-table"
import { GradeDetailModal } from "./modals/grade-detail-modal"
import { TranscriptModal } from "./modals/transcript-modal"
import { GradesExportToolbar } from "./export-toolbar"
import {
  useGradesByCourseAndSemester,
  useStudentTranscript,
} from "../hooks/use-grades-data"
import { useGradesExport } from "../hooks/use-grades-export"
import { useGradesStore } from "../store/gradesStore"
import type { CourseOffering } from "@/types/school"
import type { GradesPaginationState } from "../types/grades.types"

interface TutorCourseGradeBookProps {
  canManage?: boolean
  canExport?: boolean
}

// Course-scoped grade book for a lecturer: pick one of your course offerings
// and see every student's grade for that course + semester in one call
// (GET /results/grades/course/:courseId/semester/:semesterId). Unpaginated —
// one offering is a bounded list — so the pagination bar is a fixed single
// page.
export function TutorCourseGradeBook({
  canManage = false,
  canExport = false,
}: TutorCourseGradeBookProps) {
  const [selectedOffering, setSelectedOffering] =
    useState<CourseOffering | null>(null)

  const { data: offeringsRes, isLoading: offeringsLoading } = useQuery(
    courseOfferingQueryOptions.list()
  )
  const offerings = offeringsRes?.data ?? []

  const { grades, loading, isError } = useGradesByCourseAndSemester(
    selectedOffering?.course_id ?? null,
    selectedOffering?.semester_id ?? null
  )

  const {
    gradeDetailOpen,
    closeGradeDetail,
    openGradeDetail,
    openTranscript,
    transcriptOpen,
    closeTranscript,
    transcriptStudentId,
  } = useGradesStore()

  const { transcript, loading: transcriptLoading } =
    useStudentTranscript(transcriptStudentId)

  const { exporting, exportCSV, exportExcel, exportPDF } = useGradesExport()

  const pagination: GradesPaginationState = {
    page: 1,
    pageSize: Math.max(grades.length, 1),
    total: grades.length,
    totalPages: 1,
  }

  const summary = useMemo(() => {
    const scored = grades.filter((g) => g.totalScore !== null)
    const avg =
      scored.length > 0
        ? scored.reduce((s, g) => s + (g.totalScore ?? 0), 0) / scored.length
        : null
    const passed = scored.filter((g) => (g.gradePoint ?? 0) >= 1).length
    return {
      count: grades.length,
      avg,
      passRate: scored.length > 0 ? (passed / scored.length) * 100 : null,
    }
  }, [grades])

  return (
    <div className="space-y-4">
      {/* Offering picker */}
      <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Course Grade Book
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pick one of your courses to see every student&apos;s grade for that
            semester.
          </p>
        </div>
        <div className="relative">
          <select
            className="w-full appearance-none rounded-xl border border-border bg-background px-3 py-2.5 pr-8 text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:outline-none"
            value={selectedOffering?.id ?? ""}
            disabled={offeringsLoading}
            onChange={(e) =>
              setSelectedOffering(
                offerings.find((o) => o.id === Number(e.target.value)) ?? null
              )
            }
          >
            <option value="">
              {offeringsLoading
                ? "Loading courses…"
                : "Select a course offering…"}
            </option>
            {offerings.map((o) => (
              <option key={o.id} value={o.id}>
                {o.course_code} — {o.course_title}
                {" · "}
                {[
                  o.semester_name ?? `Semester #${o.semester_id}`,
                  o.session_name,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>

        {selectedOffering && !loading && !isError && grades.length > 0 && (
          <div className="grid grid-cols-3 gap-3 pt-1">
            <Stat label="Students" value={String(summary.count)} />
            <Stat
              label="Average"
              value={summary.avg !== null ? summary.avg.toFixed(1) : "—"}
            />
            <Stat
              label="Pass rate"
              value={
                summary.passRate !== null
                  ? `${summary.passRate.toFixed(0)}%`
                  : "—"
              }
            />
          </div>
        )}
      </div>

      {!selectedOffering ? (
        <EmptyState
          icon={BookOpen}
          title="No course selected"
          description="Choose a course offering above to load its grade book."
        />
      ) : isError ? (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Couldn&apos;t load grades for this course. Please try again shortly.
        </div>
      ) : (
        <>
          {canExport && grades.length > 0 && (
            <GradesExportToolbar
              grades={grades}
              exporting={exporting}
              onExportCSV={exportCSV}
              onExportExcel={exportExcel}
              onExportPDF={exportPDF}
              totalCount={grades.length}
            />
          )}
          <GradesTable
            grades={grades}
            loading={loading}
            pagination={pagination}
            onPageChange={() => {}}
            onViewGrade={openGradeDetail}
            onViewTranscript={(grade) => openTranscript(grade.studentId)}
            canManage={canManage}
          />
        </>
      )}

      <GradeDetailModal
        open={gradeDetailOpen}
        onClose={closeGradeDetail}
        canManage={canManage}
      />
      <TranscriptModal
        open={transcriptOpen}
        onClose={closeTranscript}
        transcript={transcript ?? null}
        loading={transcriptLoading}
        canManage={canManage}
      />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 px-3 py-2">
      <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold text-foreground">{value}</p>
    </div>
  )
}
