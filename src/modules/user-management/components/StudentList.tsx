"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  GraduationCap,
  Eye,
  Pencil,
  Loader2,
  Download,
  UserX,
  UserCheck,
  Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import DataTable, { type Column } from "@/components/custom/DataTable"
import Avatar from "@/components/custom/Avatar"
import StatusBadge from "@/components/custom/StatusBadge"
import Modal from "@/components/custom/Modal"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { usePermissions } from "@/lib/permissions/usePermissions"
import { useLevels } from "@/hooks/useCourseStructure"
import {
  useStudents,
  useStudentLookupByMatric,
  useUpdateStudent,
  useSetUserActive,
} from "../hooks/useUsersData"
import type {
  Student,
  StudentStatus,
  UpdateStudentPayload,
  ModeOfStudy,
} from "@/types/users"

const statusVariant: Record<
  StudentStatus,
  "success" | "warning" | "destructive" | "info" | "default" | "orange"
> = {
  ACTIVE: "success",
  GRADUATED: "info",
  WITHDRAWN: "destructive",
  SUSPENDED: "warning",
  RUSTICATED: "destructive",
  DEFERRED: "orange",
}

// ── Permission constants ──────────────────────────────────────────────────────
// Defined once here so they're not scattered as inline objects across the file
// students:manage — "users:manage" never existed as a real permission
// (2026-09 permission audit); students:manage is the correct, real,
// already-granted-to-admin/dean equivalent.
const PERM = {
  manageStudents: { resource: "students", action: "manage" },
  manageDepts: { resource: "departments", action: "manage" },
} as const

// ── Props ─────────────────────────────────────────────────────────────────────
interface StudentsPageProps {
  canCreate?: boolean
  canExport?: boolean
}

