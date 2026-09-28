"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGradeItemSuggestions } from "../../hooks/use-results"
import { useMapGradeItem } from "../../hooks/use-results-mutations"
import { toResultsApiError } from "../../lib/results-errors"
import type {
  GradeItemMapping,
  GradeItemSuggestion,
  ResultSheetSummary,
} from "../../types"

interface GradeItemSuggestionsProps {
  summary: ResultSheetSummary
  items: GradeItemMapping[]
  /** results.items.map held AND the sheet is DRAFT. */
  canMap: boolean
}

function basisText(s: GradeItemSuggestion): string {
  return s.basis === "PREVIOUS_OFFERING" && s.fromOffering
    ? `as in ${s.fromOffering.courseCode}, ${s.fromOffering.academicSession} ${s.fromOffering.semesterName}`
    : "from the item's name"
}

// Suggested components for unmapped items (sandbox/automation §5). Applying
// one is the normal mapping call, so it's recorded as mapped by this person.
export function GradeItemSuggestions({
  summary,
  items,
  canMap,
}: GradeItemSuggestionsProps) {
  const hasUnmapped = items.some((i) => i.component === "UNMAPPED")
  const suggestions = useGradeItemSuggestions(summary, canMap && hasUnmapped)
  const mapItem = useMapGradeItem(summary.offeringId)
  const [applyingAll, setApplyingAll] = useState(false)

  const byId = new Map(items.map((i) => [i.moodleGradeItemId, i]))
  const list = (suggestions.data ?? []).filter(
    (s) => byId.get(s.moodleGradeItemId)?.component === "UNMAPPED"
  )
  if (!canMap || list.length === 0) return null

  const apply = (s: GradeItemSuggestion) =>
    mapItem.mutateAsync({
      moodleGradeItemId: s.moodleGradeItemId,
      body: { component: s.component },
    })

  const applyOne = async (s: GradeItemSuggestion) => {
    try {
      await apply(s)
      toast.success(
        `"${byId.get(s.moodleGradeItemId)?.itemName}" mapped to ${s.component}.`
      )
    } catch (error) {
      if (error instanceof Error) toast.error(toResultsApiError(error).message)
    }
  }

  const applyAll = async () => {
    setApplyingAll(true)
    let done = 0
    try {
      for (const s of list) {
        await apply(s)
        done++
      }
      toast.success(`Applied ${done} suggestion${done === 1 ? "" : "s"}.`)
    } catch (error) {
      if (error instanceof Error)
        toast.error(
          `Applied ${done} of ${list.length}. ${toResultsApiError(error).message}`
        )
    } finally {
      setApplyingAll(false)
    }
  }

  const busy = applyingAll || mapItem.isPending

  return (
    <section
      aria-labelledby="grade-item-suggestions"
      className="rounded-xl border border-primary/25 bg-primary/5 p-3 dark:bg-primary/10"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4
          id="grade-item-suggestions"
          className="flex items-center gap-1.5 text-xs font-semibold text-foreground"
        >
          <Sparkles className="size-3.5 text-primary" aria-hidden />
          Suggested mappings
        </h4>
        {list.length > 1 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => void applyAll()}
            disabled={busy}
          >
            {applyingAll && (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            )}
            Apply all {list.length}
          </Button>
        )}
      </div>
      <ul className="mt-2 space-y-1.5">
        {list.map((s) => {
          const item = byId.get(s.moodleGradeItemId)
          const pending =
            mapItem.isPending &&
            mapItem.variables?.moodleGradeItemId === s.moodleGradeItemId
          return (
            <li
              key={s.moodleGradeItemId}
              className="flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <span className="text-foreground">
                <span className="font-medium">{item?.itemName}</span> →{" "}
                <span className="font-semibold">
                  {s.component === "CA" ? "CA" : "Exam"}
                </span>{" "}
                <span className="text-muted-foreground">({basisText(s)})</span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7"
                onClick={() => void applyOne(s)}
                disabled={busy}
                aria-label={`Apply: map ${item?.itemName} to ${s.component}`}
              >
                {pending && (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                )}
                Apply
              </Button>
            </li>
          )
        })}
      </ul>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Suggestions are never applied without you. Check each one against the
        Moodle gradebook before applying.
      </p>
    </section>
  )
}
