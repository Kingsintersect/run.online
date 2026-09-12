"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronRight,
  Loader2,
  UploadCloud,
  Building2,
  GraduationCap,
  Layers,
  CalendarDays,
  Network,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import EmptyState from "@/components/custom/EmptyState"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { useSyncCategories } from "../../hooks/use-sync-categories"
import { usePushCategory, usePushSubtree } from "../../hooks/use-sync-mutations"
import { useMoodleSyncUiStore } from "../../store/moodle-sync-ui.store"
import { SyncStatusBadge } from "../shared/sync-status-badge"
import { SyncDirectionBadge } from "../shared/sync-direction-badge"
import type { CategorySyncResponse } from "../../types"

// Known seeded type codes get a dedicated icon; any other code (a custom
// type an admin added, e.g. "COHORT") falls back to a generic icon — the
// tree no longer needs to know about a fixed set of entity types. See
// sandbox/schema-moodel-sync-refactor/api-v2.md §"Moodle Category Sync".
const TYPE_ICON: Record<string, LucideIcon> = {
  FACULTY: Building2,
  DEPARTMENT: Building2,
  SCHOOL: Building2,
  PROGRAM: GraduationCap,
  LEVEL: Layers,
  SEMESTER: CalendarDays,
  TERM: CalendarDays,
}

function buildTree(items: CategorySyncResponse[]) {
  const byParent = new Map<number | null, CategorySyncResponse[]>()
  for (const item of items) {
    const list = byParent.get(item.parentId) ?? []
    list.push(item)
    byParent.set(item.parentId, list)
  }
  return byParent
}

interface TreeNodeProps {
  node: CategorySyncResponse
  depth: number
  byParent: Map<number | null, CategorySyncResponse[]>
}

function TreeNode({ node, depth, byParent }: TreeNodeProps) {
  const children = byParent.get(node.academicUnitId) ?? []
  const expanded = useMoodleSyncUiStore((s) =>
    s.expandedCategoryIds.has(node.academicUnitId)
  )
  const toggleExpanded = useMoodleSyncUiStore((s) => s.toggleCategoryExpanded)
  const pushCategory = usePushCategory()
  const pushSubtree = usePushSubtree()
  const Icon = TYPE_ICON[node.unitTypeCode] ?? Network
  const hasChildren = children.length > 0

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-xl px-2 py-2 transition-colors hover:bg-muted/40"
        style={{ paddingLeft: depth * 20 + 8 }}
      >
        <button
          type="button"
          onClick={() => hasChildren && toggleExpanded(node.academicUnitId)}
          className={cn(
            "shrink-0 text-muted-foreground",
            !hasChildren && "opacity-0"
          )}
        >
          <ChevronRight
            size={14}
            className={cn("transition-transform", expanded && "rotate-90")}
          />
        </button>

        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon size={13} />
        </div>

        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {node.unitName}
        </span>
        <span className="hidden shrink-0 text-[11px] text-muted-foreground capitalize sm:inline">
          {node.unitTypeCode.toLowerCase()}
        </span>

        <SyncDirectionBadge
          direction={node.syncDirection}
          className="hidden sm:inline-flex"
        />
        <SyncStatusBadge status={node.syncStatus} />

        <div className="flex shrink-0 items-center gap-1">
          {hasChildren && (
            <PermissionGate
              require={{ resource: "moodle-sync", action: "push" }}
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                disabled={pushSubtree.isPending}
                onClick={() => pushSubtree.mutate(node.academicUnitId)}
                title="Push this node and its whole subtree"
              >
                {pushSubtree.isPending ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  "Push Subtree"
                )}
              </Button>
            </PermissionGate>
          )}
          {node.syncStatus !== "SYNCED" && (
            <PermissionGate
              require={{ resource: "moodle-sync", action: "push" }}
            >
              <Button
                variant="outline"
                size="icon-sm"
                disabled={pushCategory.isPending}
                onClick={() =>
                  pushCategory.mutate({
                    academicUnitId: node.academicUnitId,
                    parentMoodleCategoryId:
                      node.parentMoodleCategoryId ?? undefined,
                  })
                }
                title="Push this node"
              >
                {pushCategory.isPending ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <UploadCloud size={12} />
                )}
              </Button>
            </PermissionGate>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                byParent={byParent}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function CategoryTree() {
  const { data = [], isLoading, isError } = useSyncCategories()

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-11 animate-pulse rounded-xl bg-muted/40" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <EmptyState
        title="Couldn't load the category hierarchy"
        description="Please try again."
      />
    )
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No categories yet"
        description="Nothing has been pushed to or pulled from Moodle."
      />
    )
  }

  const byParent = buildTree(data)
  const roots = byParent.get(null) ?? []

  return (
    <div className="rounded-2xl border border-border bg-card p-2">
      {roots.map((root) => (
        <TreeNode key={root.id} node={root} depth={0} byParent={byParent} />
      ))}
    </div>
  )
}
