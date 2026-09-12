"use client"

import { UserRole } from "@/config/nav.config"
import RoleGuard from "@/components/dashboard/RoleGuard"

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RoleGuard role={UserRole.STUDENT}>{children}</RoleGuard>
}
