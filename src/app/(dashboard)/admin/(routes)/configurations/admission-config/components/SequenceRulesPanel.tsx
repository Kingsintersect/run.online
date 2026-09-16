"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  SEQUENCE_RULE_CATALOG,
  SEQUENCE_RULE_CODES,
  type PrecedenceRuleCode,
} from "@/lib/admission-catalog"
import {
  admissionStepsKeys,
  admissionStepsMutationOptions,
  admissionStepsQueryOptions,
} from "@/services/admissionStepsApi"

interface SequenceRulesPanelProps {
  open: boolean
  onClose: () => void
  /** null = the institution-default scope. */
  majorProgramId: number | null
  /** Display name for the header — e.g. "Institution Default" or a major program's own name. */
  scopeName: string
}

const SOURCE_LABEL: Record<"own" | "default" | "builtin", string> = {
  own: "Your setting",
  default: "Institution default",
  builtin: "Built-in",
}

/**
 * Sequence-rule toggles — sandbox/dynamic-sequence-rules/ (BACKEND_
 * DEVIATIONS_2026-09-14.md A24). Confirmed live 2026-09-16 — GET/PATCH/
 * DELETE /admissions/config/sequence-rules all shipped, per bruno/admission/
 * "Sequence Rules - List/Set/Clear.bru". Lets an admin turn each of the 6
 * Precedence rules off for one scope (a major program, or the institution
 * default every major program without its own override inherits from) —
 * e.g. "Certificate doesn't need a Decision stage before its Acceptance/
 * Tuition payment," the real bug that prompted this feature. The 3 Integrity
 * rules never appear here — permanently enforced everywhere, nothing to
 * toggle.
 */
export default function SequenceRulesPanel({
  open,
  onClose,
  majorProgramId,
  scopeName,
}: SequenceRulesPanelProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Sequence Rules — ${scopeName}`}
      subtitle="Turn off the ordering rules this scope doesn't need. A rule you've never touched here follows the institution default; the institution default falls back to the built-in behavior."
      size="lg"
    >
      {open && <Body majorProgramId={majorProgramId} onClose={onClose} />}
    </Modal>
  )
}

function Body({
  majorProgramId,
  onClose,
}: {
  majorProgramId: number | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useQuery(
    admissionStepsQueryOptions.sequenceRules(majorProgramId)
  )
  const setRuleMutation = useMutation(
    admissionStepsMutationOptions.setSequenceRule()
  )
  const clearRuleMutation = useMutation(
    admissionStepsMutationOptions.clearSequenceRule()
  )
  const isMutating = setRuleMutation.isPending || clearRuleMutation.isPending

  const invalidateAll = () =>
    queryClient.invalidateQueries({
      queryKey: [...admissionStepsKeys.all, "sequence-rules"],
    })

  const handleToggle = async (
    ruleCode: PrecedenceRuleCode,
    enabled: boolean
  ) => {
    try {
      await setRuleMutation.mutateAsync({ majorProgramId, ruleCode, enabled })
      await invalidateAll()
    } catch {
      toast.error("Couldn't save that rule change — try again.")
    }
  }

  const handleReset = async (id: number) => {
    try {
      await clearRuleMutation.mutateAsync(id)
      await invalidateAll()
    } catch {
      toast.error("Couldn't reset that rule — try again.")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading sequence rules…
      </div>
    )
  }

  if (isError || !data) {
    return (
      <p className="py-8 text-center text-sm text-destructive">
        Couldn&apos;t load sequence rules.
      </p>
    )
  }

  const byCode = new Map(data.map((r) => [r.ruleCode, r]))

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border rounded-xl border border-border">
        {SEQUENCE_RULE_CODES.map((code) => {
          const def = SEQUENCE_RULE_CATALOG[code]
          const resolved = byCode.get(code)
          const enabled = resolved?.enabled ?? true
          const source = resolved?.source ?? "builtin"
          return (
            <li key={code} className="flex items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {def.label}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {def.description}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {SOURCE_LABEL[source]}
                  </span>
                  {source === "own" && resolved?.id != null && (
                    <button
                      type="button"
                      onClick={() => handleReset(resolved.id as number)}
                      disabled={isMutating}
                      className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline disabled:opacity-50"
                    >
                      <RotateCcw className="size-2.5" />
                      Reset to default
                    </button>
                  )}
                </div>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={(checked) => handleToggle(code, checked)}
                disabled={isMutating}
                className="mt-1 shrink-0"
              />
            </li>
          )
        })}
      </ul>
      <div className="-mx-5 -mb-5 flex justify-end border-t border-border bg-muted/30 px-5 py-4">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  )
}
