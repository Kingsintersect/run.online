import { GradesSectionLayout } from "@/modules/student-grades/_components/results/grades-section-layout"

export default function GradesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <GradesSectionLayout>{children}</GradesSectionLayout>
}
