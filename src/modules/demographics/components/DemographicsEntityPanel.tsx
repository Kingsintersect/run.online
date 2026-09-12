"use client"

import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import { Loader2, Pencil, Plus, Trash2, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import EmptyState from "@/components/custom/EmptyState"

export interface DemographicsEntityRow {
  id: number
  name: string
  code?: string | null
  isActive: boolean
}

interface DemographicsEntityPanelProps<T extends DemographicsEntityRow> {
  title: string
  description: string
  icon: LucideIcon
  items: T[]
  isLoading: boolean
  isError: boolean
  /** When the panel is filtered by a parent selection that hasn't been made yet. */
  disabledReason?: string
  onToggle: (item: T, next: boolean) => void
  onEdit: (item: T) => void
  onDelete: (item: T) => void
  onAdd: () => void
  isMutating?: boolean
}

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}
const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
}

export function DemographicsEntityPanel<T extends DemographicsEntityRow>({
  title,
  description,
  icon: Icon,
  items,
  isLoading,
  isError,
  disabledReason,
  onToggle,
  onEdit,
  onDelete,
  onAdd,
  isMutating,
}: DemographicsEntityPanelProps<T>) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
            <Icon size={17} className="text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-success/30 text-success">
            {items.length}
          </Badge>
          <Button
            size="icon-sm"
            variant="outline"
            onClick={onAdd}
            disabled={!!disabledReason || isMutating}
            title="Add"
          >
            <Plus className="size-3.5" />
          </Button>
        </div>
      </div>

      {disabledReason ? (
        <EmptyState
          icon={AlertTriangle}
          title={disabledReason}
          className="py-10"
        />
      ) : isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load this list"
          description="Something went wrong. Please try again."
          className="py-10"
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Icon}
          title="Nothing here yet"
          description="Click the + button to add the first entry."
          className="py-10"
        />
      ) : (
        <motion.ul
          variants={listVariants}
          initial="hidden"
          animate="show"
          className="divide-y divide-border"
        >
          {items.map((item) => (
            <motion.li
              key={item.id}
              variants={rowVariants}
              className={
                "flex items-center gap-3 px-5 py-3 transition-colors " +
                (item.isActive ? "bg-success/3" : "bg-transparent")
              }
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.name}
                  {item.code && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({item.code})
                    </span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => onEdit(item)}
                  disabled={isMutating}
                  title="Edit"
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => onDelete(item)}
                  disabled={isMutating}
                  className="text-destructive hover:text-destructive"
                  title="Delete"
                >
                  <Trash2 className="size-3.5" />
                </Button>
                <Switch
                  checked={item.isActive}
                  disabled={isMutating}
                  onCheckedChange={(checked) => onToggle(item, checked)}
                  className="ml-1 data-checked:bg-success"
                  aria-label={`Toggle ${item.name}`}
                />
              </div>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  )
}
