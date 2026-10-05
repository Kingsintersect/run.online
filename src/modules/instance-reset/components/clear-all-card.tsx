"use client"

import { Bomb } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useResetAvailability } from "../hooks/use-instance-reset"
import { useInstanceResetUiStore } from "../store/instance-reset-ui.store"
import { BlockedReason } from "./reset-badges"

/** "Clear everything (fresh start)": the factory reset, apart from the groups. */
export function ClearAllCard() {
  const { resetBlockedReason } = useResetAvailability()
  const openFlow = useInstanceResetUiStore((s) => s.openFlow)
  const blocked = resetBlockedReason !== null

  return (
    <section
      aria-labelledby="clear-all-heading"
      className="rounded-2xl border-2 border-red-300 bg-red-50/60 p-5 dark:border-red-900 dark:bg-red-950/20"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2
            id="clear-all-heading"
            className="text-lg font-semibold text-red-900 dark:text-red-100"
          >
            Factory reset
          </h2>
          <p className="mt-1 text-sm text-red-900/80 dark:text-red-200/80">
            Clears every group below: all people and activity data and the
            institution&apos;s own setup (academic structure, sessions, fees,
            hostels, venues, policies, admission cycles), plus everything the
            portal created in Moodle. Only the items under &quot;Always
            kept&quot; survive.
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          disabled={blocked}
          aria-describedby={blocked ? "clear-all-reason" : undefined}
          onClick={() => openFlow({ kind: "all" })}
          className="bg-red-600 px-4 text-white hover:bg-red-700 focus-visible:ring-red-500/50 dark:bg-red-700 dark:hover:bg-red-600"
        >
          <Bomb data-icon="inline-start" aria-hidden="true" />
          Clear everything (fresh start)
        </Button>
      </div>
      <BlockedReason
        id="clear-all-reason"
        reason={resetBlockedReason}
        className="mt-3"
      />
    </section>
  )
}
