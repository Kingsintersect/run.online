import { AuditUserTrailView } from "../../../_components/AuditUserTrailView";

export const metadata = { title: "User Activity Trail | Admin" };

interface PageProps {
   params: Promise<{ userId: string }>;
}

export default async function UserTrailPage({ params }: PageProps) {
   const { userId } = await params;
   const uid = parseInt(userId, 10);

   return <AuditUserTrailView userId={isNaN(uid) ? 0 : uid} />;
}
