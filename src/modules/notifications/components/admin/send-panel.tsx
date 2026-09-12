"use client"

import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Send, Users, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import SectionCard from "@/components/custom/SectionCard"
import { useNotificationTemplates } from "../../hooks/use-notifications"
import {
  useSendNotification,
  useSendBulkNotification,
} from "../../hooks/use-notification-mutations"
import type { NotificationChannel } from "../../types"
import { cn } from "@/lib/utils"

// Form-level schemas (string inputs, parsed to numbers on submit) — the
// module's sendNotificationSchema/bulkNotificationSchema type the actual
// numeric payload sent to the API, not the raw HTML input values.
const singleSchema = z.object({
  userId: z
    .string()
    .min(1, "Enter a user ID")
    .regex(/^\d+$/, "Must be a valid number"),
  subject: z.string().min(3, "Subject required").max(200),
  body: z.string().min(5, "Body required"),
  channel: z.enum(["EMAIL", "SMS", "IN_APP", "PUSH"]),
})

const bulkSchema = z.object({
  userIds: z.string().min(1, "Enter at least one user ID"),
  subject: z.string().min(3, "Subject required").max(200),
  body: z.string().min(5, "Body required"),
  channel: z.enum(["EMAIL", "SMS", "IN_APP", "PUSH"]),
})

type SingleForm = z.infer<typeof singleSchema>
type BulkForm = z.infer<typeof bulkSchema>

const CHANNELS = [
  { value: "EMAIL", label: "Email" },
  { value: "SMS", label: "SMS" },
  { value: "IN_APP", label: "In-App" },
  { value: "PUSH", label: "Push" },
] as const

