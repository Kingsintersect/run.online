"use client"

import type { AdmissionCycle, AdmissionCycleStatus } from "@/types/school"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Trash2,
  Pencil,
  DoorOpen,
  DoorClosed,
  FileText,
  CalendarDays,
  Users,
  Mail,
  Clock,
} from "lucide-react"

const STATUS_CONFIG: Record<
  AdmissionCycleStatus,
  {
    label: string
    variant: "default" | "secondary" | "destructive" | "outline"
  }
> = {
  OPEN: { label: "Open", variant: "default" },
  DRAFT: { label: "Draft", variant: "outline" },
  CLOSED: { label: "Closed", variant: "destructive" },
}

interface AdmissionCycleCardProps {
  cycle: AdmissionCycle
  sessionName: string
  onEdit: (cycle: AdmissionCycle) => void
  onDelete: (id: number) => void
  onToggleStatus: (id: number, status: AdmissionCycleStatus) => void
  canManage?: boolean
}

export function AdmissionCycleCard({
  cycle,
  sessionName,
  onEdit,
  onDelete,
  onToggleStatus,
  canManage = false,
}: AdmissionCycleCardProps) {
  const statusConfig = STATUS_CONFIG[cycle.status]
  const hasDeadline = !!cycle.application_end_date

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="size-4 text-primary" />
          {sessionName}
        </CardTitle>
        <CardDescription>
          {formatDate(cycle.application_start_date)} —{" "}
          {hasDeadline ? formatDate(cycle.application_end_date) : "No deadline"}
        </CardDescription>
        <CardAction>
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="size-3.5" />
            <span>
              {cycle.max_applications === 0
                ? "Unlimited"
                : `Max ${cycle.max_applications}`}{" "}
              applicants
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="size-3.5" />
            <span>
              Late apps{" "}
              {cycle.late_application_allowed
                ? `allowed (+₦${cycle.late_application_fee.toLocaleString()})`
                : "not allowed"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="size-3.5" />
            <span>
              {cycle.require_documents
                ? `${cycle.required_documents.length} doc(s) required`
                : "No documents"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="size-3.5" />
            <span className="truncate">{cycle.notification_email || "—"}</span>
          </div>
        </div>

        {/* Required documents */}
        {cycle.require_documents && cycle.required_documents.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {cycle.required_documents.map((doc) => (
              <Badge key={doc} variant="secondary" className="text-xs">
                {doc}
              </Badge>
            ))}
          </div>
        )}

        {/* Actions - only show if canManage */}
        {canManage && (
          <div className="flex items-center gap-2 pt-1">
            {cycle.status !== "OPEN" && (
              <Button
                size="sm"
                className="flex-1"
                onClick={() => onToggleStatus(cycle.id, "OPEN")}
              >
                <DoorOpen className="size-3.5" data-icon="inline-start" />
                Open Admissions
              </Button>
            )}
            {cycle.status === "OPEN" && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => onToggleStatus(cycle.id, "CLOSED")}
              >
                <DoorClosed className="size-3.5" data-icon="inline-start" />
                Close Admissions
              </Button>
            )}
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onEdit(cycle)}
              title="Edit cycle"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="destructive"
              size="icon-sm"
              onClick={() => onDelete(cycle.id)}
              title="Delete cycle"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
