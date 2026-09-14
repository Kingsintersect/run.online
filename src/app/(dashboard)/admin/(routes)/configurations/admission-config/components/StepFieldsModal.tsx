"use client"

/* ------------------------------------------------------------------ */
/*  Field composer for one FORM-group admission step.                  */
/*  Multi-Program Platform §B, extended by sandbox/dynamic-admission/:  */
/*  system (bound) fields, conditional visibility, option sources,      */
/*  answer rules and child fields for repeating groups.                 */
/* ------------------------------------------------------------------ */

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Eye, Lock, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import Modal from "@/components/custom/Modal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { admissionStepsQueryOptions } from "@/services/admissionStepsApi"
import {
  CHOICE_FIELD_TYPES,
  FIELD_TYPE_LABELS,
  OPTIONS_SOURCES,
  SYSTEM_FIELD_CATALOG,
  type SystemFieldDefinition,
} from "@/lib/admission-catalog"
import type { FormFieldDraft } from "@/schemas/admission-dynamic.schema"
import type {
  AdmissionFormField,
  AdmissionStepDefinition,
  CreateAdmissionFormFieldPayload,
  UpdateAdmissionFormFieldPayload,
} from "@/types/admissionConfig"
import { FieldEditor } from "./FieldEditor"

interface StepFieldsModalProps {
  step: AdmissionStepDefinition | null
  onClose: () => void
}

type EditorState =
  | {
      mode: "create"
      initial: FormFieldDraft
      lockedRequired: boolean
      candidates: AdmissionFormField[]
    }
  | {
      mode: "edit"
      field: AdmissionFormField
      initial: FormFieldDraft
      lockedRequired: boolean
      candidates: AdmissionFormField[]
    }

const byOrder = (a: AdmissionFormField, b: AdmissionFormField) =>
  a.order - b.order

/** The API may nest children or return them flat — normalise to one flat list. */
function flattenFields(fields: AdmissionFormField[]): AdmissionFormField[] {
  return fields.flatMap((field) => [
    field,
    ...(field.children ?? []).map((child) => ({
      ...child,
      parentFieldId: child.parentFieldId ?? field.id,
    })),
  ])
}

function draftFromField(field: AdmissionFormField): FormFieldDraft {
  return {
    key: field.key,
    label: field.label,
    type: field.type,
    order: field.order,
    isRequired: field.isRequired,
    helpText: field.helpText,
    placeholder: field.placeholder ?? null,
    width: field.width ?? "FULL",
    options: field.options,
    optionsSource: field.optionsSource ?? null,
    dependsOn: field.dependsOn ?? null,
    validation: field.validation,
    repeatable: field.repeatable,
    systemKey: field.systemKey ?? null,
    visibleWhen: field.visibleWhen ?? null,
    parentFieldId: field.parentFieldId ?? null,
    defaultValue: field.defaultValue ?? null,
  }
}

function toCreatePayload(
  draft: FormFieldDraft
): CreateAdmissionFormFieldPayload {
  return {
    key: draft.key,
    label: draft.label,
    type: draft.type,
    order: draft.order,
    isRequired: draft.isRequired,
    helpText: draft.helpText,
    placeholder: draft.placeholder ?? null,
    width: draft.width ?? "FULL",
    options: draft.options,
    optionsSource: draft.optionsSource ?? null,
    dependsOn: draft.dependsOn ?? null,
    validation: draft.validation,
    repeatable: draft.repeatable,
    systemKey: draft.systemKey ?? null,
    visibleWhen: draft.visibleWhen ?? null,
    parentFieldId: draft.parentFieldId ?? null,
    defaultValue: draft.defaultValue ?? null,
  }
}

function toUpdatePayload(
  draft: FormFieldDraft
): UpdateAdmissionFormFieldPayload {
  // key, type and systemKey are fixed after creation.
  const {
    key: _key,
    type: _type,
    systemKey: _systemKey,
    ...rest
  } = toCreatePayload(draft)
  return rest
}

