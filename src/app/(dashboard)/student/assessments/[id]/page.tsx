import type { Metadata } from "next"
import { AssessmentDetailView } from "@/modules/moodle-sync/components/assessments/assessment-detail-view"

interface Props {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: "Assessment Detail",
}

export default async function AssessmentDetailPage({ params }: Props) {
  const { id } = await params
  const numId = parseInt(id, 10)

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AssessmentDetailView
        id={numId}
        backHref="/student/assessments/my-assessments"
      />
    </div>
  )
}
