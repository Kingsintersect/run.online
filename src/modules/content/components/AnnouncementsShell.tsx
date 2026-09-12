"use client"

import { PermissionGate } from "@/lib/permissions/PermissionGate"
import DataTable, { type Column } from "@/components/custom/DataTable"
import StatusBadge from "@/components/custom/StatusBadge"
import Tabs from "@/components/custom/Tabs"
import { usePublishedAnnouncements } from "../hooks/use-announcements"
import AnnouncementList from "./AnnouncementList"
import type { Announcement, Priority } from "../types"

const priorityVariant: Record<
  Priority,
  "destructive" | "orange" | "info" | "default"
> = {
  urgent: "destructive",
  high: "orange",
  normal: "info",
  low: "default",
}

export function AnnouncementsShell() {
  return (
    <PermissionGate
      require={{ resource: "announcements", action: "view" }}
      denyBehavior="screen"
    >
      <div className="mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Tabs
          tabs={[
            { key: "all", label: "All" },
            { key: "published", label: "Published (public view)" },
          ]}
        >
          {(active) =>
            active === "all" ? <AnnouncementList /> : <PublishedPreview />
          }
        </Tabs>
      </div>
    </PermissionGate>
  )
}

// Read-only preview of exactly what the public GET /content/announcements
// endpoint returns — useful for confirming what's actually live.
function PublishedPreview() {
  const { data, isLoading } = usePublishedAnnouncements()

  const columns: Column<Announcement & Record<string, unknown>>[] = [
    {
      key: "title",
      header: "Announcement",
      sortable: true,
      width: "36%",
      render: (row) => (
        <div>
          <p className="max-w-xs truncate text-sm font-medium text-foreground">
            {row.title}
          </p>
          <p className="max-w-xs truncate text-xs text-muted-foreground">
            {row.content}
          </p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      render: (row) => <StatusBadge label={row.category} variant="purple" />,
    },
    {
      key: "priority",
      header: "Priority",
      align: "center",
      sortable: true,
      render: (row) => (
        <StatusBadge
          label={row.priority}
          variant={priorityVariant[row.priority]}
          dot
        />
      ),
    },
    {
      key: "publishedAt",
      header: "Published",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.publishedAt
            ? new Date(row.publishedAt).toLocaleDateString()
            : "—"}
        </span>
      ),
    },
  ]

  return (
    <DataTable
      data={(data?.data ?? []) as (Announcement & Record<string, unknown>)[]}
      columns={columns}
      loading={isLoading}
      searchPlaceholder="Search published announcements…"
      searchExtractor={(row) => `${row.title} ${row.content} ${row.category}`}
      rowKey="id"
      pageSize={10}
      emptyMessage="Nothing published yet"
    />
  )
}
