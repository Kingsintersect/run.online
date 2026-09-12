import RoleGuard from "@/components/dashboard/RoleGuard";
import { SITE_NAME } from "@/config/global.config";
import { UserRole } from "@/config/nav.config";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: `${SITE_NAME}`,
    description: "Director Dashboard - View all accademic and financial reports, manage scholars, and oversee university operations.",
};

const layout = async ({ children }: { children: React.ReactNode }) => {

    return (
       <RoleGuard role={[UserRole.SUPER_ADMIN, UserRole.DIRECTOR]}>
            {children}
       </RoleGuard>
    )
}

export default layout
