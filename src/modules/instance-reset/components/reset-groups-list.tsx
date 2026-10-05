"use client"

import { QueryErrorState } from "@/components/query-error-state"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useResetAvailability,
  useResetGroups,
} from "../hooks/use-instance-reset"
import { useInstanceResetUiStore } from "../store/instance-reset-ui.store"
import { ResetGroupCard } from "./reset-group-card"

/** GET /groups (or the planned catalogue), one card per group, in order. */
export function ResetGroupsList() {
  const { groups, labelFor, source, isLoading, isError, error, refetch } =
    useResetGroups()
  const { resetBlockedReason } = useResetAvailability()
  const openFlow = useInstanceResetUiStore((s) => s.openFlow)

  return (
    <section aria-labelledby="reset-groups-heading" className="space-y-3">
      <div>
        <h2
          id="reset-groups-heading"
          className="text-lg font-semibold text-foreground"
        >
          Reset groups
        </h2>
        <p className="text-sm text-muted-foreground">
          Clearing a group also clears every row in other groups that depends on
          it; the preview lists exactly what will go before anything is deleted.
          {source === "planned" &&
            " Row counts appear once the reset service is live."}
        </p>
      </div>

      {isLoading ? (
        <div
          className="grid gap-4 lg:grid-cols-2"
          aria-busy="true"
          aria-label="Loading reset groups"
        >
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <QueryErrorState
          error={error}
          subject="the reset groups"
          onRetry={refetch}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map((g) => (
            <ResetGroupCard
              key={g.key}
              group={g}
              labelFor={labelFor}
              blockedReason={resetBlockedReason}
              onClear={(key) => openFlow({ kind: "group", key })}
            />
          ))}
        </div>
      )}
    </section>
  )
}