const columns: Column<Student & Record<string, unknown>>[] = [
  {
    key: "name",
    header: "Student",
    sortable: true,
    width: "25%",
    render: (row) => (
      <div className="flex items-center gap-3">
        <Avatar
          name={`${row.user.first_name ?? ""} ${row.user.last_name ?? ""}`}
          size="sm"
        />
        <div>
          <p className="text-sm font-medium text-foreground">
            {row.user.first_name}{" "}
            {row.user.middle_name ? `${row.user.middle_name} ` : ""}
            {row.user.last_name}
          </p>
          <p className="text-xs text-muted-foreground">{row.matric_number}</p>
        </div>
      </div>
    ),
  },
  { key: "program_name", header: "Programme", sortable: true },
  { key: "department_name", header: "Department", sortable: true },
  {
    key: "current_level",
    header: "Level",
    align: "center",
    sortable: true,
    render: (row) => (
      <span className="text-sm font-medium">{row.current_level}L</span>
    ),
  },
  {
    key: "current_cgpa",
    header: "CGPA",
    align: "center",
    sortable: true,
    render: (row) => (
      <span className="text-sm">{row.current_cgpa?.toFixed(2) ?? "—"}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    align: "center",
    render: (row) => (
      <StatusBadge label={row.status} variant={statusVariant[row.status]} dot />
    ),
  },
  {
    key: "entry_mode",
    header: "Entry",
    align: "center",
    render: (row) => (
      <StatusBadge label={row.entry_mode.replace("_", " ")} variant="default" />
    ),
  },
]

export default function StudentsPage({
  canCreate: canCreateProp,
  canExport: canExportProp,
}: StudentsPageProps = {}) {
  const { can } = usePermissions()

  // Props take precedence; fall back to internally-derived values
  const canCreate = canCreateProp ?? can(PERM.manageStudents)
  const canExport = canExportProp ?? can(PERM.manageDepts)

  const { data, isLoading } = useStudents()
  const updateStudent = useUpdateStudent()
  const setActive = useSetUserActive()
  const [selected, setSelected] = useState<Student | null>(null)
  const [editing, setEditing] = useState<Student | null>(null)
  const [statusTarget, setStatusTarget] = useState<Student | null>(null)

  // Exact matric lookup — finds a student even if they're not on the loaded
  // page, then opens the detail modal on it.
  const [matricInput, setMatricInput] = useState("")
  const matricLookup = useStudentLookupByMatric()

  const runMatricLookup = () => {
    const v = matricInput.trim()
    if (!v || matricLookup.isPending) return
    matricLookup.mutate(v, {
      onSuccess: (res) => {
        setSelected(res.data)
        setMatricInput("")
      },
    })
  }

  return (
    <div className="mx-auto space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2.5 dark:bg-emerald-500/20">
              <GraduationCap size={22} className="text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Students
              </h1>
              <p className="text-sm text-muted-foreground">
                View and manage all student records. Students are created
                automatically after tuition payment.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Exact matric lookup */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                runMatricLookup()
              }}
              className="relative"
            >
              <Search
                size={14}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={matricInput}
                onChange={(e) => setMatricInput(e.target.value)}
                placeholder="Find by matric no…"
                aria-label="Find student by matric number"
                className="w-48 rounded-xl border border-transparent bg-muted py-2 pr-3 pl-8 text-sm text-foreground transition-all outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              {matricLookup.isPending && (
                <Loader2
                  size={14}
                  className="absolute top-1/2 right-3 -translate-y-1/2 animate-spin text-muted-foreground"
                />
              )}
            </form>

            {/* Export — departments:manage (SUPER_ADMIN only) */}
            {canExport && (
              <Button variant="outline" className="gap-2">
                <Download size={16} /> Export
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        <DataTable
          data={(data?.data ?? []) as (Student & Record<string, unknown>)[]}
          columns={[
            ...columns,
            {
              key: "actions",
              header: "",
              align: "center",
              width: "130px",
              render: (row) => (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelected(row as unknown as Student)}
                    title="View"
                  >
                    <Eye size={14} />
                  </Button>
                  {/* Edit + Deactivate — students:manage only */}
                  {canCreate && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(row as unknown as Student)}
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={
                          row.user.is_active
                            ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
                            : "text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-600"
                        }
                        onClick={() =>
                          setStatusTarget(row as unknown as Student)
                        }
                        title={
                          row.user.is_active
                            ? "Deactivate account"
                            : "Reactivate account"
                        }
                      >
                        {row.user.is_active ? (
                          <UserX size={14} />
                        ) : (
                          <UserCheck size={14} />
                        )}
                      </Button>
                    </>
                  )}
                </div>
              ),
            },
          ]}
          loading={isLoading}
          searchPlaceholder="Search by name, matric no, department…"
          searchExtractor={(row) =>
            `${row.user.first_name ?? ""} ${row.user.last_name ?? ""} ${row.matric_number} ${row.department_name} ${row.user.email}`
          }
          rowKey="id"
          pageSize={10}
          emptyMessage="No students found"
        />
      </motion.div>

      {/* Detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={
          selected
            ? `${selected.user.first_name} ${selected.user.last_name}`
            : ""
        }
        subtitle={selected?.matric_number}
        size="lg"
      >
        {selected && <StudentDetail student={selected} />}
      </Modal>

      {/* Edit modal */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={
          editing
            ? `Edit — ${editing.user.first_name} ${editing.user.last_name}`
            : ""
        }
        subtitle={editing?.matric_number}
        size="lg"
      >
        {editing && (
          <EditStudentForm
            student={editing}
            onSubmit={async (payload) => {
              await updateStudent.mutateAsync({ id: editing.id, payload })
              setEditing(null)
            }}
            isSubmitting={updateStudent.isPending}
          />
        )}
      </Modal>

      {/* Deactivate / reactivate confirm */}
      <ConfirmDialog
        open={!!statusTarget}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        variant={statusTarget?.user.is_active ? "destructive" : "default"}
        title={
          statusTarget?.user.is_active
            ? "Deactivate this account?"
            : "Reactivate this account?"
        }
        description={
          statusTarget?.user.is_active
            ? `${statusTarget.user.first_name} ${statusTarget.user.last_name} will lose access to the portal. Their student record and academic status (${statusTarget.status}) are unchanged, and the account can be reactivated at any time.`
            : `${statusTarget?.user.first_name} ${statusTarget?.user.last_name} will regain access to the portal.`
        }
        confirmLabel={
          statusTarget?.user.is_active ? "Deactivate" : "Reactivate"
        }
        onConfirm={async () => {
          if (!statusTarget) return
          await setActive.mutateAsync({
            id: statusTarget.user_id,
            isActive: !statusTarget.user.is_active,
          })
          setStatusTarget(null)
        }}
      />
    </div>
  )
}

