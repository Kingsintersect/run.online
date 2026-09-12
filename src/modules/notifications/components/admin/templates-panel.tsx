"use client"

import { useState } from "react"
import { Plus, LayoutTemplate, Edit2, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import SectionCard from "@/components/custom/SectionCard"
import StatusBadge from "@/components/custom/StatusBadge"
import EmptyState from "@/components/custom/EmptyState"
import { useNotificationTemplates } from "../../hooks/use-notifications"
import {
  useCreateTemplate,
  useUpdateTemplate,
  useDeactivateTemplate,
} from "../../hooks/use-template-mutations"
import type {
  NotificationTemplate,
  CreateTemplatePayload,
  UpdateTemplatePayload,
} from "../../types"
import { TemplateFormModal } from "./template-form-modal"
import { DeleteTemplateModal } from "./delete-template-modal"
import { ChannelBadge } from "../shared/channel-badge"

export function TemplatesPanel() {
  const { data, isLoading } = useNotificationTemplates()
  const templates = data?.data ?? []
  const createTemplate = useCreateTemplate()
  const updateTemplate = useUpdateTemplate()
  const deactivateTemplate = useDeactivateTemplate()

  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [selected, setSelected] = useState<NotificationTemplate | null>(null)

  const openCreate = () => {
    setSelected(null)
    setFormMode("create")
    setFormOpen(true)
  }

  const openEdit = (t: NotificationTemplate) => {
    setSelected(t)
    setFormMode("edit")
    setFormOpen(true)
  }

  const openDelete = (t: NotificationTemplate) => {
    setSelected(t)
    setDeleteOpen(true)
  }

  const handleFormSubmit = async (data: CreateTemplatePayload) => {
    try {
      if (formMode === "create") {
        await createTemplate.mutateAsync(data)
      } else if (selected) {
        await updateTemplate.mutateAsync({
          id: selected.id,
          dto: data as UpdateTemplatePayload,
        })
      }
      setFormOpen(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleDeactivate = async () => {
    if (!selected) return
    try {
      await deactivateTemplate.mutateAsync(selected.id)
      setDeleteOpen(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred")
    }
  }

  return (
    <>
      <SectionCard
        title="Notification Templates"
        icon={LayoutTemplate}
        badge={
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
            {templates.length}
          </span>
        }
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" data-icon="inline-start" />
            New Template
          </Button>
        }
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : templates.length === 0 ? (
          <EmptyState
            icon={LayoutTemplate}
            title="No templates yet"
            description="Create reusable templates with variable support for emails, SMS, and in-app messages."
            action={
              <Button onClick={openCreate}>
                <Plus className="size-4" data-icon="inline-start" />
                New Template
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Subject
                  </th>
                  <th className="w-25 px-4 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Channel
                  </th>
                  <th className="w-20 px-4 py-3 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Status
                  </th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {templates.map((t) => (
                  <tr
                    key={t.id}
                    className="group/row transition-colors hover:bg-accent/40"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-medium text-foreground">
                        {t.name}
                      </span>
                    </td>
                    <td className="max-w-70 px-4 py-3">
                      <p
                        className="truncate text-sm text-foreground"
                        title={t.subject}
                      >
                        {t.subject}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <ChannelBadge channel={t.channel} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={t.isActive ? "Active" : "Inactive"}
                        variant={t.isActive ? "success" : "default"}
                        dot
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover/row:opacity-100">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={() => openEdit(t)}
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </Button>
                        {t.isActive && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => openDelete(t)}
                            title="Deactivate"
                          >
                            <Trash2 size={13} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <TemplateFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        mode={formMode}
        template={selected ?? undefined}
        onSubmit={handleFormSubmit}
        isSubmitting={createTemplate.isPending || updateTemplate.isPending}
      />

      <DeleteTemplateModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        template={selected}
        onConfirm={handleDeactivate}
        isDeactivating={deactivateTemplate.isPending}
      />
    </>
  )
}
