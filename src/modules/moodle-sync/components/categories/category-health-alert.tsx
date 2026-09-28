"use client"

import Link from "next/link"
import { toast } from "sonner"
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { useCategoryHealth } from "../../hooks/use-sync-categories"
import { useRunCategoryHealthCheck } from "../../hooks/use-sync-mutations"
import type { CategoryHealthIssue } from "../../types"

const ISSUE_LABEL: Record<CategoryHealthIssue["issue"], string> = {
  CROSSED: "Crossed",
  ORPHANED: "Moodle category missing",
  WRONG_PARENT: "Wrong parent",
  NAME_MISMATCH: "Name mismatch",
}

const SHOWN = 5

interface CategoryHealthAlertProps {
  /** Link to the Categories screen; off when already on it. */
  showLink?: boolean
}

// Category-mapping problems (sandbox/automation §6), so a crossed mapping is
// noticed before a pull or repair acts on it. Silent when there are none.
export function CategoryHealthAlert({
  showLink = true,
}: CategoryHealthAlertProps) {
  const health = useCategoryHealth()
  const runCheck = useRunCategoryHealthCheck()
  const data = health.data
  if (!data || data.issues.length === 0) return null

  const serious = data.issues.filter((i) => i.issue !== "NAME_MISMATCH")
  const counts = Object.entries(
    data.issues.reduce<Record<string, number>>((acc, i) => {
      acc[ISSUE_LABEL[i.issue]] = (acc[ISSUE_LABEL[i.issue]] ?? 0) + 1
      return acc
    }, {})
  )

  const check = async () => {
    try {
      await runCheck.mutateAsync()
      toast.success(
        "Mapping check queued. Results appear here when it finishes."
      )
    } catch (error) {
      if (error instanceof Error) toast.error(error.message)
    }
  }

  return (
    <section
      role="alert"
      aria-labelledby="category-health-title"
      className={
        serious.length > 0
          ? "rounded-2xl border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30"
          : "rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-2.5">
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden
          />
          <div className="min-w-0 text-sm">
            <p
              id="category-health-title"
              className="font-semibold text-foreground"
            >
              {data.issues.length} Moodle category mapping
              {data.issues.length === 1 ? " looks" : "s look"} wrong
            </p>
            <p className="text-xs text-muted-foreground">
              {counts
                .map(([label, n]) => `${n} ${label.toLowerCase()}`)
                .join(" · ")}
              {data.checked
                ? data.checkedAt
                  ? ` · checked ${new Date(data.checkedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`
                  : ""
                : " · found by comparing names and parents; the server's nightly check isn't available yet"}
            </p>
            <ul className="mt-2 space-y-0.5 text-xs text-foreground">
              {data.issues.slice(0, SHOWN).map((i) => (
                <li key={`${i.categoryMappingId}-${i.issue}`}>
                  <span className="font-medium">
                    {i.unitName ?? "Unknown node"}
                  </span>
                  {": "}
                  {i.detail}
                </li>
              ))}
              {data.issues.length > SHOWN && (
                <li className="text-muted-foreground">
                  and {data.issues.length - SHOWN} more.
                </li>
              )}
            </ul>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Fix these with Re-link on the Categories screen before pulling or
              repairing, so nothing is moved to the wrong place.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {data.checked && (
            <PermissionGate
              require={{ resource: "moodle-sync", action: "pull" }}
            >
              <Button
                size="sm"
                variant="outline"
                onClick={() => void check()}
                disabled={runCheck.isPending}
              >
                {runCheck.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="size-3.5" aria-hidden />
                )}
                Check now
              </Button>
            </PermissionGate>
          )}
          {showLink && (
            <Button size="sm" asChild>
              <Link href="/admin/moodle-sync/categories">Open Categories</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
