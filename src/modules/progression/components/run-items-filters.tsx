"use client"

import { useEffect, useState } from "react"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAllPrograms, useLevels } from "@/hooks/useCourseStructure"
import { OUTCOME_LABELS, OUTCOME_ORDER } from "../lib/outcome"
import { StandingOutcomeSchema } from "../schemas"
import type { RunItemFilterPatch } from "../hooks/use-run-items-url-state"
import type { RunItemFilters } from "../types"

const ANY = "any"

interface RunItemsFiltersProps {
  filters: RunItemFilters
  majorProgramId: number
  onChange: (patch: RunItemFilterPatch) => void
  onClear: () => void
  hasActiveFilters: boolean
}

function triState(v: boolean | undefined): string {
  return v === undefined ? ANY : String(v)
}

function fromTriState(v: string): boolean | undefined {
  return v === ANY ? undefined : v === "true"
}

/**
 * Filter bar for the run items table. Every value is sent to the server
 * (`GET /promotion-runs/{id}/items`); nothing is filtered client-side.
 */
export function RunItemsFilters({
  filters,
  majorProgramId,
  onChange,
  onClear,
  hasActiveFilters,
}: RunItemsFiltersProps) {
  const programsQuery = useAllPrograms()
  const levelsQuery = useLevels()
  // Programs of this run's major program; programs with no major program
  // recorded are kept rather than guessed away.
  const programs = (programsQuery.data?.data ?? []).filter(
    (p) => p.majorProgramId == null || p.majorProgramId === majorProgramId
  )
  const levels = levelsQuery.data?.data ?? []

  // Debounced search: typing updates local state; the URL (and query)
  // follows after a pause.
  // External URL changes (Back, "Clear filters", a summary card) reset the
  // box; our own debounced writes don't, so typing is never overwritten.
  const [search, setSearch] = useState(filters.search ?? "")
  const [syncedSearch, setSyncedSearch] = useState(filters.search)
  const [lastSent, setLastSent] = useState(filters.search)
  if (filters.search !== syncedSearch) {
    setSyncedSearch(filters.search)
    if (filters.search !== lastSent) {
      setSearch(filters.search ?? "")
      setLastSent(filters.search)
    }
  }
  useEffect(() => {
    const next = search.trim() || undefined
    if (next === lastSent) return
    const t = setTimeout(() => {
      setLastSent(next)
      onChange({ search: next })
    }, 350)
    return () => clearTimeout(t)
  }, [search, lastSent, onChange])

  return (
    <div
      role="search"
      aria-label="Filter students in this run"
      className="flex flex-wrap items-end gap-2"
    >
      <div className="relative min-w-56 flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search matric number or name"
          aria-label="Search by matric number or name"
          className="pl-8"
          maxLength={100}
        />
      </div>

      <Select
        value={filters.outcome ?? ANY}
        onValueChange={(v) => {
          const parsed = StandingOutcomeSchema.safeParse(v)
          onChange({ outcome: parsed.success ? parsed.data : undefined })
        }}
      >
        <SelectTrigger aria-label="Final outcome" className="min-w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>All outcomes</SelectItem>
          {OUTCOME_ORDER.map((o) => (
            <SelectItem key={o} value={o}>
              {OUTCOME_LABELS[o]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.program_id ? String(filters.program_id) : ANY}
        onValueChange={(v) =>
          onChange({ program_id: v === ANY ? undefined : Number(v) })
        }
      >
        <SelectTrigger aria-label="Program" className="max-w-56 min-w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>All programs</SelectItem>
          {programs.map((p) => (
            <SelectItem key={p.id} value={String(p.id)}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.level_id ? String(filters.level_id) : ANY}
        onValueChange={(v) =>
          onChange({ level_id: v === ANY ? undefined : Number(v) })
        }
      >
        <SelectTrigger aria-label="Current level" className="min-w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>All levels</SelectItem>
          {levels.map((l) => (
            <SelectItem key={l.id} value={String(l.id)}>
              {l.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={triState(filters.has_exception)}
        onValueChange={(v) => onChange({ has_exception: fromTriState(v) })}
      >
        <SelectTrigger aria-label="Exceptions" className="min-w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any exceptions</SelectItem>
          <SelectItem value="true">With exceptions</SelectItem>
          <SelectItem value="false">Without exceptions</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={triState(filters.is_overridden)}
        onValueChange={(v) => onChange({ is_overridden: fromTriState(v) })}
      >
        <SelectTrigger aria-label="Overridden" className="min-w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Overridden or not</SelectItem>
          <SelectItem value="true">Overridden</SelectItem>
          <SelectItem value="false">Not overridden</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X data-icon="inline-start" />
          Clear filters
        </Button>
      )}
    </div>
  )
}
