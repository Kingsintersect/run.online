"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import {
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  Building2,
  GitBranch,
  GraduationCap,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Power,
  Plus,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import StatusBadge from "@/components/custom/StatusBadge"
import { MajorProgramTabs } from "@/components/custom/MajorProgramTabs"
import { cn } from "@/lib/utils"
import {
  useFaculties,
  useFaculty,
  useDepartment,
  useAllDepartments,
  useAllPrograms,
  useMajorPrograms,
  useUpdateFaculty,
  useUpdateDepartment,
  useUpdateProgram,
} from "@/hooks/useCourseStructure"
import { useAcademicUnits } from "@/hooks/useAcademicStructure"
import { EmptyState } from "./EmptyState"
import { FacultyFormDialog } from "./FacultyFormDialog"
import { DepartmentFormDialog } from "./DepartmentFormDialog"
import { ProgramFormDialog } from "./ProgramFormDialog"
import { ReassignProgramDialog } from "./ReassignProgramDialog"
import type { Department, Faculty, Program } from "@/types/school"

type View =
  | { level: "faculties" }
  | { level: "faculty"; facultyId: number }
  | { level: "department"; facultyId: number; departmentId: number }

export function FacultiesPanel({ canManage = false }: { canManage?: boolean }) {
  const [view, setView] = useState<View>({ level: "faculties" })

  if (view.level === "faculties") {
    return (
      <FacultiesList
        canManage={canManage}
        onOpenFaculty={(id) => setView({ level: "faculty", facultyId: id })}
      />
    )
  }
  if (view.level === "department") {
    return (
      <DepartmentDetail
        canManage={canManage}
        facultyId={view.facultyId}
        departmentId={view.departmentId}
        onBack={() => setView({ level: "faculty", facultyId: view.facultyId })}
      />
    )
  }
  return (
    <FacultyDetail
      canManage={canManage}
      facultyId={view.facultyId}
      onBack={() => setView({ level: "faculties" })}
      onOpenDepartment={(deptId) =>
        setView({
          level: "department",
          facultyId: view.facultyId,
          departmentId: deptId,
        })
      }
    />
  )
}

// ── Level 1: Faculties list ─────────────────────────────────────────────────