function StudentDetail({ student }: { student: Student }) {
  const sections = [
    {
      title: "Personal Information",
      fields: [
        {
          label: "Full Name",
          value: `${student.user.first_name} ${student.user.middle_name ?? ""} ${student.user.last_name}`,
        },
        { label: "Email", value: student.user.email },
        { label: "Phone", value: student.user.phone_number ?? "—" },
        { label: "Gender", value: student.gender },
        {
          label: "Date of Birth",
          value: new Date(student.date_of_birth).toLocaleDateString(),
        },
        { label: "Nationality", value: student.nationality },
        { label: "State of Origin", value: student.state_of_origin },
        { label: "LGA", value: student.lga_of_origin },
      ],
    },
    {
      title: "Academic Information",
      fields: [
        { label: "Matric Number", value: student.matric_number },
        { label: "Programme", value: student.program_name },
        { label: "Department", value: student.department_name },
        { label: "Faculty", value: student.faculty_name },
        { label: "Level", value: `${student.current_level}L` },
        { label: "Entry Mode", value: student.entry_mode.replace("_", " ") },
        {
          label: "Mode of Study",
          value: student.mode_of_study.replace("_", " "),
        },
        { label: "CGPA", value: student.current_cgpa?.toFixed(2) ?? "—" },
        { label: "Status", value: student.status },
        {
          label: "Admission Date",
          value: new Date(student.admission_date).toLocaleDateString(),
        },
      ],
    },
    {
      title: "Contact & Guardian",
      fields: [
        { label: "Permanent Address", value: student.permanent_address },
        { label: "Contact Address", value: student.contact_address },
        { label: "Guardian Name", value: student.guardian_name },
        { label: "Guardian Phone", value: student.guardian_phone },
        { label: "Guardian Email", value: student.guardian_email ?? "—" },
      ],
    },
  ]

  return (
    <div className="max-h-[60vh] space-y-6 overflow-y-auto pr-1">
      {sections.map((section) => (
        <div key={section.title}>
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            {section.title}
          </h3>
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            {section.fields.map((f) => (
              <div
                key={f.label}
                className="flex justify-between border-b border-border/50 py-1.5 last:border-0"
              >
                <span className="text-xs text-muted-foreground">{f.label}</span>
                <span className="text-right text-xs font-medium text-foreground">
                  {f.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const STUDENT_STATUSES: StudentStatus[] = [
  "ACTIVE",
  "GRADUATED",
  "WITHDRAWN",
  "SUSPENDED",
  "RUSTICATED",
  "DEFERRED",
]
const STUDY_MODES: ModeOfStudy[] = [
  "FULL_TIME",
  "PART_TIME",
  "SANDWICH",
  "DISTANCE",
]

function EditStudentForm({
  student,
  onSubmit,
  isSubmitting,
}: {
  student: Student
  onSubmit: (p: UpdateStudentPayload) => Promise<void>
  isSubmitting: boolean
}) {
  const { data: levelsData } = useLevels()
  const levels = levelsData?.data ?? []

  const [form, setForm] = useState<UpdateStudentPayload>({
    current_level_id: student.current_level_id,
    mode_of_study: student.mode_of_study,
    status: student.status,
    contact_address: student.contact_address,
    phone_number: student.user.phone_number ?? "",
  })

  const update = (key: keyof UpdateStudentPayload, value: string | number) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  const inputCls =
    "w-full px-3 py-2 text-sm bg-muted border border-transparent rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground text-foreground"
  const selectCls = `${inputCls} appearance-none`

  return (
    <form
      onSubmit={handleSubmit}
      className="max-h-[60vh] space-y-4 overflow-y-auto pr-1"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            Current Level
          </label>
          <select
            className={selectCls}
            value={form.current_level_id ?? ""}
            onChange={(e) =>
              update("current_level_id", parseInt(e.target.value) || 0)
            }
          >
            <option value="" disabled>
              Select a level…
            </option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            Status
          </label>
          <select
            className={selectCls}
            value={form.status ?? ""}
            onChange={(e) => update("status", e.target.value)}
          >
            {STUDENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            Mode of Study
          </label>
          <select
            className={selectCls}
            value={form.mode_of_study ?? ""}
            onChange={(e) => update("mode_of_study", e.target.value)}
          >
            {STUDY_MODES.map((m) => (
              <option key={m} value={m}>
                {m.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            Phone Number
          </label>
          <input
            className={inputCls}
            value={form.phone_number ?? ""}
            onChange={(e) => update("phone_number", e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-foreground">
          Contact Address
        </label>
        <textarea
          className={inputCls}
          rows={2}
          value={form.contact_address ?? ""}
          onChange={(e) => update("contact_address", e.target.value)}
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          {isSubmitting && <Loader2 size={14} className="animate-spin" />}
          Save Changes
        </Button>
      </div>
    </form>
  )
}
