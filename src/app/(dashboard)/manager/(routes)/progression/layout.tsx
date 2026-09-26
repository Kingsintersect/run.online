import { ProgressionSectionLayout } from "@/modules/progression/components/progression-section-layout"

export default function ProgressionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ProgressionSectionLayout>{children}</ProgressionSectionLayout>
}
