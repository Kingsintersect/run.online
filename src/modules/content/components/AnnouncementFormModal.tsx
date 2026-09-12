"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CreateAnnouncementSchema,
  CATEGORY_SUGGESTIONS,
  type CreateAnnouncementValues,
  type CreateAnnouncementInputValues,
} from "../schemas"
import type { Announcement } from "../types"

const PRIORITIES: {
  value: CreateAnnouncementValues["priority"]
  label: string
}[] = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
]

interface AnnouncementFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (values: CreateAnnouncementValues) => Promise<void>
  announcement?: Announcement | null
}

export default function AnnouncementFormModal({
  open,
  onClose,
  onSubmit,
  announcement,
}: AnnouncementFormModalProps) {
  const isEdit = !!announcement
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateAnnouncementInputValues, unknown, CreateAnnouncementValues>(
    {
      resolver: zodResolver(CreateAnnouncementSchema),
      defaultValues: {
        title: announcement?.title ?? "",
        content: announcement?.content ?? "",
        category: announcement?.category ?? "",
        priority: announcement?.priority ?? "normal",
        expiresAt: announcement?.expiresAt?.slice(0, 10) ?? "",
        isPublished: announcement?.isPublished ?? false,
      },
    }
  )

  const priority = watch("priority")

  useEffect(() => {
    if (!open) return
    reset({
      title: announcement?.title ?? "",
      content: announcement?.content ?? "",
      category: announcement?.category ?? "",
      priority: announcement?.priority ?? "normal",
      expiresAt: announcement?.expiresAt?.slice(0, 10) ?? "",
      isPublished: announcement?.isPublished ?? false,
    })
  }, [open, reset, announcement])

  const handleFormSubmit = async (values: CreateAnnouncementValues) => {
    setSubmitting(true)
    try {
      await onSubmit(values)
      reset()
      onClose()
    } catch {
      // Error toast handled by the mutation hook
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Announcement" : "New Announcement"}
      subtitle={
        isEdit
          ? `Editing "${announcement.title}"`
          : "Compose a news, event, academic, or general notice"
      }
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit(handleFormSubmit)}
            disabled={submitting}
          >
            {submitting && <Loader2 size={14} className="mr-2 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Announcement"}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div className="space-y-1.5">
          <Label htmlFor="ann-title">Title</Label>
          <Input
            id="ann-title"
            placeholder="e.g. Registration Opens for New Session"
            {...register("title")}
          />
          {errors.title && (
            <p className="text-xs text-red-500">{errors.title.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ann-content">Content</Label>
          <Textarea
            id="ann-content"
            rows={5}
            placeholder="Full announcement text…"
            {...register("content")}
          />
          {errors.content && (
            <p className="text-xs text-red-500">{errors.content.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="ann-category">Category</Label>
            <Input
              id="ann-category"
              list="ann-category-suggestions"
              placeholder="e.g. academic"
              {...register("category")}
            />
            <datalist id="ann-category-suggestions">
              {CATEGORY_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {errors.category && (
              <p className="text-xs text-red-500">{errors.category.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select
              value={priority}
              onValueChange={(v) =>
                setValue("priority", v as CreateAnnouncementValues["priority"])
              }
            >
              <SelectTrigger aria-invalid={!!errors.priority}>
                <SelectValue placeholder="Select priority…" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ann-expires">Expires On (optional)</Label>
          <Input id="ann-expires" type="date" {...register("expiresAt")} />
          <p className="text-xs text-muted-foreground">
            Auto-hides from the public list after this date.
            {isEdit && " Once set, this can only be changed, not cleared."}
          </p>
        </div>

        {!isEdit && (
          <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                Publish Immediately
              </p>
              <p className="text-xs text-muted-foreground">
                Leave off to save as a draft — you can publish it later.
              </p>
            </div>
            <Switch
              checked={watch("isPublished") ?? false}
              onCheckedChange={(val) => setValue("isPublished", val)}
            />
          </div>
        )}
      </form>
    </Modal>
  )
}
