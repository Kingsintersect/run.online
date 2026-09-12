"use client"

import { useState } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { useCategoriesNeedingMapping } from "../../hooks/use-sync-categories"
import { CategoryResolveDialog } from "./category-resolve-dialog"
import type { CategorySyncResponse } from "../../types"

// Categories pulled from Moodle with no `idnumber` the portal recognizes —
// see api-v2.md §"GET /moodle-sync/categories/needs-mapping". Renders
// nothing when the queue is empty so it doesn't clutter the tab when
// everything's already matched.
export function CategoryNeedsMappingPanel() {
  const { data = [], isLoading } = useCategoriesNeedingMapping()
  const [resolving, setResolving] = useState<CategorySyncResponse | null>(null)

  if (isLoading) {
    return <div className="h-16 animate-pulse rounded-2xl bg-muted/40" />
  }
  if (data.length === 0) return null

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
        <AlertTriangle size={16} />
        {data.length} categor{data.length === 1 ? "y" : "ies"} pulled from
        Moodle need manual mapping
      </div>
      <div className="space-y-2">
        {data.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {cat.moodleCategoryName ??
                  `Moodle category #${cat.moodleCategoryId}`}
              </p>
              {cat.syncError && (
                <p className="truncate text-xs text-muted-foreground">
                  {cat.syncError}
                </p>
              )}
            </div>
            <PermissionGate
              require={{ resource: "moodle-sync", action: "push" }}
            >
              <Button
                size="sm"
                variant="outline"
                onClick={() => setResolving(cat)}
              >
                Resolve
              </Button>
            </PermissionGate>
          </div>
        ))}
      </div>

      <CategoryResolveDialog
        key={resolving?.id}
        category={resolving}
        onClose={() => setResolving(null)}
      />
    </div>
  )
}
