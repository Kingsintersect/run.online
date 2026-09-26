"use client"

import { Info, Layers } from "lucide-react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuditStore } from "../store/audit.store"
import {
  AUDIT_CATEGORIES,
  categoryForEntityType,
  entityTypeLabel,
  type AuditCategory,
} from "../lib/audit-catalog"
import type { AuditAction, AuditEntityType } from "../types/audit.types"
import { ACTION_CONFIG } from "./ActionBadge"

const ANY_ACTION = "__any_action"

/**
 * Category presets (Results, Session migration). The backend filters on one
 * entity type per request, so a category is never "all of its types at once":
 * choosing it selects its first entity type, and the select below switches
 * between them. The active category is derived from `filters.entityType`, so
 * "Clear all" and the filter panel stay in sync without extra state.
 */
export function AuditCategoryFilter() {
  const { filters, setFilters } = useAuditStore()
  const active = categoryForEntityType(filters.entityType)

  function chooseCategory(category: AuditCategory | null) {
    if (!category) {
      setFilters({ entityType: "", action: "", page: 1 })
      return
    }
    const first = category.presets[0]
    setFilters({
      entityType: first.entityType,
      action: first.action ?? "",
      page: 1,
    })
  }

  function chooseEntity(entityType: AuditEntityType) {
    const preset = active?.presets.find((p) => p.entityType === entityType)
    setFilters({ entityType, action: preset?.action ?? "", page: 1 })
  }

  return (
    <div className="space-y-3">
      <div
        role="group"
        aria-label="Audit category"
        className="flex flex-wrap items-center gap-1.5"
      >
        <span className="mr-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Layers className="h-3.5 w-3.5" aria-hidden />
          Category
        </span>
        <CategoryPill
          label="All activity"
          selected={!active}
          onSelect={() => chooseCategory(null)}
        />
        {AUDIT_CATEGORIES.map((c) => (
          <CategoryPill
            key={c.id}
            label={c.label}
            title={c.description}
            selected={active?.id === c.id}
            onSelect={() => chooseCategory(c)}
          />
        ))}
      </div>

      {active && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-3 shadow-sm dark:bg-card/60">
          <p className="text-xs text-muted-foreground">{active.description}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="audit-category-entity"
                className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
              >
                Record type
              </Label>
              <Select
                value={filters.entityType || undefined}
                onValueChange={(v) => chooseEntity(v as AuditEntityType)}
              >
                <SelectTrigger id="audit-category-entity" className="w-full">
                  <SelectValue placeholder="Choose a record type" />
                </SelectTrigger>
                <SelectContent>
                  {active.presets.map((p) => (
                    <SelectItem key={p.entityType} value={p.entityType}>
                      {entityTypeLabel(p.entityType)}
                      {entityTypeLabel(p.entityType) !== p.entityType && (
                        <span className="ml-1.5 text-[10px] text-muted-foreground">
                          {p.entityType}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {
                  active.presets.find(
                    (p) => p.entityType === filters.entityType
                  )?.hint
                }
              </p>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="audit-category-action"
                className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
              >
                Action
              </Label>
              <Select
                value={filters.action || ANY_ACTION}
                onValueChange={(v) =>
                  setFilters({
                    action: v === ANY_ACTION ? "" : (v as AuditAction),
                    page: 1,
                  })
                }
              >
                <SelectTrigger id="audit-category-action" className="w-full">
                  <SelectValue placeholder="Any action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_ACTION}>Any action</SelectItem>
                  {active.actions.map((a) => (
                    <SelectItem key={a} value={a}>
                      {ACTION_CONFIG[a].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <Info className="mt-px h-3 w-3 shrink-0" aria-hidden />
            {active.notYetLogged}
          </p>
        </div>
      )}
    </div>
  )
}

function CategoryPill({
  label,
  title,
  selected,
  onSelect,
}: {
  label: string
  title?: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      title={title}
      onClick={onSelect}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-card text-foreground hover:border-primary/50 dark:bg-card/60"
      )}
    >
      {label}
    </button>
  )
}