export default function StepFieldsModal({
  step,
  onClose,
}: StepFieldsModalProps) {
  const qc = useQueryClient()
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [deleting, setDeleting] = useState<AdmissionFormField | null>(null)
  const [systemPicker, setSystemPicker] = useState("")

  const { data: fieldsData, isLoading } = useQuery({
    ...admissionFormFieldsQueryOptions.byStep(step?.id ?? 0),
    enabled: !!step,
  })
  const { data: systemFields = SYSTEM_FIELD_CATALOG } = useQuery(
    admissionStepsQueryOptions.systemFields()
  )

  const allFields = useMemo(
    () => flattenFields(fieldsData ?? []).filter((f) => f.isActive !== false),
    [fieldsData]
  )
  const topLevel = allFields.filter((f) => !f.parentFieldId).sort(byOrder)
  const childrenOf = (parentId: number) =>
    allFields.filter((f) => f.parentFieldId === parentId).sort(byOrder)

  const usedSystemKeys = new Set(
    allFields.flatMap((f) => (f.systemKey ? [f.systemKey] : []))
  )
  const availableSystemFields = [...systemFields]
    .filter((s) => !usedSystemKeys.has(s.systemKey))
    .sort(
      (a, b) =>
        Number(b.defaultStepKey === step?.key) -
        Number(a.defaultStepKey === step?.key)
    )

  const invalidate = () =>
    qc.invalidateQueries({
      queryKey: admissionFormFieldsKeys.byStep(step?.id ?? 0),
    })

  const createMutation = useMutation({
    mutationFn: (payload: CreateAdmissionFormFieldPayload) =>
      admissionFormFieldsApi.create(step!.id, payload),
    onSuccess: () => {
      toast.success("Question added")
      invalidate()
      setEditor(null)
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Failed to add question"),
  })

  const updateMutation = useMutation({
    mutationFn: ({
      fieldId,
      payload,
    }: {
      fieldId: number
      payload: UpdateAdmissionFormFieldPayload
    }) => admissionFormFieldsApi.update(step!.id, fieldId, payload),
    onSuccess: () => {
      toast.success("Question updated")
      invalidate()
      setEditor(null)
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Failed to update question"),
  })

  const deleteMutation = useMutation({
    mutationFn: (fieldId: number) =>
      admissionFormFieldsApi.remove(step!.id, fieldId),
    onSuccess: () => {
      toast.success("Question removed")
      invalidate()
      setDeleting(null)
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Failed to remove question"),
  })

  /** Questions a field at `order` (under `parentId`) may depend on — earlier ones. */
  const candidatesFor = (
    order: number,
    parentId: number | null,
    selfKey?: string
  ) =>
    allFields.filter(
      (f) =>
        f.key !== selfKey &&
        ((!f.parentFieldId && (parentId !== null || f.order < order)) ||
          (parentId !== null &&
            f.parentFieldId === parentId &&
            f.order < order))
    )

  const nextOrder = (parentId: number | null) =>
    (parentId === null ? topLevel : childrenOf(parentId)).reduce(
      (max, f) => Math.max(max, f.order),
      0
    ) + 1

  const uniqueKey = (base: string) => {
    const keys = new Set(allFields.map((f) => f.key))
    let key = base
    let i = 2
    while (keys.has(key)) key = `${base}_${i++}`
    return key
  }

  const startNew = (parentId: number | null) => {
    const order = nextOrder(parentId)
    setEditor({
      mode: "create",
      lockedRequired: false,
      candidates: candidatesFor(order, parentId),
      initial: {
        key: "",
        label: "",
        type: "TEXT",
        order,
        isRequired: false,
        helpText: null,
        placeholder: null,
        width: "FULL",
        options: null,
        optionsSource: null,
        dependsOn: null,
        validation: null,
        repeatable: false,
        systemKey: null,
        visibleWhen: null,
        parentFieldId: parentId,
        defaultValue: null,
      },
    })
  }

  const startSystem = (def: SystemFieldDefinition) => {
    const order = nextOrder(null)
    const dependsOn = def.dependsOnSystemKey
      ? (allFields.find((f) => f.systemKey === def.dependsOnSystemKey)?.key ??
        null)
      : null
    setEditor({
      mode: "create",
      lockedRequired: def.lockedRequired,
      candidates: candidatesFor(order, null),
      initial: {
        key: uniqueKey(def.suggestedKey),
        label: def.label,
        type: def.type,
        order,
        isRequired: def.lockedRequired,
        helpText: null,
        placeholder: null,
        width: "FULL",
        options: def.options ?? null,
        optionsSource: def.optionsSource,
        dependsOn,
        validation:
          def.type === "FILE"
            ? {
                accept: def.accept ?? "DOCUMENT",
                ...(def.multiple ? { multiple: true } : {}),
              }
            : null,
        repeatable: false,
        systemKey: def.systemKey,
        visibleWhen: null,
        parentFieldId: null,
        defaultValue: null,
      },
    })
  }

  const startEdit = (field: AdmissionFormField) =>
    setEditor({
      mode: "edit",
      field,
      lockedRequired: field.lockedRequired ?? false,
      candidates: candidatesFor(
        field.order,
        field.parentFieldId ?? null,
        field.key
      ),
      initial: draftFromField(field),
    })

  const handleSave = (draft: FormFieldDraft) => {
    if (!editor) return
    if (editor.mode === "create") {
      createMutation.mutate(toCreatePayload(draft))
    } else {
      updateMutation.mutate({
        fieldId: editor.field.id,
        payload: toUpdatePayload(draft),
      })
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending

  const renderRow = (field: AdmissionFormField, nested: boolean) => {
    const sourceLabel = field.optionsSource
      ? OPTIONS_SOURCES.find((s) => s.source === field.optionsSource)?.label
      : null
    return (
      <div
        key={field.id}
        className={
          nested
            ? "flex items-center justify-between gap-3 py-2.5 pr-3 pl-8"
            : "flex items-center justify-between gap-3 p-3"
        }
      >
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-foreground">
            {field.label}
            {(field.isRequired || field.lockedRequired) && (
              <span className="ml-1 text-destructive">*</span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-xs text-muted-foreground">
              {field.key} · {FIELD_TYPE_LABELS[field.type] ?? field.type}
            </span>
            {field.systemKey && (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <Lock size={10} data-icon="inline-start" />
                System
              </Badge>
            )}
            {field.visibleWhen && (
              <Badge variant="outline" className="gap-1 text-[10px]">
                <Eye size={10} data-icon="inline-start" />
                Conditional
              </Badge>
            )}
            {CHOICE_FIELD_TYPES.includes(field.type) && sourceLabel && (
              <Badge variant="outline" className="text-[10px]">
                {sourceLabel}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {field.type === "REPEATING_GROUP" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs"
              onClick={() => startNew(field.id)}
            >
              <Plus className="size-3.5" />
              Add child field
            </Button>
          )}
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => startEdit(field)}
            aria-label={`Edit ${field.label}`}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleting(field)}
            disabled={!!field.systemKey}
            title={
              field.systemKey
                ? "System fields can't be deleted"
                : "Remove question"
            }
            aria-label={`Remove ${field.label}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Modal
        open={!!step}
        onClose={() => {
          setEditor(null)
          onClose()
        }}
        title={
          step
            ? editor
              ? `${editor.mode === "create" ? "New question" : "Edit question"} — ${step.label}`
              : `Questions — ${step.label}`
            : "Questions"
        }
        subtitle="What this form step asks the applicant."
        size="lg"
      >
        {editor ? (
          <FieldEditor
            key={
              editor.mode === "edit"
                ? editor.field.id
                : `new-${editor.initial.systemKey ?? editor.initial.parentFieldId ?? "top"}`
            }
            initial={editor.initial}
            mode={editor.mode}
            lockedRequired={editor.lockedRequired}
            candidates={editor.candidates}
            saving={saving}
            onCancel={() => setEditor(null)}
            onSave={handleSave}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-end gap-2">
              {availableSystemFields.length > 0 && (
                <Select
                  value={systemPicker}
                  onValueChange={(value) => {
                    const def = availableSystemFields.find(
                      (s) => s.systemKey === value
                    )
                    setSystemPicker("")
                    if (def) startSystem(def)
                  }}
                >
                  <SelectTrigger
                    className="h-8 w-56 text-xs"
                    aria-label="Add a system field"
                  >
                    <SelectValue placeholder="Add system field…" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSystemFields.map((s) => (
                      <SelectItem key={s.systemKey} value={s.systemKey}>
                        {s.label}
                        {s.lockedRequired ? " (required)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => startNew(null)}
              >
                <Plus size={14} /> Add question
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
            ) : topLevel.length === 0 ? (
              <EmptyState
                icon={Plus}
                title="No questions yet"
                description="Add a question, or add one of the system fields this step normally asks."
              />
            ) : (
              <div className="divide-y divide-border/60 rounded-xl border border-border">
                {topLevel.map((field) => (
                  <div key={field.id}>
                    {renderRow(field, false)}
                    {field.type === "REPEATING_GROUP" &&
                      childrenOf(field.id).map((child) =>
                        renderRow(child, true)
                      )}
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
        title="Remove this question?"
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
