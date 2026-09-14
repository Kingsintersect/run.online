"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CONDITION_OPERATORS } from "@/lib/admission-catalog"
import type {
  AdmissionFormField,
  ConditionOperator,
  FieldCondition,
} from "@/types/admissionConfig"

// `visibleWhen` editor — sandbox/dynamic-admission/SCHEMA_CHANGES.md §4. Builds
// one level: a list of rules joined by "all" or "any". Deeper nesting is
// accepted by the API but not authored here.

type LeafCondition = Extract<FieldCondition, { field: string }>
type JoinMode = "all" | "any"

interface ConditionBuilderProps {
  value: FieldCondition | null
  onChange: (value: FieldCondition | null) => void
  /** Questions this one may depend on — earlier in the form. */
  candidates: AdmissionFormField[]
  error?: string
  disabled?: boolean
}

const isLeaf = (condition: FieldCondition): condition is LeafCondition =>
  "field" in condition

function splitCondition(value: FieldCondition | null): {
  mode: JoinMode
  leaves: LeafCondition[]
  nested: boolean
} {
  if (!value) return { mode: "all", leaves: [], nested: false }
  if (isLeaf(value)) return { mode: "all", leaves: [value], nested: false }
  const mode: JoinMode = "all" in value ? "all" : "any"
  const items = "all" in value ? value.all : value.any
  return { mode, leaves: items.filter(isLeaf), nested: !items.every(isLeaf) }
}

function makeLeaf(
  field: string,
  op: ConditionOperator,
  raw: string
): LeafCondition {
  switch (op) {
    case "equals":
    case "notEquals":
      return { field, op, value: raw }
    case "in":
    case "notIn":
      return {
        field,
        op,
        value: raw
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean),
      }
    default:
      return { field, op }
  }
}

const rawValue = (leaf: LeafCondition): string =>
  "value" in leaf
    ? Array.isArray(leaf.value)
      ? leaf.value.join(", ")
      : String(leaf.value)
    : ""

const BOOLEAN_OPS: ConditionOperator[] = [
  "isTrue",
  "isFalse",
  "isNotEmpty",
  "isEmpty",
]

export function ConditionBuilder({
  value,
  onChange,
  candidates,
  error,
  disabled,
}: ConditionBuilderProps) {
  const initial = splitCondition(value)
  const [mode, setMode] = useState<JoinMode>(initial.mode)
  const enabled = value !== null
  const { leaves, nested } = splitCondition(value)

  const emit = (nextLeaves: LeafCondition[], nextMode: JoinMode = mode) => {
    if (nextLeaves.length === 0) {
      onChange(null)
      return
    }
    onChange(
      nextLeaves.length === 1
        ? nextLeaves[0]
        : nextMode === "all"
          ? { all: nextLeaves }
          : { any: nextLeaves }
    )
  }

  const blankLeaf = (): LeafCondition => {
    const first = candidates[0]
    return first?.type === "BOOLEAN"
      ? { field: first.key, op: "isTrue" }
      : { field: first?.key ?? "", op: "equals", value: "" }
  }

  if (candidates.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Add questions before this one to show it conditionally.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label htmlFor="condition-enabled" className="text-sm font-medium">
            Only show this question when…
          </Label>
          <p className="text-xs text-muted-foreground">
            A hidden question is never required, and its answer isn&apos;t
            saved.
          </p>
        </div>
        <Switch
          id="condition-enabled"
          checked={enabled}
          onCheckedChange={(on) => emit(on ? [blankLeaf()] : [])}
          disabled={disabled}
        />
      </div>

      {enabled && (
        <div className="space-y-2 rounded-lg border border-border p-3">
          {nested && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              This condition has nested groups set outside this editor — only
              its top-level rules are shown. Saving keeps just these rules.
            </p>
          )}
          {leaves.length > 1 && (
            <Select
              value={mode}
              onValueChange={(v) => {
                const nextMode: JoinMode = v === "any" ? "any" : "all"
                setMode(nextMode)
                emit(leaves, nextMode)
              }}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 w-56 text-xs" aria-label="Match">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All of these are true</SelectItem>
                <SelectItem value="any">Any of these is true</SelectItem>
              </SelectContent>
            </Select>
          )}

          {leaves.map((leaf, i) => {
            const target = candidates.find((c) => c.key === leaf.field)
            const ops = CONDITION_OPERATORS.filter((o) =>
              target?.type === "BOOLEAN"
                ? BOOLEAN_OPS.includes(o.op)
                : o.op !== "isTrue" && o.op !== "isFalse"
            )
            const needsValue =
              CONDITION_OPERATORS.find((o) => o.op === leaf.op)?.needsValue ??
              false
            const staticOptions = target?.options ?? []
            const setLeaf = (next: LeafCondition) =>
              emit(leaves.map((l, j) => (j === i ? next : l)))

            return (
              <div
                key={i}
                className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto]"
              >
                <Select
                  value={leaf.field}
                  onValueChange={(field) => {
                    const next = candidates.find((c) => c.key === field)
                    setLeaf(
                      next?.type === "BOOLEAN"
                        ? { field, op: "isTrue" }
                        : makeLeaf(
                            field,
                            leaf.op === "isTrue" || leaf.op === "isFalse"
                              ? "equals"
                              : leaf.op,
                            ""
                          )
                    )
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-8 text-xs" aria-label="Question">
                    <SelectValue placeholder="Question" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((c) => (
                      <SelectItem key={c.key} value={c.key}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={leaf.op}
                  onValueChange={(op) => {
                    const found = CONDITION_OPERATORS.find((o) => o.op === op)
                    if (found)
                      setLeaf(makeLeaf(leaf.field, found.op, rawValue(leaf)))
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-8 w-36 text-xs" aria-label="Rule">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ops.map((o) => (
                      <SelectItem key={o.op} value={o.op}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {needsValue ? (
                  (leaf.op === "equals" || leaf.op === "notEquals") &&
                  staticOptions.length > 0 ? (
                    <Select
                      value={rawValue(leaf)}
                      onValueChange={(v) =>
                        setLeaf(makeLeaf(leaf.field, leaf.op, v))
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-8 text-xs" aria-label="Value">
                        <SelectValue placeholder="Answer" />
                      </SelectTrigger>
                      <SelectContent>
                        {staticOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      className="h-8 text-xs"
                      value={rawValue(leaf)}
                      onChange={(e) =>
                        setLeaf(makeLeaf(leaf.field, leaf.op, e.target.value))
                      }
                      placeholder={
                        leaf.op === "in" || leaf.op === "notIn"
                          ? "value one, value two"
                          : "Answer"
                      }
                      disabled={disabled}
                      aria-label="Value"
                    />
                  )
                ) : (
                  <span />
                )}

                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => emit(leaves.filter((_, j) => j !== i))}
                  disabled={disabled}
                  aria-label="Remove rule"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            )
          })}

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => emit([...leaves, blankLeaf()])}
            disabled={disabled}
          >
            <Plus className="size-3.5" />
            Add rule
          </Button>
        </div>
      )}
    </div>
  )
}
