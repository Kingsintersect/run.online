"use client"

import { CalendarRange, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  ALL_FILTER_VALUE,
  type MyResultsSessionFilter as Filter,
} from "../hooks/use-my-results-session-filter"

// Session / semester picker for the student's own published results. Pure
// presentation — state and URL sync live in useMyResultsSessionFilter.
export function MyResultsSessionFilter({
  filter,
  showSemester = true,
  className,
}: {
  filter: Filter
  showSemester?: boolean
  className?: string
}) {
  const sessionDisabled = filter.isLoading || filter.isError
  const semesterDisabled =
    !filter.isFiltered || filter.semesterOptions.length === 0

  return (
    <div
      role="group"
      aria-label="Filter results by academic session"
      className={cn(
        "flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-3 dark:bg-card/60",
        className
      )}
    >
      <CalendarRange
        size={16}
        className="mb-2.5 hidden text-muted-foreground sm:block"
        aria-hidden
      />
      <div className="flex min-w-[14rem] flex-1 flex-col gap-1 sm:flex-none">
        <label
          htmlFor="results-session-filter"
          className="text-[11px] font-medium text-muted-foreground"
        >
          Academic session
        </label>
        <Select
          value={filter.sessionValue}
          onValueChange={filter.setSession}
          disabled={sessionDisabled}
        >
          <SelectTrigger
            id="results-session-filter"
            className="h-9 w-full text-xs sm:w-72"
          >
            <SelectValue
              placeholder={
                filter.isLoading ? "Loading sessions…" : "All sessions"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER_VALUE} className="text-xs">
              All sessions
            </SelectItem>
            {filter.sessionOptions.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showSemester && (
        <div className="flex min-w-[10rem] flex-1 flex-col gap-1 sm:flex-none">
          <label
            htmlFor="results-semester-filter"
            className="text-[11px] font-medium text-muted-foreground"
          >
            Semester
          </label>
          <Select
            value={filter.semesterValue}
            onValueChange={filter.setSemester}
            disabled={semesterDisabled}
          >
            <SelectTrigger
              id="results-semester-filter"
              className="h-9 w-full text-xs sm:w-44"
              title={filter.isFiltered ? undefined : "Choose a session first"}
            >
              <SelectValue placeholder="All semesters" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER_VALUE} className="text-xs">
                All semesters
              </SelectItem>
              {filter.semesterOptions.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {filter.isFiltered && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={filter.clear}
          className="h-9 gap-1.5 text-xs"
        >
          <X size={13} aria-hidden />
          Show all sessions
        </Button>
      )}

      {filter.isError && (
        <p role="status" className="w-full text-xs text-muted-foreground">
          Sessions couldn&apos;t be loaded, so all your results are shown.
        </p>
      )}
    </div>
  )
}
