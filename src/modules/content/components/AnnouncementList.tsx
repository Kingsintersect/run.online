"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import gsap from "gsap"
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  Send,
  EyeOff,
  Megaphone,
  FileText,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import DataTable, { type Column } from "@/components/custom/DataTable"
import StatusBadge from "@/components/custom/StatusBadge"
import Modal from "@/components/custom/Modal"
import { usePermissions } from "@/lib/permissions/usePermissions"
import { useAllAnnouncements } from "../hooks/use-announcements"
import {
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
  usePublishAnnouncement,
  useUnpublishAnnouncement,
} from "../hooks/use-announcement-mutations"
import AnnouncementFormModal from "./AnnouncementFormModal"
import type { Announcement, Priority } from "../types"
import type { CreateAnnouncementValues } from "../schemas"

const PRIORITY_WEIGHT: Record<Priority, number> = {
  urgent: 3,
  high: 2,
  normal: 1,
  low: 0,
}

const priorityVariant: Record<
  Priority,
  "destructive" | "orange" | "info" | "default"
> = {
  urgent: "destructive",
  high: "orange",
  normal: "info",
  low: "default",
}

// The backend doesn't order by priority (only publishedAt) — compensate
// client-side so the list still reflects the documented
// "urgent > high > normal > low, then newest first" order.
function sortByPriority(rows: Announcement[]): Announcement[] {
  return [...rows].sort((a, b) => {
    const byPriority = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]
    if (byPriority !== 0) return byPriority
    return (b.publishedAt ?? b.createdAt).localeCompare(
      a.publishedAt ?? a.createdAt
    )
  })
}

const columns: Column<Announcement & Record<string, unknown>>[] = [
  {
    key: "title",
    header: "Announcement",
    sortable: true,
    width: "32%",
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
    key: "isPublished",
    header: "Status",
    align: "center",
    render: (row) => (
      <StatusBadge
        label={row.isPublished ? "Published" : "Draft"}
        variant={row.isPublished ? "success" : "warning"}
        dot
      />
    ),
  },
  {
    key: "createdAt",
    header: "Created",
    sortable: true,
    render: (row) => (
      <span className="text-xs text-muted-foreground">
        {new Date(row.createdAt).toLocaleDateString()}
      </span>
    ),
  },
]

