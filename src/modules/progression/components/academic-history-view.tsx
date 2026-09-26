"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { BookX, FileText, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NotAvailableNotice } from "@/modules/student-grades/_components/results/not-available-notice"
import {
  useMyOutstandingCourses,
  useMySessionStandings,
} from "../hooks/use-progression"
import { OutstandingCoursesList } from "./outstanding-courses-list"
import { LoadingBlock, QueryError, SectionHeading } from "./standing-states"
import { StandingTimeline } from "./standing-timeline"

// Screen 9 — the student's own academic history: one entry per session from
// `GET /me/session-standings`, each linking to the published results, plus
// the carryovers from `GET /me/outstanding-courses`. Display only.
export function AcademicHistoryView() {
  return (
    <div className="space-y-8">
      <StandingsSection />
      <OutstandingSection />
    </div>
  )
}

function StandingsSection() {
  const query = useMySessionStandings()

  let body: ReactNode
  if (query.isLoading) body = <LoadingBlock rows={3} />
  else if (query.isError)
    body = (
      <QueryError
        message="Couldn't load your academic history."
        onRetry={() => query.refetch()}
      />
    )
  else if (!query.data?.available)
    body = (
      <NotAvailableNotice title="Your academic history isn't available yet">
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <Link href="/student/results">
            <FileText size={13} aria-hidden />
            View your published results
          </Link>
        </Button>
      </NotAvailableNotice>
    )
  else if (query.data.data.length === 0)
    body = (
      <p className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
        No sessions recorded yet. Your history appears here once your first
        session is under way.
      </p>
    )
  else
    body = (
      <StandingTimeline
        standings={query.data.data}
        voice="student"
        renderFooter={(s) => (
          <div className="mt-3">
            {/* Deep-links to the results page filtered to this session. */}
            <Button asChild size="sm" variant="ghost" className="gap-1.5">
              <Link href={`/student/results?session=${s.academic_session.id}`}>
                <FileText size={13} aria-hidden />
                View published results
                <span className="sr-only"> for {s.academic_session.name}</span>
              </Link>
            </Button>
          </div>
        )}
      />
    )

  return (
    <section aria-labelledby="my-standings-heading">
      <SectionHeading
        id="my-standings-heading"
        icon={<History size={15} className="text-primary" aria-hidden />}
      >
        Session by session
      </SectionHeading>
      {body}
    </section>
  )
}

function OutstandingSection() {
  const query = useMyOutstandingCourses()

  let body: ReactNode
  if (query.isLoading) body = <LoadingBlock rows={1} />
  else if (query.isError)
    body = (
      <QueryError
        message="Couldn't load your outstanding courses."
        onRetry={() => query.refetch()}
      />
    )
  else if (!query.data?.available)
    body = (
      <NotAvailableNotice title="Outstanding courses aren't available yet" />
    )
  else
    body = (
      <OutstandingCoursesList
        courses={query.data.data}
        emptyMessage="You have no outstanding courses."
      />
    )

  return (
    <section aria-labelledby="my-outstanding-heading">
      <SectionHeading
        id="my-outstanding-heading"
        icon={<BookX size={15} className="text-primary" aria-hidden />}
      >
        Outstanding courses
      </SectionHeading>
      <p className="-mt-1 mb-3 text-xs text-muted-foreground">
        Courses you still need to pass. They are added to your registration
        automatically each session and can&apos;t be dropped.
      </p>
      {body}
    </section>
  )
}
