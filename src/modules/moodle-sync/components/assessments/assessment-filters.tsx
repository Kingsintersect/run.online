"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useAssessmentsUiStore } from "../../store/assessments-ui.store"
import type { AssessmentType } from "../../types"

const TYPES: { value: AssessmentType; label: string }[] = [
  { value: "assignment", label: "Assignments" },
  { value: "quiz", label: "Quizzes" },
  { value: "forum", label: "Forums" },
]

interface AssessmentFiltersProps {
  /** Show the visibility filter — for admin/tutor views */
  showVisibilityFilter?: boolean
  /** Show the upcoming toggle — for student views */
  showUpcomingToggle?: boolean
}

export function AssessmentFilters({
  showVisibilityFilter = false,
  showUpcomingToggle = false,
}: AssessmentFiltersProps) {
  const {
    activeType,
    searchQuery,
    visibilityFilter,
    upcomingOnly,
    setActiveType,
    setSearchQuery,
    setVisibilityFilter,
    setUpcomingOnly,
    resetFilters,
  } = useAssessmentsUiStore()

  const isDirty =
    activeType !== null ||
    searchQuery.trim().length > 0 ||
    visibilityFilter !== "all" ||
    upcomingOnly

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Type filter pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setActiveType(null)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
            activeType === null
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-transparent text-muted-foreground hover:border-primary/40"
          )}
        >
          All
        </button>
        {TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() =>
              setActiveType(activeType === t.value ? null : t.value)
            }
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
              activeType === t.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-transparent text-muted-foreground hover:border-primary/40"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative min-w-56 grow sm:grow-0">
        <Search
          size={14}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
        />
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search assessment or course"
          className="h-8 w-full rounded-md border border-input bg-background pr-3 pl-9 text-xs text-foreground transition-shadow outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      {/* Visibility filter */}
      {showVisibilityFilter && (
        <Select
          value={visibilityFilter}
          onValueChange={(v) =>
            setVisibilityFilter(v as "all" | "visible" | "hidden")
          }
        >
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue placeholder="Visibility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="visible">Visible</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
          </SelectContent>
        </Select>
      )}

      {/* Upcoming toggle */}
      {showUpcomingToggle && (
        <button
          onClick={() => setUpcomingOnly(!upcomingOnly)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
            upcomingOnly
              ? "border-amber-500 bg-amber-500 text-white"
              : "border-border bg-transparent text-muted-foreground hover:border-amber-400/60"
          )}
        >
          Upcoming only
        </button>
      )}

      {/* Clear filters */}
      <AnimatePresence>
        {isDirty && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.15 }}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={resetFilters}
            >
              <X size={12} className="mr-1" />
              Clear
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
