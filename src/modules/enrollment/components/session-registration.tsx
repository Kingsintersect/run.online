"use client"

import type { ReactNode } from "react"
import { AlertTriangle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMyStudentId } from "@/hooks/use-my-student-id"
import { useRegistrationContext } from "../hooks/use-registration-context"
import { CourseRegistration } from "./course-registration"
import { RegistrationCourseSelection } from "./registration-course-selection"
import { RegistrationDebtGate } from "./registration-debt-gate"
import { RegistrationSlipCard } from "./registration-slip-card"
import { RegistrationStandingCard } from "./registration-standing-card"

function FallbackNotice({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="flex gap-2 rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-xs text-muted-foreground"
    >
      <Info size={14} className="mt-0.5 shrink-0 text-primary" aria-hidden />
      <span>{children}</span>
    </div>
  )
}

// Session registration, built from `GET /me/registration-context`: standing
// card → debt gate → course selection → submit. While that endpoint isn't
// live (CLAUDE.md §14 fallback), the existing offerings-based registration
// keeps working underneath an honest notice — one component either way.
export function SessionRegistration() {
  const {
    studentId,
    isError: studentErrored,
    notFound: studentMissing,
    refetch: retryStudent,
  } = useMyStudentId()
  const query = useRegistrationContext()

  // Registration is meaningless without the student's own record, so a
  // failed `GET /users/students/me` ends here — before any branch below
  // mounts CourseRegistration (which subscribes to the same lookup).
  if (studentErrored) {
    return studentMissing ? (
      <div
        role="status"
        className="rounded-2xl border border-dashed border-border p-8 text-center"
      >
        <p className="text-sm font-semibold text-foreground">
          Your student record isn&apos;t set up yet
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Course registration opens once the registry has created your student
          record. Contact the registry if you&apos;ve already been admitted.
        </p>
      </div>
    ) : (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-xs text-destructive"
      >
        <span className="flex items-center gap-2">
          <AlertTriangle size={14} aria-hidden />
          Couldn&apos;t load your student record, so registration can&apos;t be
          shown.
        </span>
        <Button size="sm" variant="outline" onClick={() => retryStudent()}>
          Try again
        </Button>
      </div>
    )
  }

  if (query.isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading">
        <div className="h-36 animate-pulse rounded-3xl bg-muted" />
        <div className="h-64 animate-pulse rounded-3xl bg-muted" />
      </div>
    )
  }

  if (query.isError) {
    return (
      <div className="space-y-6">
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-xs text-destructive"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle size={14} aria-hidden />
            Couldn&apos;t load your session registration details. You can still
            register from the course list below.
          </span>
          <Button size="sm" variant="outline" onClick={() => query.refetch()}>
            Try again
          </Button>
        </div>
        <CourseRegistration />
      </div>
    )
  }

  if (query.noSemester) {
    return (
      <div className="space-y-6">
        <FallbackNotice>
          No semester is active for your programme right now, so there&apos;s no
          session registration to show. Any open course offerings are listed
          below.
        </FallbackNotice>
        <CourseRegistration />
      </div>
    )
  }

  if (!query.data?.available) {
    return (
      <div className="space-y-6">
        <FallbackNotice>
          Your session standing, carryover courses and credit-load limits
          aren&apos;t available from the server yet. Until they are, register
          from the open course offerings below — the registry still checks your
          fees, prerequisites and credit load when you enroll.
        </FallbackNotice>
        <CourseRegistration />
      </div>
    )
  }

  const context = query.data.data
  return (
    <div className="space-y-6">
      <RegistrationStandingCard context={context} />
      <RegistrationDebtGate context={context} />
      <RegistrationSlipCard context={context} />
      <RegistrationCourseSelection
        key={context.semester.id}
        context={context}
        studentId={studentId}
      />
    </div>
  )
}