export default function AnnouncementList() {
  const { can } = usePermissions()
  const canManage = can({ resource: "announcements", action: "manage" })

  const { data, isLoading } = useAllAnnouncements()
  const createAnnouncement = useCreateAnnouncement()
  const updateAnnouncement = useUpdateAnnouncement()
  const deleteAnnouncement = useDeleteAnnouncement()
  const publishAnnouncement = usePublishAnnouncement()
  const unpublishAnnouncement = useUnpublishAnnouncement()

  const [selected, setSelected] = useState<Announcement | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)

  const rows = useMemo(() => sortByPriority(data?.data ?? []), [data])

  const stats = useMemo(() => {
    const all = data?.data ?? []
    return {
      total: all.length,
      published: all.filter((a) => a.isPublished).length,
      drafts: all.filter((a) => !a.isPublished).length,
      urgent: all.filter((a) => a.priority === "urgent").length,
    }
  }, [data])

  const statRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!statRef.current || isLoading) return
    const ctx = gsap.context(() => {
      gsap.from(".announcement-stat-item", {
        y: -16,
        opacity: 0,
        duration: 0.5,
        stagger: 0.08,
        ease: "power3.out",
      })
    }, statRef)
    return () => ctx.revert()
  }, [isLoading])

  const statTiles = [
    {
      label: "Total",
      value: stats.total,
      icon: Megaphone,
      tone: "text-foreground",
    },
    {
      label: "Published",
      value: stats.published,
      icon: Send,
      tone: "text-emerald-500",
    },
    {
      label: "Drafts",
      value: stats.drafts,
      icon: FileText,
      tone: "text-amber-500",
    },
    {
      label: "Urgent",
      value: stats.urgent,
      icon: AlertTriangle,
      tone: "text-red-500",
    },
  ]

  const handleDelete = async (row: Announcement) => {
    if (!window.confirm(`Delete "${row.title}"? This cannot be undone.`)) return
    await deleteAnnouncement.mutateAsync(row.id)
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <Megaphone size={22} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Announcements
              </h1>
              <p className="text-sm text-muted-foreground">
                News, events, academic notices, and general communications.
              </p>
            </div>
          </div>
          {canManage && (
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <Plus size={16} /> New Announcement
            </Button>
          )}
        </div>
      </motion.div>

      <div ref={statRef} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statTiles.map((tile) => (
          <div
            key={tile.label}
            className="announcement-stat-item rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <tile.icon size={14} className={tile.tone} />
              {tile.label}
            </div>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {tile.value}
            </p>
          </div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        <DataTable
          data={rows as (Announcement & Record<string, unknown>)[]}
          columns={[
            ...columns,
            {
              key: "actions",
              header: "",
              align: "center",
              width: "150px",
              render: (row) => (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelected(row as unknown as Announcement)}
                    title="View"
                  >
                    <Eye size={14} />
                  </Button>
                  {canManage && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setEditing(row as unknown as Announcement)
                        }
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </Button>
                      {row.isPublished ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Unpublish"
                          disabled={unpublishAnnouncement.isPending}
                          onClick={() => unpublishAnnouncement.mutate(row.id)}
                        >
                          <EyeOff size={14} />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Publish"
                          disabled={publishAnnouncement.isPending}
                          onClick={() => publishAnnouncement.mutate(row.id)}
                        >
                          <Send size={14} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Delete"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={deleteAnnouncement.isPending}
                        onClick={() =>
                          handleDelete(row as unknown as Announcement)
                        }
                      >
                        <Trash2 size={14} />
                      </Button>
                    </>
                  )}
                </div>
              ),
            },
          ]}
          loading={isLoading}
          searchPlaceholder="Search by title, content, category…"
          searchExtractor={(row) =>
            `${row.title} ${row.content} ${row.category}`
          }
          rowKey="id"
          pageSize={10}
          emptyMessage="No announcements found"
        />
      </motion.div>

      {/* Detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title}
        subtitle={selected ? `${selected.category} · ${selected.priority}` : ""}
        size="lg"
      >
        {selected && <AnnouncementDetail announcement={selected} />}
      </Modal>

      {/* Create modal */}
      {canManage && (
        <AnnouncementFormModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onSubmit={async (values) => {
            await createAnnouncement.mutateAsync(values)
          }}
        />
      )}

      {/* Edit modal */}
      {canManage && (
        <AnnouncementFormModal
          open={!!editing}
          onClose={() => setEditing(null)}
          announcement={editing}
          onSubmit={async (values: CreateAnnouncementValues) => {
            if (!editing) return
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { isPublished, ...dto } = values
            await updateAnnouncement.mutateAsync({ id: editing.id, dto })
          }}
        />
      )}
    </div>
  )
}

function AnnouncementDetail({ announcement }: { announcement: Announcement }) {
  return (
    <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
      <AnimatePresence mode="wait">
        <motion.p
          key={announcement.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm whitespace-pre-wrap text-foreground"
        >
          {announcement.content}
        </motion.p>
      </AnimatePresence>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 border-t border-border/50 pt-2">
        {[
          {
            label: "Status",
            value: announcement.isPublished ? "Published" : "Draft",
          },
          {
            label: "Published At",
            value: announcement.publishedAt
              ? new Date(announcement.publishedAt).toLocaleString()
              : "—",
          },
          {
            label: "Expires At",
            value: announcement.expiresAt
              ? new Date(announcement.expiresAt).toLocaleDateString()
              : "—",
          },
          {
            label: "Created",
            value: new Date(announcement.createdAt).toLocaleString(),
          },
        ].map((f) => (
          <div
            key={f.label}
            className="flex justify-between border-b border-border/50 py-1.5"
          >
            <span className="text-xs text-muted-foreground">{f.label}</span>
            <span className="text-right text-xs font-medium text-foreground">
              {f.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
