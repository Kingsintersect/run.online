"use client";

import DashboardLayoutTemplate from "@/components/layout/DashboardLayoutTemplate";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <DashboardLayoutTemplate>
            {children}
        </DashboardLayoutTemplate>
    );
}
