"use client"

import { useMemo } from "react"
import { useAppStore } from "@/store"
import type { MajorProgramScopeEntry } from "@/types/school"

// Major-Program Scoping — sandbox/major-program-scoping/FRONTEND_IMPLEMENTATION_PLAN.md
// §7. Mirrors the caller's server-resolved authorization scope for UI
// convenience only (which filter/tab defaults to show, whether a "switch
// program" selector renders at all) — it is never a substitute for backend
// enforcement, which is the actual authorization boundary (see
// API_CONTRACTS.md §2). An absent `majorProgramScope` resolves to
// `isUnscoped: true` (README.md §0's governing rule).
export function useMajorProgramScope() {
  const scope = useAppStore((s) => s.user?.majorProgramScope)

  return useMemo(() => {
    const isUnscoped = scope === undefined || scope === "ALL"
    const scopedPrograms: MajorProgramScopeEntry[] = isUnscoped ? [] : scope
    const isMultiScoped = !isUnscoped && scopedPrograms.length > 1

    return {
      /** true for SUPER_ADMIN and for any account with no scoped grants. */
      isUnscoped,
      /** The specific major programs this user's grants are scoped to — empty when unscoped. */
      scopedPrograms,
      /** Whether a "switch program" selector should render at all — see the governing rule in README.md §0. */
      isMultiScoped,
    }
  }, [scope])
}
