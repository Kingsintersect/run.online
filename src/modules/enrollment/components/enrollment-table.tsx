"use client"

import { XCircle } from "lucide-react"
import DataTable, { type Column } from "@/components/custom/DataTable"
import StatusBadge from "@/components/custom/StatusBadge"
import type { EnrollmentRecord, EnrollmentStatus } from "../types"

type StatusVariant = "success" | "warning" | "destructive" | "info" | "default"

const STATUS_BADGE: Record<
  EnrollmentStatus,
  { label: string; variant: StatusVariant }
> = {
  ENROLLED: { label: "Enrolled", variant: "success" },
  DROPPED: { label: "Dropped", variant: "default" },
  WITHDRAWN: { label: "Withdrawn", variant: "warning" },
}

interface EnrollmentTableProps {
  data: EnrollmentRecord[]
  loading?: boolean
  canDrop?: boolean
  onDrop?: (enrollment: EnrollmentRecord) => void
}

export function EnrollmentTable({
  data,
  loading,
  canDrop = false,
  onDrop,
}: EnrollmentTableProps) {
  const columns: Column<EnrollmentRecord & Record<string, unknown>>[] = [
    {
      key: "studentName",
      header: "Student",
      sortable: true,
      render: (row) => (
        <div>
          <p className="text-xs font-medium text-foreground">
            {row.studentName}
          </p>
          <p className="font-mono text-[11px] text-muted-foreground">
            {row.studentMatric}
          </p>
        </div>
      ),
    },
    {
      key: "courseCode",
      header: "Course",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-mono text-xs font-semibold text-foreground">
            {row.courseCode}
          </p>
          <p className="max-w-48 truncate text-[11px] text-muted-foreground">
            {row.courseTitle}
          </p>
        </div>
      ),
    },
    { key: "creditUnits", header: "Units", align: "center" },
    {
      key: "lecturerName",
      header: "Lecturer",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.lecturerName ?? "—"}
        </span>
      ),
    },
    {
      key: "enrolledAt",
      header: "Enrolled",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.enrolledAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      render: (row) => <StatusBadge {...STATUS_BADGE[row.status]} dot />,
    },
    ...(canDrop
      ? [
          {
            key: "actions",
            header: "",
            align: "center" as const,
            width: "60px",
            render: (row: EnrollmentRecord) =>
              row.status === "ENROLLED" ? (
                <button
                  onClick={() => onDrop?.(row)}
                  title="Drop enrollment"
                  className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                >
                  <XCircle className="h-3.5 w-3.5" />
                </button>
              ) : null,
          },
        ]
      : []),
  ]

  return (
    <DataTable
      data={data as (EnrollmentRecord & Record<string, unknown>)[]}
      columns={columns}
      loading={loading}
      searchPlaceholder="Search by student, matric, or course…"
      searchExtractor={(row) =>
        `${row.studentName} ${row.studentMatric} ${row.courseCode} ${row.courseTitle}`
      }
      rowKey="id"
      pageSize={12}
      emptyMessage="No enrollments found"
    />
  )
}
