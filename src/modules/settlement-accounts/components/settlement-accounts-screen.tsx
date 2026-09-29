"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Building2, Landmark, Split, Wallet } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSettlementAccounts } from "../hooks/use-settlement-accounts"
import { useSettlementPrograms } from "../hooks/use-settlement-programs"
import { useSplitRules } from "../hooks/use-split-rules"
import { BackendUnavailableBanner } from "./backend-unavailable-banner"
import { ProgramSwitcher } from "./program-switcher"
import { EmptyState, ErrorRetry, ListSkeleton } from "./query-states"
import { SettlementAccountsTab } from "./settlement-accounts-tab"
import { SplitRulesTab } from "./split-rules-tab"

/**
 * "Settlement & splits" — sandbox/payment-routing CONTRACT §4–§5. Shared by
 * /admin/finance/settlement and /manager/finance/settlement.
 */
export function SettlementAccountsScreen() {
  const {
    programs,
    isLoading: loadingPrograms,
    isError: programsError,
    refetch: refetchPrograms,
  } = useSettlementPrograms()
  const [selected, setSelected] = useState<number | null>(null)

  const majorProgramId =
    selected !== null && programs.some((p) => p.id === selected)
      ? selected
      : (programs[0]?.id ?? null)

  const { isFallback: accountsFallback } = useSettlementAccounts(majorProgramId)
  const { isFallback: rulesFallback } = useSplitRules(majorProgramId)

  return (
    <div className="space-y-6 p-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/20">
            <Wallet size={18} className="text-primary" aria-hidden />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Settlement &amp; splits
            </h1>
            <p className="text-sm text-muted-foreground">
              Each major program&apos;s settlement bank accounts, and how
              payments are split across them.
            </p>
          </div>
        </div>
      </motion.div>

      {loadingPrograms ? (
        <ListSkeleton rows={1} />
      ) : programsError ? (
        <ErrorRetry
          message="Couldn't load major programs."
          onRetry={() => void refetchPrograms()}
        />
      ) : majorProgramId === null ? (
        <EmptyState
          icon={<Building2 size={18} aria-hidden />}
          title="No major programs to configure"
          description="Settlement accounts are set per major program. None are active, or none are in your scope."
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-4"
        >
          <ProgramSwitcher
            programs={programs}
            value={majorProgramId}
            onChange={setSelected}
          />

          {(accountsFallback || rulesFallback) && <BackendUnavailableBanner />}

          <Tabs defaultValue="accounts">
            <TabsList>
              <TabsTrigger value="accounts" className="gap-1.5">
                <Landmark size={14} aria-hidden />
                Accounts
              </TabsTrigger>
              <TabsTrigger value="split-rules" className="gap-1.5">
                <Split size={14} aria-hidden />
                Split rules
              </TabsTrigger>
            </TabsList>
            <TabsContent value="accounts" className="pt-2">
              <SettlementAccountsTab
                majorProgramId={majorProgramId}
                programs={programs}
              />
            </TabsContent>
            <TabsContent value="split-rules" className="pt-2">
              <SplitRulesTab majorProgramId={majorProgramId} />
            </TabsContent>
          </Tabs>
        </motion.div>
      )}
    </div>
  )
}
