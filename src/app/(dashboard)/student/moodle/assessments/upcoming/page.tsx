"use client"

import { UpcomingAssessmentsWidget } from "@/modules/moodle-sync/components/assessments/upcoming-assessments-widget"

export default function StudentMoodleUpcomingAssessmentsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">
          Upcoming Moodle Deadlines
        </h1>
        <p className="text-xs text-muted-foreground">
          Assignments, quizzes, and forum deadlines from your Moodle courses.
        </p>
      </div>
      <UpcomingAssessmentsWidget />
    </div>
  )
}
