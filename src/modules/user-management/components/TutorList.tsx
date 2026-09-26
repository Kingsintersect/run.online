"use client"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import {
  BookOpen,
  Plus,
  Eye,
  Pencil,
  Loader2,
  BookMarked,
  X,
  UploadCloud,
  UserX,
  UserCheck,
  MailPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import DataTable, { type Column } from "@/components/custom/DataTable"
import Avatar from "@/components/custom/Avatar"
import StatusBadge from "@/components/custom/StatusBadge"
import Modal from "@/components/custom/Modal"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { BulkImportTutorsModal } from "./BulkImportTutorsModal"
import { TutorCourseAssignForm } from "./tutor-course-assign-form"
import { isMajorProgramRequiredError } from "../lib/major-program-required"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { usePermissions } from "@/lib/permissions/usePermissions"
import {
  useMajorPrograms,
  useDepartments,
  useFaculties,
} from "@/hooks/useCourseStructure"
import { toast } from "sonner"
import { MajorProgramTabs } from "@/components/custom/MajorProgramTabs"
import {
  formatOfferingCategory,
  formatOfferingMeta,
} from "@/lib/academic/course-offering-enrichment"
import {
  useTutors,
  useCreateTutor,
  useUpdateTutor,
  useTutorCourses,
  useUnassignCourse,
  useSetUserActive,
  useResendTutorInvite,
} from "../hooks/useUsersData"
import type {
  Tutor,
  CreateTutorPayload,
  UpdateTutorPayload,
  TutorCourseRole,
} from "@/types/users"

// ── Permission constants ──────────────────────────────────────────────────────
// Defined once here so they're not scattered as inline objects across the file
const PERM = {
  maanageTutors: { resource: "tutors", action: "manage" },
  manageDepts: { resource: "departments", action: "manage" },
} as const

// ── Column definition (static — no permission logic needed here) ──────────────
const baseColumns: Column<Tutor & Record<string, unknown>>[] = [
  {
    key: "name",
    header: "Tutor",
    sortable: true,
    width: "28%",
    render: (row) => (
      <div className="flex items-center gap-3">
        <Avatar
          name={`${row.user.first_name ?? ""} ${row.user.last_name ?? ""}`}
          size="sm"
          status={row.user.is_active ? "online" : "offline"}
        />
        <div>
          <p className="text-sm font-medium text-foreground">
            {row.user.first_name} {row.user.last_name}
          </p>
          <p className="text-xs text-muted-foreground">{row.staff_number}</p>
        </div>
      </div>
    ),
  },
  { key: "designation", header: "Designation", sortable: true },
  { key: "department_name", header: "Department", sortable: true },
  { key: "faculty_name", header: "Faculty" },
  {
    key: "specialization",
    header: "Specialization",
    render: (row) => (
      <span className="text-xs">{row.specialization ?? "—"}</span>
    ),
  },
  {
    key: "is_active",
    header: "Status",
    align: "center",
    render: (row) => (
      <StatusBadge
        label={row.user.is_active ? "Active" : "Inactive"}
        variant={row.user.is_active ? "success" : "destructive"}
        dot
      />
    ),
  },
]

// ── Props ────────────────────────────────────────────────────────────────────
interface TutorsPageProps {
  canCreate?: boolean
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TutorsPage({
  canCreate: canCreateProp,
}: TutorsPageProps = {}) {
  const { can } = usePermissions()

  // Props take precedence; fall back to internally-derived values
  const canCreate = canCreateProp ?? can(PERM.maanageTutors)
  const canEdit = can(PERM.maanageTutors)
  const canManageCourses = can(PERM.manageDepts) // SUPER_ADMIN only

  const [majorProgramFilter, setMajorProgramFilter] = useState<number | null>(
    null
  )
  const { data: majorProgramsRes } = useMajorPrograms()
  const majorPrograms = (majorProgramsRes?.data ?? []).filter(
    (mp) => mp.isActive
  )
  const { data, isLoading } = useTutors({
    major_program_id: majorProgramFilter ?? undefined,
  })
  const createTutor = useCreateTutor()
  const updateTutor = useUpdateTutor()
  const setActive = useSetUserActive()
  const resendInvite = useResendTutorInvite()

  const [selected, setSelected] = useState<Tutor | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [editing, setEditing] = useState<Tutor | null>(null)
  const [coursesFor, setCoursesFor] = useState<Tutor | null>(null)
  const [statusTarget, setStatusTarget] = useState<Tutor | null>(null)

  // Actions column is built here because it needs the permission flags
  const actionsColumn: Column<Tutor & Record<string, unknown>> = {
    key: "actions",
    header: "",
    align: "center",
    width: "160px",
    render: (row) => (
      <div className="flex gap-1">
        {/* View — anyone who can see this page */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelected(row as unknown as Tutor)}
          title="View"
        >
          <Eye size={14} />
        </Button>

        {/* Edit — users:manage only */}
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(row as unknown as Tutor)}
            title="Edit"
          >
            <Pencil size={14} />
          </Button>
        )}

        {/* Deactivate / reactivate account — tutors:manage only */}
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            className={
              row.user.is_active
                ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
                : "text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-600"
            }
            onClick={() => setStatusTarget(row as unknown as Tutor)}
            title={
              row.user.is_active ? "Deactivate account" : "Reactivate account"
            }
          >
            {row.user.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
          </Button>
        )}

        {/* Resend onboarding email — tutors:manage only */}
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            disabled={
              resendInvite.isPending &&
              resendInvite.variables === (row as unknown as Tutor).id
            }
            onClick={() => resendInvite.mutate((row as unknown as Tutor).id)}
            title="Resend onboarding email (resets password)"
          >
            {resendInvite.isPending &&
            resendInvite.variables === (row as unknown as Tutor).id ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <MailPlus size={14} />
            )}
          </Button>
        )}

        {/* Course assignment — departments:manage (SUPER_ADMIN) only */}
        {canManageCourses && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCoursesFor(row as unknown as Tutor)}
            title="Manage Courses"
          >
            <BookMarked size={14} />
          </Button>
        )}
      </div>
    ),
  }

  return (
    <div className="mx-auto space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-500/10 p-2.5 dark:bg-violet-500/20">
              <BookOpen size={22} className="text-violet-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Tutors
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage tutors — bulk import a registrar&apos;s list, or assign
                the tutor role to a single existing user.
              </p>
            </div>
          </div>

          {/* Bulk Import + Add Tutor — both gated to tutors:manage. Bulk
              import is the primary path (registrar list → CSV → whole
              department onboarded at once); "Add Tutor" stays for the
              one-off case of promoting a single existing user. See
              sandbox/user/tutor_onboarding_workflow.md §1. */}
          <PermissionGate require={PERM.maanageTutors}>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowBulkImport(true)}
                className="gap-2"
              >
                <UploadCloud size={16} /> Bulk Import
              </Button>
              <Button onClick={() => setShowCreate(true)} className="gap-2">
                <Plus size={16} /> Add Tutor
              </Button>
            </div>
          </PermissionGate>
        </div>
      </motion.div>

      <MajorProgramTabs
        programs={majorPrograms}
        value={majorProgramFilter}
        onChange={setMajorProgramFilter}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        <DataTable
          data={(data?.data ?? []) as (Tutor & Record<string, unknown>)[]}
          columns={[...baseColumns, actionsColumn]}
          loading={isLoading}
          searchPlaceholder="Search by name, staff no, department…"
          searchExtractor={(row) =>
            `${row.user.first_name ?? ""} ${row.user.last_name ?? ""} ${row.staff_number} ${row.department_name} ${row.designation}`
          }
          rowKey="id"
          pageSize={10}
          emptyMessage="No tutors found"
        />
      </motion.div>

      {/* Detail modal — view only, no permission gate needed (button is always visible) */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={
          selected
            ? `${selected.user.first_name} ${selected.user.last_name}`
            : ""
        }
        subtitle={selected?.staff_number}
        size="lg"
      >
        {selected && <TutorDetail tutor={selected} />}
      </Modal>

      {/* Bulk Import modal — only reachable if canCreate, same gate as "Add Tutor" */}
      {canCreate && (
        <BulkImportTutorsModal
          open={showBulkImport}
          onClose={() => setShowBulkImport(false)}
        />
      )}

      {/* Create modal — only reachable if canCreate, but guard the open state too */}
      {canCreate && (
        <Modal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          title="Add New Tutor"
          subtitle="Enter an email and fill in tutor details"
          size="xl"
        >
          <CreateTutorForm
            onSubmit={async (payload) => {
              await createTutor.mutateAsync(payload)
              setShowCreate(false)
            }}
            isSubmitting={createTutor.isPending}
          />
        </Modal>
      )}

      {/* Edit modal — only reachable if canEdit */}
      {canEdit && (
        <Modal
          open={!!editing}
          onClose={() => setEditing(null)}
          title={
            editing
              ? `Edit — ${editing.user.first_name} ${editing.user.last_name}`
              : ""
          }
          subtitle={editing?.staff_number}
          size="xl"
        >
          {editing && (
            <EditTutorForm
              tutor={editing}
              onSubmit={async (payload) => {
                await updateTutor.mutateAsync({ id: editing.id, payload })
                setEditing(null)
              }}
              isSubmitting={updateTutor.isPending}
            />
          )}
        </Modal>
      )}

      {/* Courses modal — only reachable if canManageCourses */}
      {canManageCourses && (
        <Modal
          open={!!coursesFor}
          onClose={() => setCoursesFor(null)}
          title={
            coursesFor
              ? `Courses — ${coursesFor.user.first_name} ${coursesFor.user.last_name}`
              : ""
          }
          subtitle={coursesFor?.staff_number}
          size="xl"
        >
          {coursesFor && <TutorCoursesPanel tutor={coursesFor} />}
        </Modal>
      )}

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
            ? `${statusTarget.user.first_name} ${statusTarget.user.last_name} will lose access to the portal. Their tutor record and course assignments are kept, and the account can be reactivated at any time.`
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

// ── Detail view ───────────────────────────────────────────────────────────────
function TutorDetail({ tutor }: { tutor: Tutor }) {
  const fields = [
    {
      label: "Full Name",
      value: `${tutor.user.first_name} ${tutor.user.middle_name ?? ""} ${tutor.user.last_name}`,
    },
    { label: "Email", value: tutor.user.email },
    { label: "Phone", value: tutor.user.phone_number ?? "—" },
    { label: "Staff Number", value: tutor.staff_number },
    { label: "Department", value: tutor.department_name },
    { label: "Faculty", value: tutor.faculty_name },
    { label: "Designation", value: tutor.designation },
    { label: "Specialization", value: tutor.specialization ?? "—" },
    { label: "Office", value: tutor.office_location ?? "—" },
    { label: "Office Phone", value: tutor.office_phone ?? "—" },
    { label: "Qualifications", value: tutor.qualifications ?? "—" },
    { label: "Research Areas", value: tutor.research_areas ?? "—" },
    { label: "Bio", value: tutor.bio ?? "—" },
  ]

  return (
    <div className="max-h-[60vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {fields.map((f) => (
          <div
            key={f.label}
            className="flex justify-between border-b border-border/50 py-1.5"
          >
            <span className="text-xs text-muted-foreground">{f.label}</span>
            <span className="max-w-[60%] text-right text-xs font-medium text-foreground">
              {f.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Create form ───────────────────────────────────────────────────────────────
const inputCls =
  "w-full px-3 py-2 text-sm bg-muted border border-transparent rounded-xl outline-none " +
  "focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all " +
  "placeholder:text-muted-foreground text-foreground"

function CreateTutorForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (p: CreateTutorPayload) => Promise<void>
  isSubmitting: boolean
}) {
  const [form, setForm] = useState<CreateTutorPayload>({
    email: "",
    first_name: "",
    last_name: "",
    staff_number: "",
    faculty_id: undefined,
    department_id: undefined,
    major_program_id: undefined,
    designation: "",
  })
  // Cross-program teaching (2026-09-26): a lecturer can teach B.Sc,
  // postgraduate and business-school courses at the same time, so a tutor
  // isn't tied to one major program. Their major program comes from each
  // course they're assigned (Manage Courses). Here we only record the home
  // Faculty → Department they belong to, both optional.
  //
  // While the backend still requires majorProgramId (422), the Major program
  // field appears after a rejected create, with a note that it doesn't limit
  // teaching. It never shows once the backend drops the requirement.
  const [needsMajorProgram, setNeedsMajorProgram] = useState(false)

  const { data: facultiesRes } = useFaculties()
  const faculties = (facultiesRes?.data ?? []).filter((f) => f.isActive)
  const { data: departmentsRes, isFetching: loadingDepartments } =
    useDepartments(form.faculty_id || null)
  const departments = (departmentsRes?.data ?? []).filter((d) => d.isActive)

  const { data: majorProgramsRes } = useMajorPrograms()
  const majorPrograms = (majorProgramsRes?.data ?? []).filter(
    (mp) => mp.isActive
  )

  const update = (key: keyof CreateTutorPayload, value: string | number) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleFacultyChange = (value: number) =>
    setForm((prev) => ({
      ...prev,
      faculty_id: value || undefined,
      department_id: undefined,
    }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (needsMajorProgram && !form.major_program_id) {
      toast.error("Please select a major program.")
      return
    }
    // The mutation's own onError already shows a toast with the real reason
    // (e.g. "no user with this email exists yet").
    void onSubmit(form).catch((error: Error) => {
      if (isMajorProgramRequiredError(error)) setNeedsMajorProgram(true)
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-h-[60vh] space-y-4 overflow-y-auto pr-1"
    >
      <p className="text-xs text-muted-foreground">
        Enter the tutor&apos;s email. If no account exists yet, one will be
        created automatically. Tutors can teach in any major program: assign
        their courses from Manage Courses after creating them.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="tutor-email"
            className="mb-1 block text-xs font-medium text-foreground"
          >
            Email *
          </label>
          <input
            id="tutor-email"
            type="email"
            className={inputCls}
            placeholder="tutor@example.com"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </div>
        {needsMajorProgram && (
          <div>
            <label
              htmlFor="tutor-major-program"
              className="mb-1 block text-xs font-medium text-foreground"
            >
              Major program *
            </label>
            <select
              id="tutor-major-program"
              className={selectCls}
              required
              value={form.major_program_id || ""}
              onChange={(e) =>
                update("major_program_id", Number(e.target.value))
              }
              aria-describedby="tutor-major-program-note"
            >
              <option value="">Select a major program…</option>
              {majorPrograms.map((mp) => (
                <option key={mp.id} value={mp.id}>
                  {mp.name}
                </option>
              ))}
            </select>
            <p
              id="tutor-major-program-note"
              className="mt-1 text-[11px] text-amber-700 dark:text-amber-300"
            >
              The server still asks for one when creating a tutor. It
              doesn&apos;t limit what they can teach: courses from any major
              program can be assigned.
            </p>
          </div>
        )}
        {faculties.length > 0 && (
          <div>
            <label
              htmlFor="tutor-faculty"
              className="mb-1 block text-xs font-medium text-foreground"
            >
              Home faculty
            </label>
            <select
              id="tutor-faculty"
              className={selectCls}
              value={form.faculty_id || ""}
              onChange={(e) => handleFacultyChange(Number(e.target.value))}
            >
              <option value="">None</option>
              {faculties.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {form.faculty_id ? (
          <div>
            <label
              htmlFor="tutor-department"
              className="mb-1 block text-xs font-medium text-foreground"
            >
              Home department
            </label>
            {!loadingDepartments && departments.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                This faculty has no departments.
              </p>
            ) : (
              <select
                id="tutor-department"
                className={selectCls}
                value={form.department_id || ""}
                disabled={loadingDepartments}
                onChange={(e) =>
                  update("department_id", Number(e.target.value))
                }
              >
                <option value="">
                  {loadingDepartments ? "Loading…" : "None"}
                </option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : null}
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            Staff Number *
          </label>
          <input
            className={inputCls}
            placeholder="STF/2026/001"
            required
            value={form.staff_number}
            onChange={(e) => update("staff_number", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            First Name *
          </label>
          <input
            className={inputCls}
            required
            value={form.first_name}
            onChange={(e) => update("first_name", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            Last Name *
          </label>
          <input
            className={inputCls}
            required
            value={form.last_name}
            onChange={(e) => update("last_name", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            Middle Name
          </label>
          <input
            className={inputCls}
            value={form.middle_name ?? ""}
            onChange={(e) => update("middle_name", e.target.value)}
          />
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
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            Designation *
          </label>
          <input
            className={inputCls}
            placeholder="Senior Tutor"
            required
            value={form.designation}
            onChange={(e) => update("designation", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            Specialization
          </label>
          <input
            className={inputCls}
            value={form.specialization ?? ""}
            onChange={(e) => update("specialization", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            Office Location
          </label>
          <input
            className={inputCls}
            value={form.office_location ?? ""}
            onChange={(e) => update("office_location", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            Office Phone
          </label>
          <input
            className={inputCls}
            value={form.office_phone ?? ""}
            onChange={(e) => update("office_phone", e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          {isSubmitting && <Loader2 size={14} className="animate-spin" />}
          Create Tutor
        </Button>
      </div>
    </form>
  )
}

// ── Edit form ─────────────────────────────────────────────────────────────────
function EditTutorForm({
  tutor,
  onSubmit,
  isSubmitting,
}: {
  tutor: Tutor
  onSubmit: (p: UpdateTutorPayload) => Promise<void>
  isSubmitting: boolean
}) {
  const [form, setForm] = useState<UpdateTutorPayload>({
    designation: tutor.designation,
    specialization: tutor.specialization ?? "",
    office_location: tutor.office_location ?? "",
    office_phone: tutor.office_phone ?? "",
    qualifications: tutor.qualifications ?? "",
    research_areas: tutor.research_areas ?? "",
    bio: tutor.bio ?? "",
  })

  const update = (key: keyof UpdateTutorPayload, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void onSubmit(form).catch(() => {})
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-h-[60vh] space-y-4 overflow-y-auto pr-1"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            Designation
          </label>
          <input
            className={inputCls}
            value={form.designation ?? ""}
            onChange={(e) => update("designation", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            Specialization
          </label>
          <input
            className={inputCls}
            value={form.specialization ?? ""}
            onChange={(e) => update("specialization", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            Office Location
          </label>
          <input
            className={inputCls}
            value={form.office_location ?? ""}
            onChange={(e) => update("office_location", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            Office Phone
          </label>
          <input
            className={inputCls}
            value={form.office_phone ?? ""}
            onChange={(e) => update("office_phone", e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-foreground">
          Qualifications
        </label>
        <textarea
          className={inputCls}
          rows={2}
          value={form.qualifications ?? ""}
          onChange={(e) => update("qualifications", e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-foreground">
          Research Areas
        </label>
        <textarea
          className={inputCls}
          rows={2}
          value={form.research_areas ?? ""}
          onChange={(e) => update("research_areas", e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-foreground">
          Bio
        </label>
        <textarea
          className={inputCls}
          rows={2}
          value={form.bio ?? ""}
          onChange={(e) => update("bio", e.target.value)}
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

// ── Course assignment panel ───────────────────────────────────────────────────
const roleVariant: Record<TutorCourseRole, "success" | "info" | "purple"> = {
  primary: "success",
  assistant: "info",
  tutorial: "purple",
}

const selectCls =
  "w-full px-3 py-2 text-sm bg-muted border border-transparent rounded-xl outline-none " +
  "focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-foreground appearance-none"

function TutorCoursesPanel({ tutor }: { tutor: Tutor }) {
  const { data: coursesData, isLoading } = useTutorCourses(tutor.id)
  const unassignCourse = useUnassignCourse()

  const assignments = useMemo(() => coursesData?.data ?? [], [coursesData])
  const assignedOfferingIds = useMemo(
    () => new Set(assignments.map((a) => a.offering_id)),
    [assignments]
  )

  return (
    <div className="max-h-[60vh] space-y-6 overflow-y-auto pr-1">
      <TutorCourseAssignForm
        tutorId={tutor.id}
        assignedOfferingIds={assignedOfferingIds}
      />

      {/* Current assignments */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Assigned Courses ({assignments.length})
        </h3>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            Loading…
          </div>
        ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <BookOpen size={32} className="mb-2 opacity-40" />
            <p className="text-sm">No courses assigned yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {assignments.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {a.offering.course_code}
                    </span>
                    <StatusBadge label={a.role} variant={roleVariant[a.role]} />
                    <StatusBadge
                      label={a.offering.status}
                      variant={
                        a.offering.status === "OPEN" ? "success" : "default"
                      }
                    />
                    {a.offering.course_type && (
                      <StatusBadge
                        label={a.offering.course_type}
                        variant="default"
                      />
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {a.offering.course_title}
                    {formatOfferingMeta(a.offering) &&
                      ` · ${formatOfferingMeta(a.offering)}`}
                  </p>
                  {formatOfferingCategory(a.offering) && (
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80">
                      {formatOfferingCategory(a.offering)}
                    </p>
                  )}
                  {a.offering.programs.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {a.offering.programs.map((p) => (
                        <span
                          key={p.id}
                          className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                          title={`${p.name}${p.is_required ? " · required" : " · elective"}`}
                        >
                          {p.code}
                          {p.is_required ? "" : " (elective)"}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() =>
                    unassignCourse.mutate({
                      offering_id: a.offering_id,
                      tutor_id: a.tutor_id,
                    })
                  }
                  disabled={unassignCourse.isPending}
                  title="Unassign"
                >
                  <X size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