function FacultiesList({
  canManage,
  onOpenFaculty,
}: {
  canManage: boolean
  onOpenFaculty: (id: number) => void
}) {
  const { data, isLoading } = useFaculties()
  const updateFaculty = useUpdateFaculty()
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [editing, setEditing] = useState<Faculty | null | undefined>(undefined)

  const allFaculties = data?.data ?? []

  // Major-Program Scoping — a Faculty has no majorProgramId of its own; it
  // "belongs" to a major program only through the programs its departments
  // contain (Faculty -> Department -> Program.majorProgramId). Resolve that
  // bottom-up from the already-fetched flat lists rather than adding a new
  // column — same derived-scope pattern as Fee Types and Admission Cycles.
  const { data: majorProgramsRes } = useMajorPrograms()
  const { data: departmentsRes } = useAllDepartments()
  const { data: programsRes } = useAllPrograms()
  const majorPrograms = useMemo(
    () => (majorProgramsRes?.data ?? []).filter((mp) => mp.isActive),
    [majorProgramsRes]
  )
  const [majorProgramFilter, setMajorProgramFilter] = useState<number | null>(
    null
  )
  const facultyIdsByMajorProgram = useMemo(() => {
    const facultyIdByDeptId = new Map(
      (departmentsRes?.data ?? []).map((d) => [d.id, d.facultyId])
    )
    const map = new Map<number, Set<number>>()
    for (const program of programsRes?.data ?? []) {
      if (program.majorProgramId == null || !program.departmentId) continue
      const facultyId = facultyIdByDeptId.get(program.departmentId)
      if (!facultyId) continue
      if (!map.has(program.majorProgramId)) {
        map.set(program.majorProgramId, new Set())
      }
      map.get(program.majorProgramId)!.add(facultyId)
    }
    return map
  }, [departmentsRes, programsRes])
  const faculties = majorProgramFilter
    ? allFaculties.filter((f) =>
        facultyIdsByMajorProgram.get(majorProgramFilter)?.has(f.id)
      )
    : allFaculties

  // PATCH `{isActive}` — a reversible on/off toggle. DELETE only ever
  // deactivates, so it can't back this button.
  const handleToggleActive = async (faculty: Faculty) => {
    const nextActive = !faculty.isActive
    setTogglingId(faculty.id)
    try {
      await updateFaculty.mutateAsync({
        id: faculty.id,
        payload: { isActive: nextActive },
      })
      toast.success(
        `${faculty.name} ${nextActive ? "activated" : "deactivated"}`
      )
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : `Failed to ${nextActive ? "activate" : "deactivate"} faculty`
      )
    } finally {
      setTogglingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Faculties</h2>
          <p className="text-sm text-muted-foreground">
            Click a faculty to manage its departments, programs, and staff.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setEditing(null)}>
            <Plus className="size-4" data-icon="inline-start" />
            New Faculty
          </Button>
        )}
      </div>

      <MajorProgramTabs
        programs={majorPrograms}
        value={majorProgramFilter}
        onChange={setMajorProgramFilter}
      />

      {faculties.length === 0 &&
      majorProgramFilter &&
      allFaculties.length > 0 ? (
        <EmptyState
          icon={Building2}
          title="No faculties under this major program"
          description="No program here has been assigned to this major program yet, so no faculty qualifies. Switch tabs, or assign a program to it under Programs."
        />
      ) : faculties.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No faculties yet"
          description="Create your first faculty to start building the academic structure."
          action={
            canManage ? (
              <Button onClick={() => setEditing(null)}>
                <Plus className="size-4" data-icon="inline-start" />
                Create First Faculty
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {faculties.map((faculty, index) => (
            <motion.div
              key={faculty.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Building2 size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {faculty.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {faculty.code}
                        </p>
                      </div>
                    </div>
                    <StatusBadge
                      label={faculty.isActive ? "Active" : "Inactive"}
                      variant={faculty.isActive ? "success" : "destructive"}
                      dot
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      className="flex-1"
                      size="sm"
                      onClick={() => onOpenFaculty(faculty.id)}
                    >
                      Departments{" "}
                      <ArrowRight className="size-3.5" data-icon="inline-end" />
                    </Button>
                    {canManage && (
                      <>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => setEditing(faculty)}
                          title="Edit faculty"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => handleToggleActive(faculty)}
                          disabled={togglingId === faculty.id}
                          title={
                            faculty.isActive
                              ? "Deactivate faculty"
                              : "Activate faculty"
                          }
                          aria-label={
                            faculty.isActive
                              ? `Deactivate ${faculty.name}`
                              : `Activate ${faculty.name}`
                          }
                          aria-pressed={faculty.isActive}
                        >
                          {togglingId === faculty.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Power
                              className={cn(
                                "size-3.5",
                                faculty.isActive
                                  ? "text-destructive"
                                  : "text-emerald-600 dark:text-emerald-400"
                              )}
                            />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <FacultyFormDialog
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        faculty={editing}
      />
    </div>
  )
}

// ── Level 2: One faculty's departments ──────────────────────────────────────

function FacultyDetail({
  canManage,
  facultyId,
  onBack,
  onOpenDepartment,
}: {
  canManage: boolean
  facultyId: number
  onBack: () => void
  onOpenDepartment: (departmentId: number) => void
}) {
  const { data, isLoading } = useFaculty(facultyId)
  const updateDept = useUpdateDepartment()
  const updateProgram = useUpdateProgram()
  const [togglingKey, setTogglingKey] = useState<string | null>(null)
  const [editingFaculty, setEditingFaculty] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null | undefined>(
    undefined
  )
  const [editingDirectProgram, setEditingDirectProgram] = useState<
    Program | null | undefined
  >(undefined)
  const [reassigning, setReassigning] = useState<Program | null>(null)

  const faculty = data?.data
  const departments = faculty?.departments ?? []

  // Programs attached straight to this faculty, no department in between.
  // Program has no facultyId of its own — this link only exists via the
  // AcademicUnit tree's parentAcademicUnitId, so it has to be cross-referenced
  // client-side rather than filtered server-side.
  const { data: unitsData } = useAcademicUnits({ rootsOnly: true })
  const { data: allProgramsData } = useAllPrograms()
  const facultyUnit = (unitsData?.data ?? []).find(
    (u) => u.linkedEntity?.type === "faculty" && u.linkedEntity.id === facultyId
  )
  const directPrograms = (allProgramsData?.data ?? []).filter(
    (p) =>
      p.departmentId === null &&
      facultyUnit !== undefined &&
      p.parentAcademicUnitId === facultyUnit.id
  )

  // PATCH `{isActive}` — reversible on/off toggles (bruno/academic/
  // Departments - Update.bru, Programs - Update.bru). The backend doesn't
  // document a cascade, so none is assumed here.
  const handleToggleDept = async (dept: Department) => {
    const nextActive = !dept.isActive
    setTogglingKey(`dept-${dept.id}`)
    try {
      await updateDept.mutateAsync({
        id: dept.id,
        payload: { isActive: nextActive },
      })
      toast.success(`${dept.name} ${nextActive ? "activated" : "deactivated"}`)
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : `Failed to ${nextActive ? "activate" : "deactivate"} department`
      )
    } finally {
      setTogglingKey(null)
    }
  }

  const handleToggleDirectProgram = async (program: Program) => {
    const nextActive = !program.isActive
    setTogglingKey(`program-${program.id}`)
    try {
      await updateProgram.mutateAsync({
        id: program.id,
        payload: { isActive: nextActive },
      })
      toast.success(
        `${program.name} ${nextActive ? "activated" : "deactivated"}`
      )
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : `Failed to ${nextActive ? "activate" : "deactivate"} program`
      )
    } finally {
      setTogglingKey(null)
    }
  }

  if (isLoading || !faculty) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          title="Back to faculties"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">
            Faculties / {faculty.name}
          </p>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">
              {faculty.name}
            </h2>
            <StatusBadge
              label={faculty.isActive ? "Active" : "Inactive"}
              variant={faculty.isActive ? "success" : "destructive"}
              dot
            />
          </div>
        </div>
        {canManage && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditingFaculty(true)}
          >
            <Pencil className="size-3.5" data-icon="inline-start" /> Edit
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="grid gap-3 pt-6 text-sm sm:grid-cols-2">
          {faculty.description && (
            <p className="text-muted-foreground sm:col-span-2">
              {faculty.description}
            </p>
          )}
          {faculty.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail size={13} /> {faculty.email}
            </div>
          )}
          {faculty.phoneNumber && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone size={13} /> {faculty.phoneNumber}
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users size={13} /> Dean:{" "}
            {faculty.deanUserId
              ? `User #${faculty.deanUserId}`
              : "Not assigned"}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Departments</h3>
        {canManage && (
          <Button size="sm" onClick={() => setEditingDept(null)}>
            <Plus className="size-3.5" data-icon="inline-start" /> Add
            Department
          </Button>
        )}
      </div>

      {departments.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="No departments yet"
          description="Add a department to this faculty to get started."
          action={
            canManage ? (
              <Button onClick={() => setEditingDept(null)}>
                <Plus className="size-4" data-icon="inline-start" />
                Add Department
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept, index) => (
            <motion.div
              key={dept.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <GitBranch size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {dept.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {dept.code}
                        </p>
                      </div>
                    </div>
                    <StatusBadge
                      label={dept.isActive ? "Active" : "Inactive"}
                      variant={dept.isActive ? "success" : "destructive"}
                      dot
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      className="flex-1"
                      size="sm"
                      onClick={() => onOpenDepartment(dept.id)}
                    >
                      Programs & Staff{" "}
                      <ArrowRight className="size-3.5" data-icon="inline-end" />
                    </Button>
                    {canManage && (
                      <>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => setEditingDept(dept)}
                          title="Edit department"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => handleToggleDept(dept)}
                          disabled={togglingKey === `dept-${dept.id}`}
                          title={
                            dept.isActive
                              ? "Deactivate department"
                              : "Activate department"
                          }
                          aria-label={
                            dept.isActive
                              ? `Deactivate ${dept.name}`
                              : `Activate ${dept.name}`
                          }
                          aria-pressed={dept.isActive}
                        >
                          {togglingKey === `dept-${dept.id}` ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Power
                              className={cn(
                                "size-3.5",
                                dept.isActive
                                  ? "text-destructive"
                                  : "text-emerald-600 dark:text-emerald-400"
                              )}
                            />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Programs — Direct
          </h3>
          <p className="text-xs text-muted-foreground">
            Programs attached straight to this faculty, with no department in
            between.
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setEditingDirectProgram(null)}>
            <Plus className="size-3.5" data-icon="inline-start" /> Add Program
          </Button>
        )}
      </div>

      {directPrograms.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No direct programs"
          description="Programs here skip the department layer entirely — attach one straight to this faculty."
          action={
            canManage ? (
              <Button onClick={() => setEditingDirectProgram(null)}>
                <Plus className="size-4" data-icon="inline-start" />
                Add Program
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {directPrograms.map((program) => (
            <div
              key={program.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {program.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {program.code} · {program.degreeType} ·{" "}
                  {program.durationYears}yr · {program.minCreditUnits} units
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <StatusBadge
                  label={program.isActive ? "Active" : "Inactive"}
                  variant={program.isActive ? "success" : "destructive"}
                  dot
                />
                {canManage && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setReassigning(program)}
                      title="Reassign faculty/department"
                    >
                      <ArrowRightLeft className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditingDirectProgram(program)}
                      title="Edit program"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleToggleDirectProgram(program)}
                      disabled={togglingKey === `program-${program.id}`}
                      title={
                        program.isActive
                          ? "Deactivate program"
                          : "Activate program"
                      }
                      aria-label={
                        program.isActive
                          ? `Deactivate ${program.name}`
                          : `Activate ${program.name}`
                      }
                      aria-pressed={program.isActive}
                    >
                      {togglingKey === `program-${program.id}` ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Power
                          className={cn(
                            "size-3.5",
                            program.isActive
                              ? "text-destructive"
                              : "text-emerald-600 dark:text-emerald-400"
                          )}
                        />
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <FacultyFormDialog
        open={editingFaculty}
        onClose={() => setEditingFaculty(false)}
        faculty={faculty}
      />
      <DepartmentFormDialog
        open={editingDept !== undefined}
        onClose={() => setEditingDept(undefined)}
        facultyId={facultyId}
        department={editingDept}
      />
      <ProgramFormDialog
        open={editingDirectProgram !== undefined}
        onClose={() => setEditingDirectProgram(undefined)}
        faculty={{ id: facultyId, name: faculty.name }}
        program={editingDirectProgram}
      />
      <ReassignProgramDialog
        program={reassigning}
        currentFacultyId={facultyId}
        onClose={() => setReassigning(null)}
      />
    </div>
  )
}

// ── Level 3: One department's programs + lecturers ──────────────────────────

function DepartmentDetail({
  canManage,
  facultyId,
  departmentId,
  onBack,
}: {
  canManage: boolean
  facultyId: number
  departmentId: number
  onBack: () => void
}) {
  const { data, isLoading } = useDepartment(departmentId)
  const updateProgram = useUpdateProgram()
  const [togglingProgramId, setTogglingProgramId] = useState<number | null>(
    null
  )
  const [editingDept, setEditingDept] = useState(false)
  const [editingProgram, setEditingProgram] = useState<
    Program | null | undefined
  >(undefined)
  const [reassigning, setReassigning] = useState<Program | null>(null)

  const department = data?.data
  const programs = department?.programs ?? []
  const lecturers = department?.lecturers ?? []
  const hod = lecturers.find((l) => l.userId === department?.hodUserId)

  // PATCH `{isActive}` — reversible on/off toggle (bruno/academic/Programs -
  // Update.bru).
  const handleToggleProgram = async (program: Program) => {
    const nextActive = !program.isActive
    setTogglingProgramId(program.id)
    try {
      await updateProgram.mutateAsync({
        id: program.id,
        payload: { isActive: nextActive },
      })
      toast.success(
        `${program.name} ${nextActive ? "activated" : "deactivated"}`
      )
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : `Failed to ${nextActive ? "activate" : "deactivate"} program`
      )
    } finally {
      setTogglingProgramId(null)
    }
  }

  if (isLoading || !department) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          title="Back to departments"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">
            Faculties / … / {department.name}
          </p>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">
              {department.name}
            </h2>
            <StatusBadge
              label={department.isActive ? "Active" : "Inactive"}
              variant={department.isActive ? "success" : "destructive"}
              dot
            />
          </div>
        </div>
        {canManage && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditingDept(true)}
          >
            <Pencil className="size-3.5" data-icon="inline-start" /> Edit
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="grid gap-3 pt-6 text-sm sm:grid-cols-2">
          {department.description && (
            <p className="text-muted-foreground sm:col-span-2">
              {department.description}
            </p>
          )}
          {department.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail size={13} /> {department.email}
            </div>
          )}
          {department.phoneNumber && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone size={13} /> {department.phoneNumber}
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users size={13} />
            HOD:{" "}
            {hod
              ? `${hod.user ? `${hod.user.firstName ?? ""} ${hod.user.lastName ?? ""}`.trim() : hod.staffNumber}`
              : department.hodUserId
                ? `User #${department.hodUserId}`
                : "Not assigned"}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Programs</h3>
            {canManage && (
              <Button size="sm" onClick={() => setEditingProgram(null)}>
                <Plus className="size-3.5" data-icon="inline-start" /> Add
                Program
              </Button>
            )}
          </div>
          {programs.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No programs yet"
              description="Add a degree program to this department."
              action={
                canManage ? (
                  <Button onClick={() => setEditingProgram(null)}>
                    <Plus className="size-4" data-icon="inline-start" />
                    Add Program
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-2">
              {programs.map((program) => (
                <div
                  key={program.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {program.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {program.code} · {program.degreeType} ·{" "}
                      {program.durationYears}yr · {program.minCreditUnits} units
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <StatusBadge
                      label={program.isActive ? "Active" : "Inactive"}
                      variant={program.isActive ? "success" : "destructive"}
                      dot
                    />
                    {canManage && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setReassigning(program)}
                          title="Reassign faculty/department"
                        >
                          <ArrowRightLeft className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setEditingProgram(program)}
                          title="Edit program"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleToggleProgram(program)}
                          disabled={togglingProgramId === program.id}
                          title={
                            program.isActive
                              ? "Deactivate program"
                              : "Activate program"
                          }
                          aria-label={
                            program.isActive
                              ? `Deactivate ${program.name}`
                              : `Activate ${program.name}`
                          }
                          aria-pressed={program.isActive}
                        >
                          {togglingProgramId === program.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Power
                              className={cn(
                                "size-3.5",
                                program.isActive
                                  ? "text-destructive"
                                  : "text-emerald-600 dark:text-emerald-400"
                              )}
                            />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Lecturers</h3>
          {lecturers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No lecturers yet"
              description="Assign lecturers to this department from Users → Lecturers."
            />
          ) : (
            <div className="space-y-2">
              {lecturers.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {l.user
                        ? `${l.user.firstName ?? ""} ${l.user.lastName ?? ""}`.trim()
                        : `Staff #${l.staffNumber}`}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {l.designation}
                    </p>
                  </div>
                  {l.userId === department.hodUserId && (
                    <StatusBadge label="HOD" variant="purple" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <DepartmentFormDialog
        open={editingDept}
        onClose={() => setEditingDept(false)}
        facultyId={facultyId}
        department={department}
      />
      <ProgramFormDialog
        open={editingProgram !== undefined}
        onClose={() => setEditingProgram(undefined)}
        departmentId={departmentId}
        program={editingProgram}
      />
      <ReassignProgramDialog
        program={reassigning}
        currentFacultyId={facultyId}
        onClose={() => setReassigning(null)}
      />
    </div>
  )
}
