export const settlementKeys = {
  all: ["settlement-accounts"] as const,
  banks: () => [...settlementKeys.all, "banks"] as const,
  accountsAll: () => [...settlementKeys.all, "accounts"] as const,
  accounts: (majorProgramId: number) =>
    [...settlementKeys.accountsAll(), majorProgramId] as const,
  splitRulesAll: () => [...settlementKeys.all, "split-rules"] as const,
  splitRules: (majorProgramId: number) =>
    [...settlementKeys.splitRulesAll(), majorProgramId] as const,
}
