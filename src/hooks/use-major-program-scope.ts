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

    // API_CONTRACTS.md §7: a per-record UI convenience check — never a
    // substitute for the server's own scope enforcement (§2). Unscoped
    // callers (incl. SUPER_ADMIN) are within scope of everything; a scoped
    // caller is within scope only when `majorProgramId` is non-null and
    // matches one of their granted programs. `null` (record's major program
    // unknown/unresolved) is treated as out of scope for a scoped caller,
    // never assumed in-scope.
    const withinScope = (majorProgramId: number | null): boolean => {
      if (isUnscoped) return true
      if (majorProgramId === null) return false
      return scopedPrograms.some((mp) => mp.id === majorProgramId)
    }

    return {
      /** true for SUPER_ADMIN and for any account with no scoped grants. */
      isUnscoped,
      /** The specific major programs this user's grants are scoped to — empty when unscoped. */
      scopedPrograms,
      /** Whether a "switch program" selector should render at all — see the governing rule in README.md §0. */
      isMultiScoped,
      /** Whether `majorProgramId` falls within this caller's scope — UI convenience only (see above). */
      withinScope,
    }
  }, [scope])
}
