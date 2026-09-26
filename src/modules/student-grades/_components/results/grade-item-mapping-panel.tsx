"use client"

import { toast } from "sonner"
import { Loader2, Tags } from "lucide-react"
import EmptyState from "@/components/custom/EmptyState"
import { cn } from "@/lib/utils"
import { useGradeItems } from "../../hooks/use-results"
import { useMapGradeItem } from "../../hooks/use-results-mutations"
import { MapGradeItemSchema } from "../../schemas"
import { toResultsApiError } from "../../lib/results-errors"
import { NotAvailableNotice } from "./not-available-notice"
import { MOODLE_SETUP_NOTE } from "./sheet-summary-header"
import { fmtScore } from "./format"
import type { GradeItemMapping, ItemComponent } from "../../types"

export const COMPONENT_STYLE: Record<ItemComponent, string> = {
  CA: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  EXAM: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  EXCLUDED:
    "bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300",
  UNMAPPED: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
}

const SOURCE_LABEL = {
  IDNUMBER: "Moodle ID number",
  CATEGORY: "Moodle category",
  MANUAL: "Mapped in portal",
} as const

interface GradeItemMappingPanelProps {
  offeringId: number
  /** results.items.map held AND the sheet is DRAFT (C7: 409 otherwise). */
  canMap: boolean
}

