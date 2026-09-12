import Image from "next/image"
import {
  Award,
  BarChart3,
  Calendar,
  FileText,
  GraduationCap,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ReportCourse, ReportStudentInfo, ReportSummary } from "./types"
import { formatSemesterLabel } from "./utils"

interface StudentHeaderProps {
  institutionName: string
  institutionLogoUrl: string
  semester: string
  academicYear: string
  summary: ReportSummary
}

export function StudentHeader({
  institutionName,
  institutionLogoUrl,
  semester,
  academicYear,
  summary,
}: StudentHeaderProps) {
  return (
    <div className="rounded-t-3xl bg-[linear-gradient(135deg,#5b1111_0%,#7f1d1d_55%,#111827_100%)] p-6 text-white">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-white p-2 shadow-sm">
            <Image
              src={institutionLogoUrl}
              alt={`${institutionName} logo`}
              width={56}
              height={56}
              unoptimized
              className="h-14 w-14 object-contain"
            />
          </div>
          <div>
            <p className="text-xs tracking-[0.2em] text-white/70 uppercase">
              Official Result Slip
            </p>
            <h1 className="mt-1 text-2xl font-bold">Student Grade Report</h1>
            <p className="mt-1 text-sm text-white/80">
              {formatSemesterLabel(semester)} · {academicYear}
            </p>
            <p className="text-xs text-white/60">
              {institutionName} 5.00 grading system
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white/10 p-4 text-right backdrop-blur-sm">
          <p className="text-xs tracking-[0.16em] text-white/65 uppercase">
            Current GPA
          </p>
          <p className="mt-1 text-3xl font-bold text-amber-300">
            {summary.gpa.toFixed(2)}
          </p>
          <p className="text-sm font-medium text-emerald-200">
            {summary.degreeClass}
          </p>
          <div className="mt-3 space-y-1 text-xs text-white/75">
            <p>Total Credits (TCU): {summary.totalCredits}</p>
            <p>
              Total Quality Points (TQP):{" "}
              {summary.totalQualityPoints.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function StudentInfo({ student }: { student: ReportStudentInfo }) {
  const initials = student.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")

  return (
    <div className="border-b border-slate-200 px-6 py-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        <div className="flex w-full flex-col items-center gap-3 md:w-52">
          {student.avatarUrl ? (
            <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-slate-200 shadow-sm">
              <Image
                src={student.avatarUrl}
                alt={student.fullName}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-slate-200 bg-slate-100 text-2xl font-bold text-slate-600 shadow-sm">
              {initials || "ST"}
            </div>
          )}
          <h2 className="text-center text-lg font-bold tracking-wide text-[#750303] uppercase">
            {student.fullName}
          </h2>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoItem label="Reg Number" value={student.regNumber} />
          <InfoItem label="Program" value={student.program} />
          <InfoItem label="Email" value={student.email} />
          <InfoItem label="Level" value={student.level} />
          <InfoItem label="Department" value={student.department} />
        </div>
      </div>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-bold text-teal-700">{label}:</p>
      <p className="text-sm text-slate-700">{value}</p>
    </div>
  )
}

export function CourseTable({ courses }: { courses: ReportCourse[] }) {
  return (
    <div className="px-6 py-6">
      <div className="mb-4 flex items-center gap-2">
        <GraduationCap className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-slate-900">
          Course Performance Details
        </h3>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {[
                "Course Code",
                "Course Name",
                "Credit Units (CU)",
                "Score (%)",
                "Grade",
                "Grade Points (GP)",
                "Quality Points (QP)",
              ].map((heading) => (
                <th
                  key={heading}
                  className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {courses.map((course) => (
              <tr
                key={course.id}
                className="transition-colors hover:bg-slate-50"
              >
                <td className="px-4 py-4 font-semibold text-slate-900">
                  {course.courseCode}
                </td>
                <td className="px-4 py-4 text-slate-900">
                  {course.courseTitle}
                </td>
                <td className="px-4 py-4 text-center font-medium text-slate-900">
                  {course.creditLoad}
                </td>
                <td className="px-4 py-4 text-center font-medium text-slate-900">
                  {course.score.toFixed(0)}%
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="inline-flex rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-900">
                    {course.grade}
                  </span>
                </td>
                <td className="px-4 py-4 text-center font-medium text-slate-900">
                  {course.gradePoint.toFixed(2)}
                </td>
                <td className="px-4 py-4 text-center font-semibold text-blue-600">
                  {course.qualityPoints.toFixed(2)}
                </td>
              </tr>
            ))}
            <tr className="bg-blue-50 font-semibold">
              <td colSpan={2} className="px-4 py-4 text-right text-slate-900">
                <div className="flex items-center justify-end gap-2">
                  <Award className="h-4 w-4" />
                  <span>Totals:</span>
                </div>
              </td>
              <td className="px-4 py-4 text-center text-blue-700">
                {courses.reduce((sum, course) => sum + course.creditLoad, 0)}
              </td>
              <td className="px-4 py-4 text-center text-slate-400">-</td>
              <td className="px-4 py-4 text-center text-slate-400">-</td>
              <td className="px-4 py-4 text-center text-slate-400">-</td>
              <td className="px-4 py-4 text-center text-blue-700">
                {courses
                  .reduce((sum, course) => sum + course.qualityPoints, 0)
                  .toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm text-slate-600">
        <p>
          <strong>Formula:</strong> GPA = Total Quality Points (TQP) / Total
          Credit Units (TCU)
        </p>
        <p className="mt-1">
          <strong>Quality Points:</strong> Grade Point × Credit Units for each
          course.
        </p>
      </div>
    </div>
  )
}

export function GradeDistribution({ summary }: { summary: ReportSummary }) {
  const maxCount = Math.max(
    ...summary.gradeDistribution.map((item) => item.count),
    1
  )

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-blue-600" />
        <h4 className="font-semibold text-slate-800">
          Grade Distribution Analysis
        </h4>
      </div>

      <div className="space-y-3">
        {summary.gradeDistribution.map((item) => (
          <div key={item.grade} className="flex items-center gap-3">
            <div className="w-8 text-center font-bold text-slate-700">
              {item.grade}
            </div>
            <div className="flex-1">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm text-slate-600">{item.label}</span>
                <span className={cn("text-sm font-medium", item.textClass)}>
                  {item.count} ({item.percentage}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200">
                <div
                  className={cn(
                    "h-2 rounded-full transition-all duration-500",
                    item.colorClass
                  )}
                  style={{ width: `${(item.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-slate-200 pt-4 text-sm text-slate-600">
        <div className="flex justify-between">
          <span>Total Courses:</span>
          <span className="font-medium text-slate-900">
            {summary.gradeDistribution.reduce(
              (sum, item) => sum + item.count,
              0
            )}
          </span>
        </div>
      </div>
    </div>
  )
}

export function AcademicStanding({ summary }: { summary: ReportSummary }) {
  const progressPercentage = Math.min((summary.gpa / 5) * 100, 100)
  const nextTarget = getNextTarget(summary.gpa)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Award className="h-5 w-5 text-amber-600" />
        <h4 className="font-semibold text-slate-800">Academic Performance</h4>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl bg-slate-50 p-4 text-center">
          <div className="text-3xl font-bold text-slate-800">
            {summary.gpa.toFixed(2)}
          </div>
          <div className="text-sm text-slate-600">Current GPA</div>
          <div
            className={cn(
              "mt-2 inline-flex rounded-full px-3 py-1 text-sm font-medium",
              summary.academicStanding.color,
              summary.academicStanding.bgColor.replace("bg-", "bg-") + "/15"
            )}
          >
            {summary.degreeClass}
          </div>
        </div>

        <div>
          <div className="mb-2 flex justify-between text-sm text-slate-600">
            <span>Progress on 5.00 Scale</span>
            <span>{progressPercentage.toFixed(1)}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-slate-200">
            <div
              className={cn(
                "h-3 rounded-full",
                summary.academicStanding.bgColor
              )}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-slate-500">
            <span>0.00</span>
            <span>2.50</span>
            <span>5.00</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
          <ScaleLine
            left="4.50-5.00"
            right="First Class"
            color="text-emerald-600"
          />
          <ScaleLine
            left="1.50-2.39"
            right="Third Class"
            color="text-amber-600"
          />
          <ScaleLine
            left="3.50-4.49"
            right="2nd Class Upper"
            color="text-blue-600"
          />
          <ScaleLine left="1.00-1.49" right="Pass" color="text-slate-600" />
          <ScaleLine
            left="2.40-3.49"
            right="2nd Class Lower"
            color="text-violet-600"
          />
          <ScaleLine left="Below 1.00" right="Fail" color="text-red-600" />
        </div>

        {nextTarget && (
          <div className="rounded-2xl bg-blue-50 p-3">
            <div className="mb-1 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Next Target
              </span>
            </div>
            <div className="text-sm text-blue-700">
              Achieve <strong>{nextTarget.target.toFixed(2)} GPA</strong> for{" "}
              <strong>{nextTarget.label}</strong>
            </div>
            <div className="mt-1 text-xs text-blue-600">
              Gap: {(nextTarget.target - summary.gpa).toFixed(2)} points
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ScaleLine({
  left,
  right,
  color,
}: {
  left: string
  right: string
  color: string
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className={color}>{left}:</span>
      <span>{right}</span>
    </div>
  )
}

function getNextTarget(gpa: number) {
  if (gpa < 1.0) return { target: 1.0, label: "Pass" }
  if (gpa < 1.5) return { target: 1.5, label: "Third Class" }
  if (gpa < 2.4) return { target: 2.4, label: "Second Class Lower" }
  if (gpa < 3.5) return { target: 3.5, label: "Second Class Upper" }
  if (gpa < 4.5) return { target: 4.5, label: "First Class" }
  if (gpa < 5.0) return { target: 5.0, label: "Perfect Score" }
  return null
}

export function ReportFooter({
  semester,
  academicYear,
  institutionName,
}: {
  semester: string
  academicYear: string
  institutionName: string
}) {
  return (
    <div className="rounded-b-3xl border-t border-slate-200 bg-slate-100 px-6 py-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-3 flex items-center justify-center gap-2">
          <FileText className="h-4 w-4 text-slate-500" />
          <h4 className="text-sm font-medium text-slate-700">
            Official Grade Report
          </h4>
        </div>

        <div className="space-y-2 text-center">
          <p className="text-sm text-slate-600">
            This is an official academic transcript for{" "}
            <strong>{formatSemesterLabel(semester)}</strong> of the{" "}
            <strong>{academicYear}</strong> academic session at{" "}
            <strong>{institutionName}</strong>.
          </p>
          <p className="text-sm text-slate-600">
            Computed using the Nigerian University 5.00 Grade Point System.
          </p>

          <div className="mt-4 flex items-center justify-center gap-4 border-t border-slate-300 pt-3 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>
                Generated:{" "}
                {new Date().toLocaleDateString("en-NG", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
            <span>•</span>
            <span>System: 5.00 Scale</span>
            <span>•</span>
            <span>Official Document</span>
          </div>
        </div>
      </div>
    </div>
  )
}
