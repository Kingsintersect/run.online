"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCreateGradingScheme } from "../../hooks/use-grading-schemes"
import type { GradingSchemeType } from "../../types/grades.types"

interface GradingSchemeFormDialogProps {
  open: boolean
  onClose: () => void
}

const SCHEME_TYPE_LABEL: Record<GradingSchemeType, string> = {
  CREDIT_WEIGHTED_GPA: "Credit-Weighted GPA",
  SIMPLE_AVERAGE: "Simple Average (e.g. WAEC)",
  PASS_FAIL: "Pass / Fail",
}

const EMPTY_FORM = {
  name: "",
  schemeType: "CREDIT_WEIGHTED_GPA" as GradingSchemeType,
  passMark: "",
  caWeight: "",
  examWeight: "",
}

export function GradingSchemeFormDialog({
  open,
  onClose,
}: GradingSchemeFormDialogProps) {
  const createScheme = useCreateGradingScheme()
  const [form, setForm] = useState(EMPTY_FORM)
  const needsWeights = form.schemeType !== "CREDIT_WEIGHTED_GPA"

  const close = () => {
    setForm(EMPTY_FORM)
    onClose()
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Give the scheme a name.")
      return
    }
    try {
      await createScheme.mutateAsync({
        name: form.name.trim(),
        schemeType: form.schemeType,
        passMark: form.passMark ? Number(form.passMark) : null,
        caWeightPercent: form.caWeight ? Number(form.caWeight) : null,
        examWeightPercent: form.examWeight ? Number(form.examWeight) : null,
      })
      toast.success("Grading scheme created")
      close()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create grading scheme"
      )
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="New Grading Scheme"
      subtitle="A Program opts into this via its gradingSchemeId — leave a Program's unset to use the institution default."
      size="md"
      footer={
        <>
          <Button
            variant="outline"
            onClick={close}
            disabled={createScheme.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createScheme.isPending}>
            {createScheme.isPending && (
              <Loader2
                className="size-4 animate-spin"
                data-icon="inline-start"
              />
            )}
            Create Scheme
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="scheme-name">Name</Label>
          <Input
            id="scheme-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="WAEC 9-Point Scale"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Scheme Type</Label>
          <Select
            value={form.schemeType}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, schemeType: v as GradingSchemeType }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(
                Object.entries(SCHEME_TYPE_LABEL) as [
                  GradingSchemeType,
                  string,
                ][]
              ).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {needsWeights && (
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="scheme-pass-mark">Pass Mark</Label>
              <Input
                id="scheme-pass-mark"
                type="number"
                min={0}
                max={100}
                value={form.passMark}
                onChange={(e) =>
                  setForm((f) => ({ ...f, passMark: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scheme-ca-weight">CA Weight %</Label>
              <Input
                id="scheme-ca-weight"
                type="number"
                min={0}
                max={100}
                value={form.caWeight}
                onChange={(e) =>
                  setForm((f) => ({ ...f, caWeight: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scheme-exam-weight">Exam Weight %</Label>
              <Input
                id="scheme-exam-weight"
                type="number"
                min={0}
                max={100}
                value={form.examWeight}
                onChange={(e) =>
                  setForm((f) => ({ ...f, examWeight: e.target.value }))
                }
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
