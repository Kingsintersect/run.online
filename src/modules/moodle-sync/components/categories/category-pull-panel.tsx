"use client"

import { useSyncCategories } from "../../hooks/use-sync-categories"
import { usePullCategories } from "../../hooks/use-sync-mutations"
import { PushPullToolbar } from "../shared/push-pull-toolbar"

function formatLastPulled(categories: { lastSyncAt: string | null }[]): string {
  const timestamps = categories
    .map((c) => c.lastSyncAt)
    .filter((t): t is string => !!t)
  if (timestamps.length === 0) return "Never pulled"
  const latest = timestamps.sort().at(-1)!
  const diffMin = Math.floor((Date.now() - new Date(latest).getTime()) / 60000)
  if (diffMin < 1) return "Last synced just now"
  if (diffMin < 60) return `Last synced ${diffMin}m ago`
  return `Last synced ${Math.floor(diffMin / 60)}h ago`
}

export function CategoryPullPanel() {
  const { data = [] } = useSyncCategories()
  const pullAll = usePullCategories()

  return (
    <PushPullToolbar
      title="Category Hierarchy"
      subtitle={formatLastPulled(data)}
      onPull={() => pullAll.mutate()}
      pullLabel="Pull All from Moodle"
      pullPending={pullAll.isPending}
    />
  )
}
