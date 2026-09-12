"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, Building2 } from "lucide-react"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { CategoryTree } from "@/modules/moodle-sync/components/categories/category-tree"
import { CategoryPullPanel } from "@/modules/moodle-sync/components/categories/category-pull-panel"
import { CategoryPushDialog } from "@/modules/moodle-sync/components/categories/category-push-dialog"
import { CategoryNeedsMappingPanel } from "@/modules/moodle-sync/components/categories/category-needs-mapping-panel"

export default function MoodleSyncCategoriesPage() {
  return (
    <PermissionGate
      require={{ resource: "moodle-sync", action: "view" }}
      denyBehavior="screen"
    >
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <Link
            href="/admin/moodle-sync"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={13} /> Back to Moodle Sync
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                <Building2 size={18} className="text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Category Hierarchy
                </h1>
                <p className="text-xs text-muted-foreground">
                  Your Academic Structure tree, mapped to Moodle categories —
                  any shape, any depth.
                </p>
              </div>
            </div>
            <CategoryPushDialog />
          </div>
        </motion.div>

        <CategoryPullPanel />
        <CategoryNeedsMappingPanel />
        <CategoryTree />
      </div>
    </PermissionGate>
  )
}
