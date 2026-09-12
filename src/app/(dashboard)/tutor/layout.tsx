"use client";

import { UserRole } from "@/config/nav.config";
import RoleGuard from "@/components/dashboard/RoleGuard";

export default function TutorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <RoleGuard role={[UserRole.TUTOR, UserRole.HOD]}>{children}</RoleGuard>;
}
