"use client"

import { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, ChevronDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Permission } from "@/types/roles"

interface PermissionPickerProps {
  permissions: Permission[]
  selected: number[]
  onChange: (ids: number[]) => void
}

export default function PermissionPicker({
  permissions,
  selected,
  onChange,
}: PermissionPickerProps) {
  const [search, setSearch] = useState("")
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())

  // Group by module
  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>()
    permissions.forEach((p) => {
      const list = map.get(p.module) || []
      list.push(p)
      map.set(p.module, list)
    })
    return Array.from(map.entries())
      .map(([module, perms]) => ({ module, permissions: perms }))
      .sort((a, b) => a.module.localeCompare(b.module))
  }, [permissions])

  // Filter
  const filtered = useMemo(() => {
    if (!search.trim()) return grouped
    const q = search.toLowerCase()
    return grouped
      .map((g) => ({
        ...g,
        permissions: g.permissions.filter(
          (p) =>
            p.resource.toLowerCase().includes(q) ||
            p.action.toLowerCase().includes(q) ||
            p.module.toLowerCase().includes(q) ||
            (p.description || "").toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.permissions.length > 0)
  }, [grouped, search])

  const togglePermission = (id: number) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id))
    } else {
      onChange([...selected, id])
    }
  }

  const toggleModule = (module: string) => {
    const modulePerms = permissions.filter((p) => p.module === module)
    const allSelected = modulePerms.every((p) => selected.includes(p.id))
    if (allSelected) {
      onChange(selected.filter((id) => !modulePerms.some((p) => p.id === id)))
    } else {
      const newIds = modulePerms
        .map((p) => p.id)
        .filter((id) => !selected.includes(id))
      onChange([...selected, ...newIds])
    }
  }

  const toggleExpanded = (module: string) => {
    const next = new Set(expandedModules)
    if (next.has(module)) next.delete(module)
    else next.add(module)
    setExpandedModules(next)
  }

  const getModuleSelectionState = (module: string) => {
    const modulePerms = permissions.filter((p) => p.module === module)
    const selectedCount = modulePerms.filter((p) =>
      selected.includes(p.id)
    ).length
    if (selectedCount === 0) return "none"
    if (selectedCount === modulePerms.length) return "all"
    return "partial"
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      {/* Search */}
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search
            size={14}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search permissions…"
            className="w-full rounded-lg border border-transparent bg-muted py-2 pr-3 pl-8 text-sm text-foreground transition-all outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Permission groups */}
      <div className="max-h-64 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No permissions found
          </p>
        ) : (
          filtered.map((group) => {
            const state = getModuleSelectionState(group.module)
            const isExpanded = expandedModules.has(group.module)

            return (
              <div
                key={group.module}
                className="border-b border-border last:border-0"
              >
                {/* Module header */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleExpanded(group.module)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      toggleExpanded(group.module)
                    }
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50"
                >
                  {/* Module checkbox */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleModule(group.module)
                    }}
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all",
                      state === "all"
                        ? "border-primary bg-primary"
                        : state === "partial"
                          ? "border-primary bg-primary/30"
                          : "border-border hover:border-primary/50"
                    )}
                  >
                    {(state === "all" || state === "partial") && (
                      <Check size={10} className="text-white" strokeWidth={3} />
                    )}
                  </button>

                  <span className="flex-1 text-left text-sm font-medium text-foreground capitalize">
                    {group.module}
                  </span>
                  <span className="mr-2 text-xs text-muted-foreground">
                    {
                      group.permissions.filter((p) => selected.includes(p.id))
                        .length
                    }
                    /{group.permissions.length}
                  </span>
                  <ChevronDown
                    size={14}
                    className={cn(
                      "text-muted-foreground transition-transform",
                      isExpanded && "rotate-180"
                    )}
                  />
                </div>

                {/* Permission items */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {group.permissions.map((perm) => {
                        const isSelected = selected.includes(perm.id)
                        return (
                          <button
                            key={perm.id}
                            type="button"
                            onClick={() => togglePermission(perm.id)}
                            className={cn(
                              "flex w-full items-center gap-3 px-4 py-2.5 pl-10 text-left transition-colors hover:bg-accent/30",
                              isSelected && "bg-primary/5"
                            )}
                          >
                            <div
                              className={cn(
                                "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all",
                                isSelected
                                  ? "border-primary bg-primary"
                                  : "border-border hover:border-primary/50"
                              )}
                            >
                              {isSelected && (
                                <Check
                                  size={10}
                                  className="text-white"
                                  strokeWidth={3}
                                />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-foreground">
                                <span className="font-medium">
                                  {perm.resource}
                                </span>
                                <span className="text-muted-foreground">
                                  .{perm.action}
                                </span>
                              </p>
                              {perm.description && (
                                <p className="truncate text-xs text-muted-foreground">
                                  {perm.description}
                                </p>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
