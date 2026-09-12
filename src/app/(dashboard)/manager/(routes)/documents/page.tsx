"use client"

import { motion } from "framer-motion"
import { FileText } from "lucide-react"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { DocumentReviewTable } from "@/modules/document/components/admin/document-review-table"

export default function ManagerDocumentsPage() {
  return (
    <PermissionGate
      require={{ resource: "documents", action: "view" }}
      denyBehavior="screen"
    >
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <FileText size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Document Verification
            </h1>
            <p className="text-xs text-muted-foreground">
              Review, verify, or reject documents students have uploaded.
            </p>
          </div>
        </motion.div>

        <DocumentReviewTable />
      </div>
    </PermissionGate>
  )
}
