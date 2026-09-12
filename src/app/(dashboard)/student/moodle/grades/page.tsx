"use client"

import { MyGradesWidget } from "@/modules/moodle-sync/components/grades/my-grades-widget"

export default function StudentMoodleGradesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">My Moodle Grades</h1>
        <p className="text-xs text-muted-foreground">
          Activity grades from your Moodle courses.
        </p>
      </div>
      <MyGradesWidget />
    </div>
  )
}
