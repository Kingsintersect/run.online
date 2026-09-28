"use client"

import { useState, useMemo } from "react"
import { Plus, Search, Loader2, Settings2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import SectionCard from "@/components/custom/SectionCard"
import {
  useSettings,
  useCreateSetting,
  useUpdateSetting,
  useDeleteSetting,
} from "@/hooks/useConfiguration"
import type { SettingGroup, CreateSettingPayload } from "@/types/school"
import type { SafeSetting } from "@/services/configurationApi"
import { UserRole } from "@/config/nav.config"
import { useAppStore } from "@/store"
import { GroupTabs, SETTING_GROUPS } from "./components/GroupTabs"
import { SettingsTable } from "./components/SettingsTable"
import { SettingFormModal } from "./components/SettingFormModal"
import { DeleteSettingModal } from "./components/DeleteSettingModal"

export default function ConfigPage() {
  // ── State ──────────────────────────────────
  const [activeGroup, setActiveGroup] = useState<SettingGroup | "all">("all")
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedSetting, setSelectedSetting] = useState<SafeSetting | null>(
    null
  )
  const [formMode, setFormMode] = useState<"create" | "edit">("create")

  // Viewing or copying a secret setting is super admin only (spec in
  // sandbox/payment-secrets README). This is a role check, not a permission
  // check, on purpose: usePermissions().can() passes every permission for
  // SUPER_ADMIN and the backend has no "reveal secret" permission to grant
  // anyone else, so there is no permission that draws this line. The reveal
  // endpoint enforces the same rule server-side (403 for any other role).
  const activeRole = useAppStore((s) => s.activeRole)
  const canRevealSecrets = activeRole === UserRole.SUPER_ADMIN

  // ── Data ───────────────────────────────────
  const { data: allSettings = [], isLoading } = useSettings()
  const createSetting = useCreateSetting()
  const updateSetting = useUpdateSetting()
  const deleteSetting = useDeleteSetting()

  // ── Derived counts per group ────────────────
  const groupCounts = useMemo(() => {
    const counts: Partial<Record<SettingGroup | "all", number>> = {}
    counts["all"] = allSettings.length
    for (const s of allSettings) {
      const g = s.group as SettingGroup
      counts[g] = (counts[g] ?? 0) + 1
    }
    return counts
  }, [allSettings])

  // ── Filtered list ───────────────────────────
  const filtered = useMemo(() => {
    let list =
      activeGroup === "all"
        ? allSettings
        : allSettings.filter((s) => s.group === activeGroup)
    if (search.trim()) {
      const q = search.toLowerCase()
      // A secret's value is never searchable (it isn't held client-side).
      list = list.filter(
        (s) =>
          s.key.toLowerCase().includes(q) ||
          (s.value ?? "").toLowerCase().includes(q)
      )
    }
    return list
  }, [allSettings, activeGroup, search])

  // ── Handlers ───────────────────────────────
  const openCreate = () => {
    setSelectedSetting(null)
    setFormMode("create")
    setFormOpen(true)
  }

  const openEdit = (setting: SafeSetting) => {
    setSelectedSetting(setting)
    setFormMode("edit")
    setFormOpen(true)
  }

  const openDelete = (setting: SafeSetting) => {
    setSelectedSetting(setting)
    setDeleteOpen(true)
  }

  const handleFormSubmit = async (data: {
    key?: string
    value?: string
    group: string
  }) => {
    try {
      if (formMode === "create") {
        await createSetting.mutateAsync(data as CreateSettingPayload)
        toast.success("Setting created")
      } else if (selectedSetting) {
        await updateSetting.mutateAsync({
          id: selectedSetting.id,
          // No value means "keep the current secret" (write-only edit).
          payload:
            data.value === undefined
              ? { group: data.group }
              : { value: data.value, group: data.group },
        })
        toast.success("Setting updated")
      }
      setFormOpen(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleDelete = async () => {
    if (!selectedSetting) return
    try {
      await deleteSetting.mutateAsync(selectedSetting.id)
      toast.success("Setting deleted")
      setDeleteOpen(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const isSubmitting = createSetting.isPending || updateSetting.isPending

  // ── Active group label ──────────────────────
  const activeLabel =
    SETTING_GROUPS.find((g) => g.value === activeGroup)?.label ?? "Settings"

  return (
    <div className="mx-auto space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            App Configuration
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage key-value settings for university, academic, payment and
            system behaviour.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button onClick={openCreate}>
            <Plus className="size-4" data-icon="inline-start" />
            Add Setting
          </Button>
        </div>
      </div>

      {/* Group tabs */}
      <GroupTabs
        active={activeGroup}
        onChange={setActiveGroup}
        counts={groupCounts}
      />

      {/* Search + table card */}
      <SectionCard
        title={activeLabel}
        icon={Settings2}
        badge={
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
            {filtered.length}
          </span>
        }
        actions={
          <div className="relative">
            <Search
              size={14}
              className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              className="h-8 w-48 pl-8 text-sm"
              placeholder="Search key or value…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        }
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : (
          <SettingsTable
            settings={filtered}
            showGroupColumn={activeGroup === "all"}
            canRevealSecrets={canRevealSecrets}
            onEdit={openEdit}
            onDelete={openDelete}
          />
        )}
      </SectionCard>

      {/* Create / Edit modal */}
      <SettingFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        mode={formMode}
        setting={selectedSetting ?? undefined}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Delete confirm modal */}
      <DeleteSettingModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        setting={selectedSetting}
        onConfirm={handleDelete}
        isDeleting={deleteSetting.isPending}
      />
    </div>
  )
}
