import { AuditEntityTrailView } from "../../../../_components/AuditEntityTrailView";

export const metadata = { title: "Entity History | Admin" };

interface PageProps {
   params: Promise<{ type: string; id: string }>;
}

export default async function EntityTrailPage({ params }: PageProps) {
   const { type, id } = await params;
   const entityId = parseInt(id, 10);

   return (
      <AuditEntityTrailView
         entityType={type}
         entityId={isNaN(entityId) ? 0 : entityId}
      />
   );
}
