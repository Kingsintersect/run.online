"use client"

import { useState } from "react"
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ConfirmDialog } from "@/components/confirm-dialog"
import {
  useGradeScales,
  useCreateGradeScale,
  useUpdateGradeScale,
  useDeleteGradeScale,
} from "../../hooks/use-grades-data"
import type { GradeScale, GradeScaleInput } from "../../types/grades.types"

// Flat institution grade-band table (`/results/grade-scales`) — the A/70-100/5.0
// bands the default GPA scheme scores against. Distinct from a Grading Scheme's
// own nested scales above.

const BLANK: GradeScaleInput = {
  grade: "",
  minScore: 0,
  maxScore: 0,
  gradePoint: 0,
  description: "",
}

function BandRow({
  value,
  onChange,
}: {
  value: GradeScaleInput
  onChange: (next: GradeScaleInput) => void
}) {
  return (
    <>
      <Input
        value={value.grade}
        maxLength={2}
        placeholder="A"
        onChange={(e) =>
          onChange({ ...value, grade: e.target.value.toUpperCase() })
        }
        className="h-8 w-14"
      />
      <Input
        type="number"
        value={value.minScore}
        onChange={(e) =>
          onChange({ ...value, minScore: Number(e.target.value) })
        }
        className="h-8 w-16"
      />
      <Input
        type="number"
        value={value.maxScore}
        onChange={(e) =>
          onChange({ ...value, maxScore: Number(e.target.value) })
        }
        className="h-8 w-16"
      />
      <Input
        type="number"
        step="0.1"
        value={value.gradePoint}
        onChange={(e) =>
          onChange({ ...value, gradePoint: Number(e.target.value) })
        }
        className="h-8 w-16"
      />
      <Input
        value={value.description ?? ""}
        maxLength={50}
        placeholder="Excellent"
        onChange={(e) => onChange({ ...value, description: e.target.value })}
        className="h-8 flex-1"
      />
    </>
  )
}

export function GradeBandsSection({ canManage }: { canManage: boolean }) {
  const { scales, loading } = useGradeScales()
  const createBand = useCreateGradeScale()
  const updateBand = useUpdateGradeScale()
  const deleteBand = useDeleteGradeScale()

  const [editingId, setEditingId] = useState<number | null>(null)
  const [draft, setDraft] = useState<GradeScaleInput>(BLANK)
  const [adding, setAdding] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<GradeScale | null>(null)

  const startEdit = (b: GradeScale) => {
    setEditingId(b.id)
    setDraft({
      grade: b.grade,
      minScore: b.minScore,
      maxScore: b.maxScore,
      gradePoint: b.gradePoint,
      description: b.description ?? "",
    })
  }

  const sorted = [...scales].sort((a, b) => b.minScore - a.minScore)

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Grade Bands</h3>
          <p className="text-xs text-muted-foreground">
            The default score → letter → grade-point mapping.
          </p>
        </div>
        {canManage && !adding && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => {
              setAdding(true)
              setDraft(BLANK)
              setEditingId(null)
            }}
          >
            <Plus className="size-3" data-icon="inline-start" /> New band
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-semibold">Grade</th>
              <th className="px-3 py-2 font-semibold">Min</th>
              <th className="px-3 py-2 font-semibold">Max</th>
              <th className="px-3 py-2 font-semibold">Point</th>
              <th className="px-3 py-2 font-semibold">Description</th>
              {canManage && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center">
                  <Loader2 className="mx-auto size-4 animate-spin" />
                </td>
              </tr>
            ) : (
              sorted.map((b) =>
                editingId === b.id ? (
                  <tr key={b.id} className="bg-primary/5">
                    <td colSpan={5} className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <BandRow value={draft} onChange={setDraft} />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Button
                          size="icon-sm"
                          disabled={updateBand.isPending}
                          onClick={() =>
                            updateBand.mutate(
                              { id: b.id, dto: draft },
                              { onSuccess: () => setEditingId(null) }
                            )
                          }
                        >
                          <Check size={13} />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                        >
                          <X size={13} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={b.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2 font-mono font-semibold text-foreground">
                      {b.grade}
                    </td>
                    <td className="px-3 py-2">{b.minScore}</td>
                    <td className="px-3 py-2">{b.maxScore}</td>
                    <td className="px-3 py-2">{b.gradePoint.toFixed(1)}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {b.description || "—"}
                    </td>
                    {canManage && (
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => startEdit(b)}
                          >
                            <Pencil size={13} />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => setDeleteTarget(b)}
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              )
            )}

            {adding && (
              <tr className="bg-primary/5">
                <td colSpan={5} className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <BandRow value={draft} onChange={setDraft} />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <Button
                      size="icon-sm"
                      disabled={createBand.isPending || !draft.grade}
                      onClick={() =>
                        createBand.mutate(draft, {
                          onSuccess: () => {
                            setAdding(false)
                            setDraft(BLANK)
                          },
                        })
                      }
                    >
                      <Check size={13} />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setAdding(false)}
                    >
                      <X size={13} />
                    </Button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Remove the "${deleteTarget?.grade}" band?`}
        description="This fails if any existing grade is already mapped to this band."
        confirmLabel="Remove"
        onConfirm={() => {
          if (deleteTarget) deleteBand.mutate(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </section>
  )
}
