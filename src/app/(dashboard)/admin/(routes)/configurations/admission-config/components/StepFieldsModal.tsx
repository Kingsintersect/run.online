"use client"

/* ------------------------------------------------------------------ */
/*  Field composer for one FORM-group admission step — Multi-Program   */
/*  Platform. Lets an admin add/edit/delete the AdmissionFormField      */
/*  rows a step asks, instead of a developer hardcoding a new step      */
/*  component. Not yet shipped by the backend — see                     */
/*  sandbox/multi-program-platform/BACKEND_REQUIRED_ENDPOINTS.md §2.    */
/* ------------------------------------------------------------------ */

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import Modal from "@/components/custom/Modal"
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
import EmptyState from "@/components/custom/EmptyState"
import { ConfirmDialog } from "@/components/confirm-dialog"
import {
  admissionFormFieldsApi,
  admissionFormFieldsKeys,
  admissionFormFieldsQueryOptions,
} from "@/app/(admission)/(routes)/admission-application-form/services/admission-form-fields.service"
import type {
  AdmissionFormField,
  AdmissionStepDefinition,
  CreateAdmissionFormFieldPayload,
  FormFieldType,
} from "@/types/admissionConfig"

const FIELD_TYPES: FormFieldType[] = [
  "TEXT",
  "TEXTAREA",
  "EMAIL",
  "PHONE",
  "NUMBER",
  "DATE",
  "SELECT",
  "MULTISELECT",
  "FILE",
  "REPEATING_GROUP",
]

interface StepFieldsModalProps {
  step: AdmissionStepDefinition | null
  onClose: () => void
}

const emptyDraft: CreateAdmissionFormFieldPayload = {
  key: "",
  label: "",
  type: "TEXT",
  order: 0,
  isRequired: false,
  helpText: null,
  options: null,
  validation: null,
  repeatable: false,
}

export default function StepFieldsModal({
  step,
  onClose,
}: StepFieldsModalProps) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<AdmissionFormField | "new" | null>(
    null
  )
  const [draft, setDraft] = useState<CreateAdmissionFormFieldPayload>(emptyDraft)
  const [optionsText, setOptionsText] = useState("")
  const [deleting, setDeleting] = useState<AdmissionFormField | null>(null)

  const { data: fields, isLoading } = useQuery({
    ...admissionFormFieldsQueryOptions.byStep(step?.id ?? 0),
    enabled: !!step,
  })

  const invalidate = () =>
    qc.invalidateQueries({
      queryKey: admissionFormFieldsKeys.byStep(step?.id ?? 0),
    })

  const createMutation = useMutation({
    mutationFn: (payload: CreateAdmissionFormFieldPayload) =>
      admissionFormFieldsApi.create(step!.id, payload),
    onSuccess: () => {
      toast.success("Field added")
      invalidate()
      setEditing(null)
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Failed to add field"),
  })

  const updateMutation = useMutation({
    mutationFn: ({
      fieldId,
      payload,
    }: {
      fieldId: number
      payload: CreateAdmissionFormFieldPayload
    }) => admissionFormFieldsApi.update(step!.id, fieldId, payload),
    onSuccess: () => {
      toast.success("Field updated")
      invalidate()
      setEditing(null)
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Failed to update field"),
  })

  const deleteMutation = useMutation({
    mutationFn: (fieldId: number) =>
      admissionFormFieldsApi.remove(step!.id, fieldId),
    onSuccess: () => {
      toast.success("Field removed")
      invalidate()
      setDeleting(null)
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Failed to remove field"),
  })

  const startNew = () => {
    setDraft({ ...emptyDraft, order: (fields?.length ?? 0) + 1 })
    setOptionsText("")
    setEditing("new")
  }

  const startEdit = (field: AdmissionFormField) => {
    setDraft(field)
    setOptionsText(
      (field.options ?? []).map((o) => `${o.value}:${o.label}`).join("\n")
    )
    setEditing(field)
  }

  const needsOptions = draft.type === "SELECT" || draft.type === "MULTISELECT"

  const handleSave = () => {
    if (!draft.key.trim() || !draft.label.trim()) {
      toast.error("Key and label are required")
      return
    }
    const options = needsOptions
      ? optionsText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [value, ...rest] = line.split(":")
            return { value: value.trim(), label: (rest.join(":") || value).trim() }
          })
      : null

    const payload: CreateAdmissionFormFieldPayload = { ...draft, options }
    if (editing === "new") {
      createMutation.mutate(payload)
    } else if (editing) {
      updateMutation.mutate({ fieldId: editing.id, payload })
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <Modal
        open={!!step}
        onClose={onClose}
        title={step ? `Fields — ${step.label}` : "Fields"}
        subtitle="What this step asks the applicant. Composed here instead of built by a developer."
        size="lg"
      >
        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Key</Label>
                <Input
                  value={draft.key}
                  disabled={editing !== "new"}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, key: e.target.value }))
                  }
                  placeholder="e.g. work_experience"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={draft.type}
                  onValueChange={(v) =>
                    setDraft((d) => ({ ...d, type: v as FormFieldType }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input
                value={draft.label}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, label: e.target.value }))
                }
                placeholder="What the applicant sees"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Help text (optional)</Label>
              <Input
                value={draft.helpText ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, helpText: e.target.value || null }))
                }
              />
            </div>

            {needsOptions && (
              <div className="space-y-1.5">
                <Label>Options (one per line, `value:label`)</Label>
                <textarea
                  value={optionsText}
                  onChange={(e) => setOptionsText(e.target.value)}
                  rows={4}
                  placeholder={"remote:Remote\nonsite:On-site"}
                  className="w-full resize-none rounded-xl border border-border bg-muted p-3 font-mono text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}

            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <p className="text-sm font-medium text-foreground">Required</p>
              <Switch
                checked={draft.isRequired}
                onCheckedChange={(v) =>
                  setDraft((d) => ({ ...d, isRequired: v }))
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setEditing(null)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 size={14} className="animate-spin" />}
                Save Field
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" className="gap-1.5" onClick={startNew}>
                <Plus size={14} /> Add Field
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-xl bg-muted/40"
                  />
                ))}
              </div>
            ) : !fields?.length ? (
              <EmptyState
                icon={Plus}
                title="No fields yet"
                description="This step has no questions configured — check back once the backend ships this (or add one now, it'll save the moment it does)."
              />
            ) : (
              <div className="divide-y divide-border/60 rounded-xl border border-border">
                {[...fields]
                  .sort((a, b) => a.order - b.order)
                  .map((field) => (
                    <div
                      key={field.id}
                      className="flex items-center justify-between gap-3 p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {field.label}
                          {field.isRequired && (
                            <span className="ml-1 text-destructive">*</span>
                          )}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {field.key} · {field.type.replace("_", " ")}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => startEdit(field)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleting(field)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        variant="destructive"
        title="Remove this field?"
        description={
          deleting
            ? `"${deleting.label}" will no longer be asked. Applications that already answered it keep their answer.`
            : ""
        }
        confirmLabel="Remove"
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting.id)
        }}
      />
    </>
  )
}
