"use client"

import { useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import gsap from "gsap"
import {
  Send,
  RotateCcw,
  CheckCircle2,
  Users,
  BookOpen,
  AlertCircle,
  Info,
  Banknote,
} from "lucide-react"
import { SelectionWizard } from "../publish/selection-wizard"
import { PublishResultsTable } from "../publish/publish-results-table"
import { PublishConfirmModal } from "../publish/publish-confirm-modal"
import {
  ACADEMIC_YEARS,
  SEMESTERS,
  PROGRAMS,
  useCourseOptions,
  usePublishPreview,
  usePublishAction,
} from "../../hooks/use-publish-data"
import { usePublishStore } from "../../store/publishStore"
import { COURSES } from "../../services/grades.service"

// ─── Summary stat pill ────────────────────────────────────────────────────────

function SummaryPill({
  label,
  value,
  colour,
}: {
  label: string
  value: string | number
  colour: string
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${colour}`}
    >
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  )
}

interface PublishResultsPageProps {
  canPublish?: boolean
  canManage?: boolean
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PublishResultsPage({
  canPublish = false,
  canManage = false,
}: PublishResultsPageProps) {
  const headerRef = useRef<HTMLDivElement>(null)

  const {
    filters,
    loadedGrades,
    gradesLoaded,
    confirmOpen,
    setFilter,
    resetFilters,
    openConfirm,
    closeConfirm,
  } = usePublishStore()

  const { courses, loading: coursesLoading } = useCourseOptions(
    filters.programId
  )
  const {
    isComplete,
    loading: loadingGrades,
    error,
    load,
  } = usePublishPreview()
  const { publish, publishing } = usePublishAction()

  useEffect(() => {
    if (!headerRef.current) return
    gsap.from(headerRef.current, { y: -16, duration: 0.5, ease: "power3.out" })
  }, [])

  const handleLoad = () => {
    if (isComplete) void load(filters)
  }

  // Derive display labels for confirmation modal
  const selectedAY = ACADEMIC_YEARS.find((y) => y.id === filters.academicYearId)
  const selectedSem = SEMESTERS.find((s) => s.id === filters.semesterId)
  const selectedCourse = COURSES.find((c) => c.id === filters.courseId)
  const semesterNumericId = filters.semesterId
    ? Number(filters.semesterId.replace(/\D/g, ""))
    : null

  // Stats for result header
  const publishedCount = loadedGrades.filter(
    (g) => g.status === "PUBLISHED"
  ).length
  const approvedCount = loadedGrades.filter(
    (g) => g.status === "APPROVED"
  ).length
  const pendingCount = loadedGrades.filter(
    (g) => g.status === "SUBMITTED" || g.status === "DRAFT"
  ).length
  const feeWithheldCount = loadedGrades.filter(
    (g) => g.hasOutstandingFees && g.status !== "PUBLISHED"
  ).length

  const handleConfirmPublish = async () => {
    if (!semesterNumericId) return
    await publish(semesterNumericId)
    await load(filters)
  }

  // If user doesn't have publish permission, show nothing
  if (!canPublish && !canManage) return null

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div
        ref={headerRef}
        className="rounded-2xl border border-border bg-card px-5 py-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Send className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Publish Results
              </h2>
              <p className="text-xs text-muted-foreground">
                Select a course and publish student results to the portal
              </p>
            </div>
          </div>
          {gradesLoaded && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              Start Over
            </button>
          )}
        </div>
      </div>

      {/* Selection wizard */}
      <SelectionWizard
        academicYears={ACADEMIC_YEARS}
        semesters={SEMESTERS}
        programs={PROGRAMS}
        courses={courses}
        coursesLoading={coursesLoading}
        selectedAY={filters.academicYearId}
        selectedSem={filters.semesterId}
        selectedProgram={filters.programId}
        selectedCourse={filters.courseId}
        onAYChange={(v) => setFilter({ academicYearId: v })}
        onSemChange={(v) => setFilter({ semesterId: v })}
        onProgramChange={(v) => setFilter({ programId: v })}
        onCourseChange={(v) => setFilter({ courseId: Number(v) })}
        onLoad={handleLoad}
        loading={loadingGrades}
        isComplete={isComplete}
      />

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Fee withholding notice */}
      {gradesLoaded && feeWithheldCount > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs dark:border-amber-800/40 dark:bg-amber-950/20">
          <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-semibold text-amber-700 dark:text-amber-400">
              {feeWithheldCount} result{feeWithheldCount !== 1 ? "s" : ""}{" "}
              withheld due to outstanding fees
            </p>
            <p className="mt-0.5 text-amber-600 dark:text-amber-500">
              These students cannot have their results published until their fee
              balance is cleared.
            </p>
          </div>
        </div>
      )}

      {/* Results panel */}
      <AnimatePresence>
        {gradesLoaded && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="space-y-3"
          >
            {/* Results summary header */}
            <div className="rounded-2xl border border-border bg-card px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <p className="text-sm font-bold text-foreground">
                      {selectedCourse
                        ? `${selectedCourse.code} — ${selectedCourse.name}`
                        : "Course Results"}
                    </p>
                  </div>
                  <p className="ml-6 text-xs text-muted-foreground">
                    {selectedSem?.label} · {selectedAY?.label}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <SummaryPill
                      label="Total"
                      value={loadedGrades.length}
                      colour="border-border"
                    />
                    <SummaryPill
                      label="Published"
                      value={publishedCount}
                      colour="border-emerald-200 dark:border-emerald-900/50"
                    />
                    <SummaryPill
                      label="Approved"
                      value={approvedCount}
                      colour="border-blue-200 dark:border-blue-900/50"
                    />
                    <SummaryPill
                      label="Pending"
                      value={pendingCount}
                      colour="border-amber-200 dark:border-amber-900/50"
                    />
                    {feeWithheldCount > 0 && (
                      <SummaryPill
                        label="Fee Hold"
                        value={feeWithheldCount}
                        colour="border-orange-200 dark:border-orange-900/50 text-orange-700 dark:text-orange-400"
                      />
                    )}
                  </div>
                </div>

                {/* Publish action area - only show if user can publish */}
                {canPublish && (
                  <div className="flex flex-col items-end gap-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={openConfirm}
                      disabled={approvedCount === 0}
                      className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Publish Semester Results
                    </motion.button>
                    {approvedCount > 0 && (
                      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Info className="h-3 w-3" />
                        Publishes every approved grade in this semester, not
                        just this course
                      </p>
                    )}
                    {approvedCount === 0 && pendingCount > 0 && (
                      <p className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                        <AlertCircle className="h-3 w-3" />
                        No approved grades to publish
                      </p>
                    )}
                    {loadedGrades.length > 0 &&
                      publishedCount === loadedGrades.length && (
                        <p className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          All results already published
                        </p>
                      )}
                  </div>
                )}
              </div>
            </div>

            {/* Quick stats chips */}
            {loadedGrades.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>
                    {loadedGrades.length} student
                    {loadedGrades.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            )}

            {/* Table */}
            <PublishResultsTable
              grades={loadedGrades}
              canPublish={canPublish}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state before selection */}
      {!gradesLoaded && !loadingGrades && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60">
            <Send className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="mb-1 text-sm font-medium text-foreground">
            No results loaded
          </p>
          <p className="max-w-72 text-xs text-muted-foreground">
            Use the selector above to pick an academic year, semester, program
            and course, then click <strong>Load Results</strong>.
          </p>
        </div>
      )}

      {/* Confirm modal */}
      {selectedCourse && selectedSem && selectedAY && (
        <PublishConfirmModal
          open={confirmOpen}
          onClose={closeConfirm}
          previewGrades={loadedGrades}
          onConfirm={handleConfirmPublish}
          publishing={publishing}
          courseName={selectedCourse.name}
          courseCode={selectedCourse.code}
          semesterLabel={selectedSem.label}
          academicYear={selectedAY.label}
          withheldCount={feeWithheldCount}
        />
      )}
    </div>
  )
}
