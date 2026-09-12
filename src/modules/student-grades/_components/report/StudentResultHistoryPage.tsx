"use client"

import { useEffect, useMemo, useState } from "react"
import { Download, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { UNIVERSITY_LOGO_URL, UNIVERSITY_NAME } from "@/config/global.config"
import { useAppStore } from "@/store"
import { useMyStudentId } from "@/hooks/use-my-student-id"
import { useStudentTranscript } from "../../hooks/use-grades-data"
import { generateResultPdf } from "./generateResultPdf"
import {
  AcademicStanding,
  CourseTable,
  GradeDistribution,
  ReportFooter,
  StudentHeader,
  StudentInfo,
} from "./sections"
import {
  buildReportStudentInfo,
  calculateReportSummary,
  formatSemesterLabel,
  toReportCourses,
} from "./utils"

function getCurrentAcademicYearLabel(date = new Date()) {
  const year = date.getFullYear()
  const month = date.getMonth()
  return month >= 8 ? `${year}/${year + 1}` : `${year - 1}/${year}`
}

export default function StudentResultHistoryPage() {
  const user = useAppStore((state) => state.user)
  const { studentId } = useMyStudentId()
  const { transcript, loading } = useStudentTranscript(studentId)
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("")
  const [selectedSemesterId, setSelectedSemesterId] = useState("")
  const [isDownloading, setIsDownloading] = useState(false)
  const currentAcademicYear = useMemo(() => getCurrentAcademicYearLabel(), [])

  const semesterOptions = useMemo(() => {
    if (!transcript) return []

    return Array.from(
      new Map(
        transcript.grades.map((grade) => [
          `${grade.academicYear}::${grade.semesterId}`,
          {
            academicYear: grade.academicYear,
            semesterId: grade.semesterId,
            semesterName: grade.semesterName,
          },
        ])
      ).values()
    )
  }, [transcript]).sort((left, right) => {
    if (left.academicYear === right.academicYear) {
      return left.semesterName.localeCompare(right.semesterName)
    }
    return right.academicYear.localeCompare(left.academicYear)
  })

  const academicYearOptions = useMemo(() => {
    return Array.from(
      new Set([
        currentAcademicYear,
        ...semesterOptions.map((option) => option.academicYear),
      ])
    ).sort((left, right) => right.localeCompare(left))
  }, [currentAcademicYear, semesterOptions])

  const filteredOptions = useMemo(() => {
    if (!selectedAcademicYear) return semesterOptions
    return semesterOptions.filter(
      (option) => option.academicYear === selectedAcademicYear
    )
  }, [semesterOptions, selectedAcademicYear])

  useEffect(() => {
    if (
      !selectedAcademicYear &&
      academicYearOptions.includes(currentAcademicYear)
    ) {
      setSelectedAcademicYear(currentAcademicYear)
    }
  }, [academicYearOptions, currentAcademicYear, selectedAcademicYear])

  const filteredGrades = useMemo(() => {
    if (!transcript) return []
    return transcript.grades.filter((grade) => {
      if (grade.status !== "PUBLISHED") return false
      const matchesYear =
        !selectedAcademicYear || grade.academicYear === selectedAcademicYear
      const matchesSemester =
        !selectedSemesterId || grade.semesterId === selectedSemesterId
      return matchesYear && matchesSemester
    })
  }, [transcript, selectedAcademicYear, selectedSemesterId])

  const reportCourses = useMemo(
    () => toReportCourses(filteredGrades),
    [filteredGrades]
  )
  const authoritativeGpa = useMemo(() => {
    if (!transcript || !selectedSemesterId) return null
    const entry = transcript.cgpaHistory.find(
      (h) => h.semesterId === selectedSemesterId
    )
    return entry?.gpa ?? null
  }, [transcript, selectedSemesterId])
  const reportSummary = useMemo(
    () => calculateReportSummary(reportCourses, authoritativeGpa),
    [reportCourses, authoritativeGpa]
  )
  const studentInfo = useMemo(() => {
    if (!transcript) return null
    return buildReportStudentInfo(transcript, user)
  }, [transcript, user])

  const selectedSemester =
    filteredOptions.find(
      (option) => option.semesterId === selectedSemesterId
    ) ?? null
  const canDownload = Boolean(
    studentInfo &&
    selectedAcademicYear &&
    selectedSemester &&
    reportCourses.length > 0
  )

  async function handleDownload() {
    if (!studentInfo || !selectedSemester || reportCourses.length === 0) return

    try {
      setIsDownloading(true)
      await generateResultPdf({
        institutionName: UNIVERSITY_NAME,
        institutionLogoUrl: UNIVERSITY_LOGO_URL,
        semester: selectedSemester.semesterName,
        academicYear: selectedAcademicYear,
        student: studentInfo,
        courses: reportCourses,
        summary: reportSummary,
      })
    } finally {
      setIsDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-3xl bg-muted/60" />
        <div className="h-24 animate-pulse rounded-3xl bg-muted/40" />
        <div className="h-80 animate-pulse rounded-3xl bg-muted/40" />
      </div>
    )
  }

  if (!transcript || !studentInfo) {
    return null
  }

  return (
    <PermissionGate
      require={{ resource: "my-results", action: "view" }}
      denyBehavior="screen"
    >
      <div className="space-y-6">
        <section className="overflow-hidden rounded-3xl border border-primary/20 bg-linear-to-br from-primary/15 via-background to-amber-500/10 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
                Result History
              </p>
              <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
                Student Grade Report
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Review your published semester results, breakdown by course, and
                export a branded official slip.
              </p>
            </div>

            <Button
              onClick={handleDownload}
              disabled={!canDownload || isDownloading}
              className="gap-2"
            >
              <Download size={16} />
              {isDownloading ? "Preparing PDF..." : "Download Result"}
            </Button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[220px_1fr]">
            <div>
              <p className="mb-2 text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                Academic Year
              </p>
              <Select
                value={selectedAcademicYear}
                onValueChange={(value) => {
                  setSelectedAcademicYear(value)
                  setSelectedSemesterId("")
                }}
              >
                <SelectTrigger className="w-full justify-between bg-background/80">
                  <SelectValue placeholder="Select academic year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYearOptions.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                Semester
              </p>
              <Tabs
                value={selectedSemesterId}
                onValueChange={setSelectedSemesterId}
                className="w-full"
              >
                <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-2xl bg-background/70 p-2">
                  {filteredOptions.length > 0 ? (
                    filteredOptions.map((option) => (
                      <TabsTrigger
                        key={`${option.academicYear}-${option.semesterId}`}
                        value={option.semesterId}
                        className="rounded-xl px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        {formatSemesterLabel(option.semesterName)}
                      </TabsTrigger>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      Select an academic year to see available semesters.
                    </div>
                  )}
                </TabsList>
              </Tabs>
            </div>
          </div>
        </section>

        {(!selectedAcademicYear || !selectedSemesterId) && (
          <div className="flex min-h-72 items-center justify-center rounded-3xl border border-dashed border-border bg-card/70 p-8 text-center text-muted-foreground">
            <div>
              <FileText size={34} className="mx-auto mb-3 opacity-50" />
              <p className="text-base font-medium text-foreground">
                Select an academic year and semester
              </p>
              <p className="mt-2 text-sm">
                Your published results will appear here once both filters are
                set.
              </p>
            </div>
          </div>
        )}

        {selectedAcademicYear &&
          selectedSemesterId &&
          reportCourses.length === 0 && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
              No published results were found for {selectedAcademicYear}{" "}
              {selectedSemester
                ? `(${formatSemesterLabel(selectedSemester.semesterName)})`
                : ""}
              .
            </div>
          )}

        {selectedAcademicYear &&
          selectedSemester &&
          reportCourses.length > 0 && (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-lg">
              <StudentHeader
                institutionName={UNIVERSITY_NAME}
                institutionLogoUrl={UNIVERSITY_LOGO_URL}
                semester={selectedSemester.semesterName}
                academicYear={selectedAcademicYear}
                summary={reportSummary}
              />
              <StudentInfo student={studentInfo} />
              <CourseTable courses={reportCourses} />

              <div className="bg-slate-50 px-6 py-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">
                  Performance Summary
                </h3>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <GradeDistribution summary={reportSummary} />
                  <AcademicStanding summary={reportSummary} />
                </div>
              </div>

              <ReportFooter
                semester={selectedSemester.semesterName}
                academicYear={selectedAcademicYear}
                institutionName={UNIVERSITY_NAME}
              />
            </div>
          )}
      </div>
    </PermissionGate>
  )
}
