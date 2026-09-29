"use client"

import { useState } from "react"
import { Landmark, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSettlementAccounts } from "../hooks/use-settlement-accounts"
import {
  useDeleteSettlementAccount,
  useUpdateSettlementAccount,
} from "../hooks/use-settlement-mutations"
import type { SettlementProgramOption } from "../hooks/use-settlement-programs"
import { isAccountInSplitRule } from "../services/settlement-accounts.service"
import type { SettlementAccount } from "../types"
import { AddSettlementAccountDialog } from "./add-settlement-account-dialog"
import { ConfirmDeleteDialog } from "./confirm-delete-dialog"
import { EditSettlementAccountDialog } from "./edit-settlement-account-dialog"
import { EmptyState, ErrorRetry, ListSkeleton } from "./query-states"
import { SettlementAccountCard } from "./settlement-account-card"

interface SettlementAccountsTabProps {
  majorProgramId: number
  programs: SettlementProgramOption[]
}

export function SettlementAccountsTab({
  majorProgramId,
  programs,
}: SettlementAccountsTabProps) {
  const { accounts, isFallback, isLoading, isError, error, refetch } =
    useSettlementAccounts(majorProgramId)
  const update = useUpdateSettlementAccount()
  const remove = useDeleteSettlementAccount()

  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<SettlementAccount | null>(null)
  const [deleting, setDeleting] = useState<SettlementAccount | null>(null)

  const deleteError =
    remove.error && isAccountInSplitRule(remove.error)
      ? "This account is used in a split rule. Remove it from every split rule (or delete those rules) first, or deactivate the account instead."
      : null

  function openDelete(account: SettlementAccount) {
    remove.reset()
    setDeleting(account)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Bank accounts this major program&apos;s payments settle into.
        </p>
        <Button onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus size={14} data-icon="inline-start" />
          Add settlement account
        </Button>
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorRetry
          message={error?.message ?? "Couldn't load settlement accounts."}
          onRetry={() => void refetch()}
        />
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={<Landmark size={18} aria-hidden />}
          title={
            isFallback
              ? "Settlement accounts aren't available on the server yet"
              : "No settlement accounts yet"
          }
          description={
            isFallback
              ? "You can open the Add form to prepare and check an account's details; saving unlocks when the backend ships it."
              : "Add the bank account this major program's fees should settle into."
          }
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {accounts.map((account) => (
            <SettlementAccountCard
              key={account.id}
              account={account}
              onEdit={() => setEditing(account)}
              onDelete={() => openDelete(account)}
              isToggling={
                update.isPending && update.variables?.id === account.id
              }
              onToggleActive={(isActive) =>
                update.mutate({ id: account.id, payload: { isActive } })
              }
            />
          ))}
        </div>
      )}

      <AddSettlementAccountDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        programs={programs}
        defaultMajorProgramId={majorProgramId}
        saveDisabled={isFallback}
      />

      <EditSettlementAccountDialog
        account={editing}
        onOpenChange={(open) => !open && setEditing(null)}
      />

      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete settlement account?"
        description={
          deleting
            ? `"${deleting.label}" (${deleting.bankName}) will be removed. Payments already settled are not affected.`
            : ""
        }
        confirmLabel="Delete account"
        isPending={remove.isPending}
        errorMessage={deleteError}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }
      />
    </div>
  )
}
