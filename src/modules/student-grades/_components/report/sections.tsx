import Image from "next/image"
import {
  Award,
  BarChart3,
  Calendar,
  FileText,
  GraduationCap,
} from "lucide-react"
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
              Result slip · student copy
            </p>
            <h1 className="mt-1 text-2xl font-bold">Student Grade Report</h1>
            <p className="mt-1 text-sm text-white/80">
              {formatSemesterLabel(semester)} · {academicYear}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white/10 p-4 text-right backdrop-blur-sm">
          <p className="text-xs tracking-[0.16em] text-white/65 uppercase">
            Semester GPA
          </p>
          <p className="mt-1 text-3xl font-bold text-amber-300">
            {fmtPoint(summary.gpa)}
          </p>
          <p className="text-sm font-medium text-emerald-200">
            CGPA {fmtPoint(summary.cgpa)}
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
          <strong>Quality Points:</strong> Grade Point × Credit Units for each
          course. GPA and CGPA are the registry&apos;s computed figures.
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
              <div className="mb-1 flex items-center justify-end">
                <span className="text-sm font-medium text-slate-700">
                  {item.count} ({item.percentage}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200">
                <div
                  className="h-2 rounded-full bg-blue-600 transition-all duration-500"
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

/** "3.45", or "Not computed yet" while the backend hasn't computed it. */
function fmtPoint(value: number | null) {
  return value == null ? "Not computed yet" : value.toFixed(2)
}

export function AcademicStanding({ summary }: { summary: ReportSummary }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Award className="h-5 w-5 text-amber-600" />
        <h4 className="font-semibold text-slate-800">Academic Performance</h4>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Figure label="Semester GPA" value={fmtPoint(summary.gpa)} />
        <Figure label="CGPA" value={fmtPoint(summary.cgpa)} />
        <Figure label="Credit units" value={String(summary.totalCredits)} />
        <Figure
          label="Quality points"
          value={summary.totalQualityPoints.toFixed(2)}
        />
      </div>
      <p className="mt-4 text-xs text-slate-500">
        GPA and CGPA are the registry&apos;s computed figures. Class of degree
        appears on your official result statement.
      </p>
    </div>
  )
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 text-center">
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      <div className="text-xs text-slate-600">{label}</div>
    </div>
  )
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
            Result slip · student copy
          </h4>
        </div>

        <div className="space-y-2 text-center">
          <p className="text-sm text-slate-600">
            Published results for{" "}
            <strong>{formatSemesterLabel(semester)}</strong> of the{" "}
            <strong>{academicYear}</strong> academic session at{" "}
            <strong>{institutionName}</strong>.
          </p>
          <p className="text-sm text-slate-600">
            This is not an official transcript. Request an official transcript
            or result statement from the registry.
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
            <span>Student copy</span>
          </div>
        </div>
      </div>
    </div>
  )
}
