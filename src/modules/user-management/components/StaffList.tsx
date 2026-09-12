"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Briefcase,
  Plus,
  Eye,
  Pencil,
  Loader2,
  UserX,
  UserCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import DataTable, { type Column } from "@/components/custom/DataTable"
import Avatar from "@/components/custom/Avatar"
import StatusBadge from "@/components/custom/StatusBadge"
import Modal from "@/components/custom/Modal"
import { ConfirmDialog } from "@/components/confirm-dialog"
import {
  useStaffList,
  useCreateStaff,
  useUpdateStaff,
  useStaffEligibleRoles,
  useSetUserActive,
} from "../hooks/useUsersData"
import { usePermissions } from "@/lib/permissions/usePermissions"
import type {
  Staff,
  CreateStaffPayload,
  UpdateStaffPayload,
} from "@/types/users"

// ── Permission constants ──────────────────────────────────────────────────────
const PERM = {
  manageDepts: { resource: "departments", action: "manage" },
} as const

const columns: Column<Staff & Record<string, unknown>>[] = [
  {
    key: "name",
    header: "Staff Member",
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
  { key: "job_title", header: "Job Title", sortable: true },
  { key: "designation", header: "Designation", sortable: true },
  {
    key: "department_name",
    header: "Department",
    render: (row) => (
      <span className="text-xs">{row.department_name ?? "N/A"}</span>
    ),
  },
  {
    key: "office_location",
    header: "Office",
    render: (row) => (
      <span className="text-xs">{row.office_location ?? "—"}</span>
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

export default function StaffPage() {
  const { can } = usePermissions()

  const canCreate = can(PERM.manageDepts) // Staff creation is SUPER_ADMIN only

  const { data, isLoading } = useStaffList()
  const createStaff = useCreateStaff()
  const updateStaff = useUpdateStaff()
  const setActive = useSetUserActive()
  const [selected, setSelected] = useState<Staff | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Staff | null>(null)
  const [statusTarget, setStatusTarget] = useState<Staff | null>(null)

  return (
    <div className="mx-auto space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/10 p-2.5 dark:bg-amber-500/20">
              <Briefcase size={22} className="text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Staff
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage non-academic staff — assign staff roles to existing
                users.
              </p>
            </div>
          </div>
          {/* Add Staff — departments:manage (SUPER_ADMIN) only */}
          {canCreate && (
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <Plus size={16} /> Add Staff
            </Button>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        <DataTable
          data={(data?.data ?? []) as (Staff & Record<string, unknown>)[]}
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
                    onClick={() => setSelected(row as unknown as Staff)}
                    title="View"
                  >
                    <Eye size={14} />
                  </Button>
                  {/* Edit + Deactivate — departments:manage (SUPER_ADMIN) only */}
                  {canCreate && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(row as unknown as Staff)}
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
                        onClick={() => setStatusTarget(row as unknown as Staff)}
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
          searchPlaceholder="Search by name, staff no, job title…"
          searchExtractor={(row) =>
            `${row.user.first_name ?? ""} ${row.user.last_name ?? ""} ${row.staff_number} ${row.designation} ${row.job_title}`
          }
          rowKey="id"
          pageSize={10}
          emptyMessage="No staff members found"
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
        subtitle={selected?.staff_number}
        size="lg"
      >
        {selected && <StaffDetail staff={selected} />}
      </Modal>

      {/* Create modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Add New Staff Member"
        subtitle="Select an existing user and fill in staff details"
        size="xl"
      >
        <CreateStaffForm
          onSubmit={async (payload) => {
            await createStaff.mutateAsync(payload)
            setShowCreate(false)
          }}
          isSubmitting={createStaff.isPending}
        />
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
        subtitle={editing?.staff_number}
        size="lg"
      >
        {editing && (
          <EditStaffForm
            staff={editing}
            onSubmit={async (payload) => {
              await updateStaff.mutateAsync({ id: editing.id, payload })
              setEditing(null)
            }}
            isSubmitting={updateStaff.isPending}
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
            ? `${statusTarget.user.first_name} ${statusTarget.user.last_name} will lose access to the portal. Their staff record is kept and the account can be reactivated at any time.`
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

function StaffDetail({ staff }: { staff: Staff }) {
  const fields = [
    {
      label: "Full Name",
      value: `${staff.user.first_name} ${staff.user.middle_name ?? ""} ${staff.user.last_name}`,
    },
    { label: "Email", value: staff.user.email },
    { label: "Phone", value: staff.user.phone_number ?? "—" },
    { label: "Staff Number", value: staff.staff_number },
    { label: "Job Title", value: staff.job_title },
    { label: "Designation", value: staff.designation },
    { label: "Department", value: staff.department_name ?? "N/A" },
    { label: "Office", value: staff.office_location ?? "—" },
    { label: "Office Phone", value: staff.office_phone ?? "—" },
    { label: "Joined", value: new Date(staff.created_at).toLocaleDateString() },
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
            <span className="text-right text-xs font-medium text-foreground">
              {f.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CreateStaffForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (p: CreateStaffPayload) => Promise<void>
  isSubmitting: boolean
}) {
  const { data: rolesData } = useStaffEligibleRoles()
  const eligibleRoles = rolesData?.data ?? []

  const [form, setForm] = useState<CreateStaffPayload>({
    user_id: 0,
    first_name: "",
    last_name: "",
    staff_number: "",
    designation: "",
    job_title: "",
    role_id: 0,
  })

  const update = (key: keyof CreateStaffPayload, value: string | number) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  const inputCls =
    "w-full px-3 py-2 text-sm bg-muted border border-transparent rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground text-foreground"
  const selectCls =
    "w-full px-3 py-2 text-sm bg-muted border border-transparent rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-foreground appearance-none"

  return (
    <form
      onSubmit={handleSubmit}
      className="max-h-[60vh] space-y-4 overflow-y-auto pr-1"
    >
      <p className="text-xs text-muted-foreground">
        Enter the existing User ID of the person you want to assign as staff.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            User ID *
          </label>
          <input
            type="number"
            className={inputCls}
            placeholder="e.g. 8"
            required
            value={form.user_id || ""}
            onChange={(e) => update("user_id", parseInt(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            Assign Role *
          </label>
          <select
            className={selectCls}
            required
            value={form.role_id || ""}
            onChange={(e) => update("role_id", parseInt(e.target.value) || 0)}
          >
            <option value="">Select a role…</option>
            {eligibleRoles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          {form.role_id > 0 && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {eligibleRoles.find((r) => r.id === form.role_id)?.description}
            </p>
          )}
        </div>
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
            Job Title *
          </label>
          <input
            className={inputCls}
            placeholder="Senior Accountant"
            required
            value={form.job_title}
            onChange={(e) => update("job_title", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">
            Designation *
          </label>
          <input
            className={inputCls}
            placeholder="Bursary Officer"
            required
            value={form.designation}
            onChange={(e) => update("designation", e.target.value)}
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
        <Button
          type="submit"
          disabled={isSubmitting || form.role_id === 0}
          className="gap-2"
        >
          {isSubmitting && <Loader2 size={14} className="animate-spin" />}
          Create Staff Member
        </Button>
      </div>
    </form>
  )
}

function EditStaffForm({
  staff,
  onSubmit,
  isSubmitting,
}: {
  staff: Staff
  onSubmit: (p: UpdateStaffPayload) => Promise<void>
  isSubmitting: boolean
}) {
  const [form, setForm] = useState<UpdateStaffPayload>({
    designation: staff.designation,
    job_title: staff.job_title,
    office_location: staff.office_location ?? "",
    office_phone: staff.office_phone ?? "",
  })

  const update = (key: keyof UpdateStaffPayload, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  const inputCls =
    "w-full px-3 py-2 text-sm bg-muted border border-transparent rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground text-foreground"

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
            Job Title
          </label>
          <input
            className={inputCls}
            value={form.job_title ?? ""}
            onChange={(e) => update("job_title", e.target.value)}
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
          Save Changes
        </Button>
      </div>
    </form>
  )
}
