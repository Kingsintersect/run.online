"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, SlidersHorizontal, RotateCcw, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuditStore } from "../store/audit.store"
import { Badge } from "@/components/ui/badge"
import type { AuditAction, AuditEntityType } from "../types/audit.types"

// ─── Options ─────────────────────────────────────────────────────────────────

const ACTION_OPTIONS: AuditAction[] = [
  "LOGIN",
  "LOGOUT",
  "CREATE",
  "UPDATE",
  "DELETE",
  "APPROVE",
  "REJECT",
  "ENROLL",
  "PAYMENT",
  "SYNC",
]

const ENTITY_OPTIONS: AuditEntityType[] = [
  "Student",
  "Grade",
  "Invoice",
  "Course",
  "Tutor",
  "Clearance",
  "Payment",
  "User",
  "Setting",
  "StudentEnrollment",
  "Document",
  "Announcement",
  "MoodleUser",
  "MoodleEnrollment",
]

const ALL_ACTIONS_VALUE = "__all_actions"
const ALL_ENTITIES_VALUE = "__all_entities"
const ALL_SEMESTERS_VALUE = "__all_semesters"
const ALL_YEARS_VALUE = "__all_years"

// ─── Component ────────────────────────────────────────────────────────────────

export function AuditFilters() {
  const {
    filters,
    setFilters,
    resetFilters,
    isFilterPanelOpen,
    setFilterPanelOpen,
  } = useAuditStore()

  const activeCount = [
    filters.action,
    filters.entityType,
    filters.startDate,
    filters.endDate,
    filters.semester,
    filters.academicYear,
  ].filter(Boolean).length

  return (
    <>
      {/* Trigger button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setFilterPanelOpen(true)}
        className="relative gap-1.5"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Filters</span>
        {activeCount > 0 && (
          <Badge
            variant="secondary"
            className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center bg-primary p-0 text-[9px] text-primary-foreground"
          >
            {activeCount}
          </Badge>
        )}
      </Button>

      <AnimatePresence>
        {isFilterPanelOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFilterPanelOpen(false)}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            />

            {/* Slide-in panel */}
            <motion.div
              key="panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed top-0 right-0 bottom-0 z-50 flex w-80 flex-col border-l border-border bg-card shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-foreground">Filter Logs</h3>
                  {activeCount > 0 && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {activeCount} active
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFilterPanelOpen(false)}
                  className="h-7 w-7"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Filter fields */}
              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
                {/* Action */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Action
                  </Label>
                  <Select
                    value={filters.action || ALL_ACTIONS_VALUE}
                    onValueChange={(v) =>
                      setFilters({
                        action:
                          v === ALL_ACTIONS_VALUE ? "" : (v as AuditAction),
                        page: 1,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_ACTIONS_VALUE}>
                        All actions
                      </SelectItem>
                      {ACTION_OPTIONS.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Entity Type */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Entity Type
                  </Label>
                  <Select
                    value={filters.entityType || ALL_ENTITIES_VALUE}
                    onValueChange={(v) =>
                      setFilters({
                        entityType:
                          v === ALL_ENTITIES_VALUE
                            ? ""
                            : (v as AuditEntityType),
                        page: 1,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All entities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_ENTITIES_VALUE}>
                        All entities
                      </SelectItem>
                      {ENTITY_OPTIONS.map((e) => (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Semester */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Semester
                  </Label>
                  <Select
                    value={filters.semester || ALL_SEMESTERS_VALUE}
                    onValueChange={(v) =>
                      setFilters({
                        semester:
                          v === ALL_SEMESTERS_VALUE
                            ? ""
                            : (v as "First" | "Second"),
                        page: 1,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All semesters" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_SEMESTERS_VALUE}>
                        All semesters
                      </SelectItem>
                      <SelectItem value="First">First Semester</SelectItem>
                      <SelectItem value="Second">Second Semester</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date range */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Date Range
                  </Label>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">
                        From
                      </Label>
                      <Input
                        type="date"
                        value={filters.startDate ?? ""}
                        onChange={(e) =>
                          setFilters({ startDate: e.target.value, page: 1 })
                        }
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">
                        To
                      </Label>
                      <Input
                        type="date"
                        value={filters.endDate ?? ""}
                        onChange={(e) =>
                          setFilters({ endDate: e.target.value, page: 1 })
                        }
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Academic Year */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Academic Year
                  </Label>
                  <Select
                    value={filters.academicYear || ALL_YEARS_VALUE}
                    onValueChange={(v) =>
                      setFilters({
                        academicYear: v === ALL_YEARS_VALUE ? "" : v,
                        page: 1,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_YEARS_VALUE}>All years</SelectItem>
                      <SelectItem value="2025/2026">2025/2026</SelectItem>
                      <SelectItem value="2024/2025">2024/2025</SelectItem>
                      <SelectItem value="2023/2024">2023/2024</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-2 border-t border-border px-5 py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="flex-1 gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Clear all
                </Button>
                <Button
                  size="sm"
                  onClick={() => setFilterPanelOpen(false)}
                  className="flex-1"
                >
                  Apply
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
