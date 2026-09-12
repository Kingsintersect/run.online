"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAddGradingSchemeScale } from "../../hooks/use-grading-schemes"
import type { GradingScheme } from "../../types/grades.types"

interface AddScaleDialogProps {
  scheme: GradingScheme | null
  onClose: () => void
}

const EMPTY_FORM = {
  grade: "",
  minScore: "",
  maxScore: "",
  gradePoint: "",
  description: "",
}

export function AddScaleDialog({ scheme, onClose }: AddScaleDialogProps) {
  const addScale = useAddGradingSchemeScale()
  const [form, setForm] = useState(EMPTY_FORM)
  const isGpaScheme = scheme?.schemeType === "CREDIT_WEIGHTED_GPA"

  const close = () => {
    setForm(EMPTY_FORM)
    onClose()
  }

  const handleSubmit = async () => {
    if (!scheme) return
    if (!form.grade.trim() || !form.minScore || !form.maxScore) {
      toast.error("Grade, min score, and max score are required.")
      return
    }
    try {
      await addScale.mutateAsync({
        schemeId: scheme.id,
        payload: {
          grade: form.grade.trim(),
          minScore: Number(form.minScore),
          maxScore: Number(form.maxScore),
          gradePoint: form.gradePoint ? Number(form.gradePoint) : null,
          description: form.description.trim() || undefined,
        },
      })
      toast.success("Scale added")
      close()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add scale")
    }
  }

  return (
    <Modal
      open={!!scheme}
      onClose={close}
      title={scheme ? `Add Scale to "${scheme.name}"` : "Add Scale"}
      size="sm"
      footer={
        <>
          <Button
            variant="outline"
            onClick={close}
            disabled={addScale.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={addScale.isPending}>
            {addScale.isPending && (
              <Loader2
                className="size-4 animate-spin"
                data-icon="inline-start"
              />
            )}
            Add Scale
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="scale-grade">Grade</Label>
            <Input
              id="scale-grade"
              placeholder="A1"
              value={form.grade}
              onChange={(e) =>
                setForm((f) => ({ ...f, grade: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="scale-min">Min Score</Label>
            <Input
              id="scale-min"
              type="number"
              min={0}
              max={100}
              value={form.minScore}
              onChange={(e) =>
                setForm((f) => ({ ...f, minScore: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="scale-max">Max Score</Label>
            <Input
              id="scale-max"
              type="number"
              min={0}
              max={100}
              value={form.maxScore}
              onChange={(e) =>
                setForm((f) => ({ ...f, maxScore: e.target.value }))
              }
            />
          </div>
        </div>
        {isGpaScheme && (
          <div className="space-y-1.5">
            <Label htmlFor="scale-point">Grade Point</Label>
            <Input
              id="scale-point"
              type="number"
              step="0.01"
              min={0}
              max={5}
              className="max-w-32"
              value={form.gradePoint}
              onChange={(e) =>
                setForm((f) => ({ ...f, gradePoint: e.target.value }))
              }
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="scale-description">Description (optional)</Label>
          <Input
            id="scale-description"
            placeholder="Excellent"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
        </div>
      </div>
    </Modal>
  )
}
