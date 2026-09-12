import type { Metadata } from "next";

export const metadata: Metadata = {
    title: {
        template: "%s | Audit Centre",
        default: "Audit Centre",
    },
    description: "System audit logs, activity trails and analytics for QHUB University Portal.",
};

export default function AuditLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
