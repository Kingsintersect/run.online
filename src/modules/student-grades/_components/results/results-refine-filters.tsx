"use client"

import { RotateCcw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useResultsUiStore } from "../../store/results-ui.store"
import { SelectField } from "./select-field"
import type { ResultSheetFilters, SheetStatus } from "../../types"

const STATUS_OPTIONS: { value: SheetStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "APPROVED", label: "Approved" },
  { value: "PUBLISHED", label: "Published" },
]

const FLAG_OPTIONS: {
  value: NonNullable<ResultSheetFilters["flag"]>
  label: string
}[] = [
  { value: "MISSING_CA", label: "Missing CA" },
  { value: "MISSING_EXAM", label: "Missing exam" },
  { value: "MOODLE_DRIFT", label: "Moodle drift" },
  { value: "SCHEME_UNRESOLVED", label: "No grading scheme" },
  { value: "ADJUSTMENT_SUPERSEDED", label: "Adjustment superseded" },
]

interface ResultsRefineFiltersProps {
  /** Locked until the scope above is chosen (admin workspace). */
  disabled?: boolean
}

// Status, warning and search: narrow the rows on screen. They don't change
// what a Moodle pull covers.
export function ResultsRefineFilters({
  disabled = false,
}: ResultsRefineFiltersProps) {
  const w = useResultsUiStore((s) => s.workspace)
  const setWorkspace = useResultsUiStore((s) => s.setWorkspace)
  const resetWorkspace = useResultsUiStore((s) => s.resetWorkspace)

  return (
    <>
      <SelectField
        id="ws-status"
        label="Status"
        value={w.status ?? ""}
        disabled={disabled}
        onChange={(v) =>
          setWorkspace({
            status: STATUS_OPTIONS.find((o) => o.value === v)?.value ?? null,
          })
        }
        placeholder="Any status"
        options={STATUS_OPTIONS}
      />
      <SelectField
        id="ws-flag"
        label="Warning"
        value={w.flag ?? ""}
        disabled={disabled}
        onChange={(v) =>
          setWorkspace({
            flag: FLAG_OPTIONS.find((o) => o.value === v)?.value ?? null,
          })
        }
        placeholder="Any"
        options={FLAG_OPTIONS}
      />
      <div className="min-w-0 space-y-1">
        <label
          htmlFor="ws-search"
          className="text-[11px] font-medium text-muted-foreground"
        >
          Search
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="ws-search"
            value={w.search}
            disabled={disabled}
            onChange={(e) => setWorkspace({ search: e.target.value })}
            placeholder="Course code or title"
            className="h-9 pl-8"
          />
        </div>
      </div>
      <div className="flex items-end">
        <Button variant="ghost" size="sm" onClick={resetWorkspace}>
          <RotateCcw className="size-3.5" aria-hidden /> Reset filters
        </Button>
      </div>
    </>
  )
}