export function GradeItemMappingPanel({
  offeringId,
  canMap,
}: GradeItemMappingPanelProps) {
  const items = useGradeItems(offeringId)
  const mapItem = useMapGradeItem(offeringId)

  const change = async (item: GradeItemMapping, value: string) => {
    const body = MapGradeItemSchema.safeParse({ component: value })
    if (!body.success) return
    try {
      await mapItem.mutateAsync({
        moodleGradeItemId: item.moodleGradeItemId,
        body: body.data,
      })
      toast.success(`"${item.itemName}" mapped to ${body.data.component}.`)
    } catch (error) {
      if (error instanceof Error) toast.error(toResultsApiError(error).message)
    }
  }

  if (items.isLoading)
    return (
      <div className="h-40 animate-pulse rounded-2xl bg-muted/40" aria-busy />
    )
  if (items.isError)
    return (
      <EmptyState
        icon={Tags}
        title="Couldn't load grade items"
        description={items.error.message}
      />
    )
  if (items.data?.available === false)
    return (
      <NotAvailableNotice title="Grade-item mapping isn't available on the server yet" />
    )

  const list = items.data?.data ?? []
  const unmapped = list.filter((i) => i.component === "UNMAPPED")
  // Every item mapped to CA is added into one CA total, numbered CA1, CA2…
  // in gradebook order (e.g. CA1 = assignment, CA2 = quiz); the same for Exam.
  const caItems = list.filter((i) => i.component === "CA")
  const examItems = list.filter((i) => i.component === "EXAM")
  const excluded = list.filter((i) => i.component === "EXCLUDED")
  const caLabel = (item: GradeItemMapping) => {
    const at = caItems.findIndex(
      (i) => i.moodleGradeItemId === item.moodleGradeItemId
    )
    return `CA${at >= 0 ? at + 1 : caItems.length + 1}`
  }
  const examLabel = (item: GradeItemMapping) => {
    const at = examItems.findIndex(
      (i) => i.moodleGradeItemId === item.moodleGradeItemId
    )
    const n = at >= 0 ? at + 1 : examItems.length + 1
    return examItems.length > 1 || (at < 0 && examItems.length > 0)
      ? `Exam ${n}`
      : "Exam"
  }
  const total = (group: GradeItemMapping[]) =>
    group.reduce((sum, i) => sum + (i.gradeMax ?? 0), 0)
  const describe = (
    group: GradeItemMapping[],
    label: (i: GradeItemMapping) => string
  ) =>
    group
      .map((i) => `${label(i)} ${i.itemName} (/${fmtScore(i.gradeMax)})`)
      .join(" + ")

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Items are classified automatically from Moodle. {MOODLE_SETUP_NOTE} The
        sheet&apos;s CA / exam split is these items&apos; combined weights in
        the Moodle gradebook, so it changes only when the Moodle weights (or
        this mapping) change.
        {canMap &&
          " You can override any item here without editing Moodle; the draft rows are recomputed."}
      </p>
      {unmapped.length > 0 && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive"
        >
          {unmapped.length} unmapped item{unmapped.length === 1 ? "" : "s"}{" "}
          block this sheet: {unmapped.map((i) => i.itemName).join(", ")}.
        </p>
      )}
      {list.length > 0 && (
        <dl
          aria-label="How this sheet's CA and exam are made up"
          className="grid gap-2 rounded-xl border border-border bg-muted/20 p-3 text-xs sm:grid-cols-2 dark:bg-muted/10"
        >
          <div>
            <dt className="font-semibold text-blue-700 dark:text-blue-300">
              CA = /{fmtScore(total(caItems))}
            </dt>
            <dd className="text-muted-foreground">
              {caItems.length
                ? describe(caItems, caLabel)
                : "No items mapped to CA yet. Map each assignment, quiz or test to CA; they are added together."}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-violet-700 dark:text-violet-300">
              Exam = /{fmtScore(total(examItems))}
            </dt>
            <dd className="text-muted-foreground">
              {examItems.length
                ? describe(examItems, examLabel)
                : "No item mapped to Exam yet."}
            </dd>
          </div>
          {excluded.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="sr-only">Excluded</dt>
              <dd className="text-muted-foreground">
                Not counted: {excluded.map((i) => i.itemName).join(", ")}.
              </dd>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground sm:col-span-2">
            Marks are added within CA and within Exam, then scaled to the
            sheet&apos;s CA / exam weights: the Moodle gradebook weights, or the
            grading scheme&apos;s fallback weights in Result configuration when
            Moodle has none.
          </p>
        </dl>
      )}
      {list.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No grade items yet"
          description="Pull from Moodle to load this course's gradebook items."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <caption className="sr-only">Moodle grade items</caption>
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                <th scope="col" className="px-3 py-2.5">
                  Item
                </th>
                <th scope="col" className="px-3 py-2.5">
                  ID number
                </th>
                <th scope="col" className="px-3 py-2.5">
                  Category
                </th>
                <th scope="col" className="px-3 py-2.5 text-right">
                  Max
                </th>
                <th scope="col" className="px-3 py-2.5">
                  Component
                </th>
                <th scope="col" className="px-3 py-2.5">
                  Source
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => {
                const pending =
                  mapItem.isPending &&
                  mapItem.variables?.moodleGradeItemId ===
                    item.moodleGradeItemId
                return (
                  <tr
                    key={item.moodleGradeItemId}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="px-3 py-2 font-medium text-foreground">
                      {item.itemName}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {item.itemIdnumber ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {item.categoryIdnumber ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {fmtScore(item.gradeMax)}
                    </td>
                    <td className="px-3 py-2">
                      {canMap ? (
                        <div className="flex items-center gap-2">
                          <select
                            aria-label={`Component for ${item.itemName}`}
                            value={
                              item.component === "UNMAPPED"
                                ? ""
                                : item.component
                            }
                            disabled={pending}
                            onChange={(e) => change(item, e.target.value)}
                            className={cn(
                              "h-8 rounded-lg border border-border bg-background px-2 text-xs focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none dark:bg-muted/20",
                              item.component === "UNMAPPED" &&
                                "border-destructive/50"
                            )}
                          >
                            <option value="" disabled>
                              Unmapped — choose…
                            </option>
                            <option value="CA">
                              {caLabel(item)} · adds to CA
                            </option>
                            <option value="EXAM">
                              {examLabel(item)} · adds to Exam
                            </option>
                            <option value="EXCLUDED">
                              Excluded · not counted
                            </option>
                          </select>
                          {pending && (
                            <Loader2
                              className="size-3.5 animate-spin text-muted-foreground"
                              aria-label="Saving"
                            />
                          )}
                        </div>
                      ) : (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            COMPONENT_STYLE[item.component]
                          )}
                        >
                          {item.component === "CA"
                            ? caLabel(item)
                            : item.component === "EXAM"
                              ? examLabel(item)
                              : item.component}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {item.source ? SOURCE_LABEL[item.source] : "—"}
                      {item.mappedBy && ` · ${item.mappedBy}`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