function TemplateHint({
  templates,
  onSelect,
}: {
  templates: {
    id: number
    name: string
    subject: string
    body: string
    channel: NotificationChannel
  }[]
  onSelect: (
    subject: string,
    body: string,
    channel: NotificationChannel
  ) => void
}) {
  if (templates.length === 0) return null
  return (
    <div className="space-y-1.5">
      <Label>Use a template (optional)</Label>
      <Select
        onValueChange={(id) => {
          const t = templates.find((t) => String(t.id) === id)
          if (t) onSelect(t.subject, t.body, t.channel)
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select template to pre-fill…" />
        </SelectTrigger>
        <SelectContent>
          {templates.map((t) => (
            <SelectItem key={t.id} value={String(t.id)}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Selecting a template will pre-fill subject, body and channel.
      </p>
    </div>
  )
}

export function SendPanel() {
  const [isBulk, setIsBulk] = useState(false)
  const { data } = useNotificationTemplates()
  const templates = data?.data ?? []
  const sendSingle = useSendNotification()
  const sendBulk = useSendBulkNotification()

  const {
    register: regSingle,
    handleSubmit: handleSingle,
    reset: resetSingle,
    setValue: setSingle,
    control: controlSingle,
    formState: { errors: singleErrors },
  } = useForm<SingleForm>({
    resolver: zodResolver(singleSchema),
    defaultValues: { userId: "", subject: "", body: "", channel: "EMAIL" },
  })
  const singleChannel = useWatch({ control: controlSingle, name: "channel" })

  const {
    register: regBulk,
    handleSubmit: handleBulk,
    reset: resetBulk,
    setValue: setBulk,
    control: controlBulk,
    formState: { errors: bulkErrors },
  } = useForm<BulkForm>({
    resolver: zodResolver(bulkSchema),
    defaultValues: { userIds: "", subject: "", body: "", channel: "EMAIL" },
  })
  const bulkChannel = useWatch({ control: controlBulk, name: "channel" })

  const onSingleSubmit = async (data: SingleForm) => {
    try {
      const res = await sendSingle.mutateAsync({
        userId: parseInt(data.userId, 10),
        subject: data.subject,
        body: data.body,
        channel: data.channel,
      })
      toast.success(
        `Notification sent to User #${data.userId} (status: ${res.data.status})`
      )
      resetSingle()
    } catch {
      // Error toast handled by useSendNotification's onError
    }
  }

  const onBulkSubmit = async (data: BulkForm) => {
    const userIds = data.userIds
      .split(/[\s,]+/)
      .map(Number)
      .filter(Boolean)
    if (userIds.length === 0) {
      toast.error("Enter at least one valid user ID")
      return
    }
    try {
      const res = await sendBulk.mutateAsync({
        userIds,
        subject: data.subject,
        body: data.body,
        channel: data.channel,
      })
      toast.success(
        `Sent to ${res.data.sent} user(s)${res.data.errors.length ? `, ${res.data.errors.length} failed` : ""}`
      )
      resetBulk()
    } catch {
      // Error toast handled by useSendBulkNotification's onError
    }
  }

  const fillSingleFromTemplate = (
    subject: string,
    body: string,
    channel: NotificationChannel
  ) => {
    setSingle("subject", subject)
    setSingle("body", body)
    setSingle("channel", channel)
  }

  const fillBulkFromTemplate = (
    subject: string,
    body: string,
    channel: NotificationChannel
  ) => {
    setBulk("subject", subject)
    setBulk("body", body)
    setBulk("channel", channel)
  }

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsBulk(false)}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all",
            !isBulk
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <Send size={14} />
          Single Recipient
        </button>
        <button
          onClick={() => setIsBulk(true)}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all",
            isBulk
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <Users size={14} />
          Bulk Send
        </button>
      </div>

      {/* Single form */}
      {!isBulk && (
        <SectionCard title="Send to Single User" icon={Send}>
          <div className="max-w-xl space-y-4">
            <TemplateHint
              templates={templates}
              onSelect={fillSingleFromTemplate}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="s-userId">User ID</Label>
                <Input
                  id="s-userId"
                  type="number"
                  placeholder="e.g. 101"
                  aria-invalid={!!singleErrors.userId}
                  {...regSingle("userId")}
                />
                {singleErrors.userId && (
                  <p className="text-xs text-destructive">
                    {singleErrors.userId.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Channel</Label>
                <Select
                  value={singleChannel}
                  onValueChange={(v) =>
                    setSingle("channel", v as NotificationChannel, {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger aria-invalid={!!singleErrors.channel}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="s-subject">Subject</Label>
              <Input
                id="s-subject"
                placeholder="Notification subject…"
                aria-invalid={!!singleErrors.subject}
                {...regSingle("subject")}
              />
              {singleErrors.subject && (
                <p className="text-xs text-destructive">
                  {singleErrors.subject.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="s-body">Body</Label>
              <Textarea
                id="s-body"
                rows={5}
                placeholder="Notification message…"
                aria-invalid={!!singleErrors.body}
                {...regSingle("body")}
              />
              {singleErrors.body && (
                <p className="text-xs text-destructive">
                  {singleErrors.body.message}
                </p>
              )}
            </div>

            <Button
              onClick={handleSingle(onSingleSubmit)}
              disabled={sendSingle.isPending}
              className="w-full sm:w-auto"
            >
              {sendSingle.isPending ? (
                <Loader2
                  className="size-4 animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <Send className="size-4" data-icon="inline-start" />
              )}
              Send Notification
            </Button>
          </div>
        </SectionCard>
      )}

      {/* Bulk form */}
      {isBulk && (
        <SectionCard title="Bulk Send" icon={Users}>
          <div className="max-w-xl space-y-4">
            <TemplateHint
              templates={templates}
              onSelect={fillBulkFromTemplate}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="b-userIds">User IDs</Label>
                <Input
                  id="b-userIds"
                  placeholder="e.g. 101, 102, 103"
                  aria-invalid={!!bulkErrors.userIds}
                  {...regBulk("userIds")}
                />
                {bulkErrors.userIds ? (
                  <p className="text-xs text-destructive">
                    {bulkErrors.userIds.message}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Comma or space separated user IDs
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Channel</Label>
                <Select
                  value={bulkChannel}
                  onValueChange={(v) =>
                    setBulk("channel", v as NotificationChannel)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="b-subject">Subject</Label>
              <Input
                id="b-subject"
                placeholder="Notification subject…"
                aria-invalid={!!bulkErrors.subject}
                {...regBulk("subject")}
              />
              {bulkErrors.subject && (
                <p className="text-xs text-destructive">
                  {bulkErrors.subject.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="b-body">Body</Label>
              <Textarea
                id="b-body"
                rows={5}
                placeholder="Notification message…"
                aria-invalid={!!bulkErrors.body}
                {...regBulk("body")}
              />
              {bulkErrors.body && (
                <p className="text-xs text-destructive">
                  {bulkErrors.body.message}
                </p>
              )}
            </div>

            <Button
              onClick={handleBulk(onBulkSubmit)}
              disabled={sendBulk.isPending}
              className="w-full sm:w-auto"
            >
              {sendBulk.isPending ? (
                <Loader2
                  className="size-4 animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <Users className="size-4" data-icon="inline-start" />
              )}
              Send to All
            </Button>
          </div>
        </SectionCard>
      )}
    </div>
  )
}
