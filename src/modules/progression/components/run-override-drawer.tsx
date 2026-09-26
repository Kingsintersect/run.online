"use client"

import { toast } from "sonner"
import { ArrowRight } from "lucide-react"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { useOverrideRunItem } from "../hooks/use-progression-mutations"
import { toProgressionApiError } from "../lib/errors"
import { OverridableOutcomeSchema } from "../schemas"
import { OutcomeBadge } from "./outcome-badge"
import { RunOverrideForm } from "./run-override-form"
import type { OverrideRunItemPayload, PromotionRunItem } from "../types"

interface RunOverrideDrawerProps {
  runId: number
  /** The item being overridden; `null` closes the drawer. */
  item: PromotionRunItem | null
  onClose: () => void
}

/** Side sheet to override one student's final outcome (reason required). */
export function RunOverrideDrawer({
  runId,
  item,
  onClose,
}: RunOverrideDrawerProps) {
  const override = useOverrideRunItem(runId)
  const error = override.error ? toProgressionApiError(override.error) : null

  function close() {
    override.reset()
    onClose()
  }

  function submit(payload: OverrideRunItemPayload) {
    if (!item) return
    override.mutate(
      { itemId: item.id, payload },
      {
        onSuccess: () => {
          toast.success(`Outcome updated for ${item.student.name}`)
          close()
        },
      }
    )
  }

  const current = item
    ? OverridableOutcomeSchema.safeParse(item.final_outcome)
    : null

  return (
    <Drawer
      direction="right"
      open={item !== null}
      onOpenChange={(open) => !open && close()}
    >
      <DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-md">
        <DrawerHeader>
          <DrawerTitle>Override outcome</DrawerTitle>
          <DrawerDescription>
            {item
              ? `${item.student.name}${item.student.matric_number ? ` · ${item.student.matric_number}` : ""}`
              : ""}
          </DrawerDescription>
        </DrawerHeader>

        {item && (
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4">
            <dl className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/40 p-3 text-sm dark:bg-muted/20">
              <div>
                <dt className="text-xs text-muted-foreground">
                  System outcome
                </dt>
                <dd className="mt-1">
                  <OutcomeBadge outcome={item.system_outcome} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  Current final outcome
                </dt>
                <dd className="mt-1">
                  <OutcomeBadge outcome={item.final_outcome} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Level</dt>
                <dd className="mt-1 inline-flex items-center gap-1">
                  {item.current_level.name}
                  <ArrowRight
                    className="size-3 text-muted-foreground"
                    aria-label="to"
                  />
                  {item.proposed_next_level?.name ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">CGPA</dt>
                <dd className="mt-1 tabular-nums">
                  {item.cgpa != null ? item.cgpa.toFixed(2) : "—"}
                </dd>
              </div>
              {item.is_overridden && item.override_reason && (
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">
                    Previous override
                    {item.overridden_by ? ` by ${item.overridden_by.name}` : ""}
                  </dt>
                  <dd className="mt-1 text-sm">{item.override_reason}</dd>
                </div>
              )}
            </dl>

            <RunOverrideForm
              key={item.id}
              idPrefix={`run-item-${item.id}`}
              defaultOutcome={current?.success ? current.data : undefined}
              submitLabel="Save override"
              pending={override.isPending}
              error={error}
              onSubmit={submit}
              onCancel={close}
            />
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}
