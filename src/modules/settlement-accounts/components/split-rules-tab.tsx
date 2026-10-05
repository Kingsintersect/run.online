"use client"

import { useMemo, useState } from "react"
import { Plus, Split } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFeeTypes } from "@/modules/fee-management/hooks/use-fee-types"
import { useSettlementAccounts } from "../hooks/use-settlement-accounts"
import { useDeleteSplitRule } from "../hooks/use-settlement-mutations"
import { useSplitRules } from "../hooks/use-split-rules"
import { classifySettlementError } from "../lib/settlement-errors"
import type { SplitRule } from "../types"
import { ConfirmDeleteDialog } from "./confirm-delete-dialog"
import { EmptyState, ErrorRetry, ListSkeleton } from "./query-states"
import { SplitRuleCard } from "./split-rule-card"
import { SplitRuleDialog } from "./split-rule-dialog"

interface SplitRulesTabProps {
  majorProgramId: number
}

export function SplitRulesTab({ majorProgramId }: SplitRulesTabProps) {
  const { rules, isFallback, isLoading, isError, error, refetch } =
    useSplitRules(majorProgramId)
  const { accounts } = useSettlementAccounts(majorProgramId)
  const { data: feeTypesData } = useFeeTypes({ majorProgramId })
  const remove = useDeleteSplitRule()

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<SplitRule | null>(null)
  const [deleting, setDeleting] = useState<SplitRule | null>(null)

  // The backend may not honour `majorProgramId` on fee types yet (A12), so
  // also filter here: keep this program's fee types and unscoped ones.
  const feeTypes = useMemo(
    () =>
      (feeTypesData ?? []).filter(
        (ft) =>
          ft.majorProgramId == null || ft.majorProgramId === majorProgramId
      ),
    [feeTypesData, majorProgramId]
  )

  const accountLabels = useMemo(
    () => new Map(accounts.map((a) => [a.id, a.label])),
    [accounts]
  )

  function openEditor(rule: SplitRule | null) {
    setEditing(rule)
    setEditorOpen(true)
  }

  const deletingTitle = deleting
    ? deleting.feeTypeId
      ? (deleting.feeTypeName ?? `fee type #${deleting.feeTypeId}`)
      : "all fees of this program"
    : ""

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          How each payment is divided across this program&apos;s settlement
          accounts. A fee-type rule wins over the all-fees rule.
        </p>
        <Button onClick={() => openEditor(null)} className="gap-1.5">
          <Plus size={14} data-icon="inline-start" />
          New split rule
        </Button>
      </div>

      {isLoading ? (
        <ListSkeleton rows={2} />
      ) : isError ? (
        <ErrorRetry
          message={error?.message ?? "Couldn't load split rules."}
          onRetry={() => void refetch()}
        />
      ) : rules.length === 0 ? (
        <EmptyState
          icon={<Split size={18} aria-hidden />}
          title={
            isFallback
              ? "Split rules aren't available on the server yet"
              : "No split rules yet"
          }
          description={
            isFallback
              ? "Open New split rule to build a rule and preview how a payment would be divided; saving unlocks when the backend ships it."
              : "Without a rule, payments settle into the gateway's default account for this program."
          }
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {rules.map((rule) => (
            <SplitRuleCard
              key={rule.id}
              rule={rule}
              accountLabels={accountLabels}
              onEdit={() => openEditor(rule)}
              onDelete={() => {
                remove.reset()
                setDeleting(rule)
              }}
            />
          ))}
        </div>
      )}

      <SplitRuleDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        rule={editing}
        majorProgramId={majorProgramId}
        accounts={accounts}
        feeTypes={feeTypes}
        existingRules={rules}
        saveDisabled={isFallback}
      />

      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete split rule?"
        description={`The rule for ${deletingTitle} will be removed. New payments will fall back to the next matching rule, or the default account.`}
        confirmLabel="Delete rule"
        isPending={remove.isPending}
        errorMessage={
          remove.error
            ? classifySettlementError(remove.error, "delete-split-rule").message
            : null
        }
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }
      />
    </div>
  )
}
