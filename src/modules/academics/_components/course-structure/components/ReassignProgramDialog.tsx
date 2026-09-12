"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useFaculties,
  useDepartments,
  useUpdateProgram,
} from "@/hooks/useCourseStructure"
import {
  resolveFacultyAcademicUnit,
  academicStructureKeys,
} from "@/services/academicStructureApi"
import type { Program } from "@/types/school"

interface ReassignProgramDialogProps {
  program: Program | null
  /** Program's current faculty (if known) — preselected, not locked. */
  currentFacultyId?: number | null
  onClose: () => void
}

// Single, general-purpose "where does this program live" reassignment —
// covers all four moves: department → a different faculty's department,
// department → directly under a (possibly different) faculty, direct →
// a department (same or different faculty), direct → a different faculty
// directly. Faculty and Department are picked independently, so any
// combination is one step.
export function ReassignProgramDialog({
  program,
  currentFacultyId,
  onClose,
}: ReassignProgramDialogProps) {
  const [attachMode, setAttachMode] = useState<"department" | "direct">(
    "department"
  )
  const [facultyId, setFacultyId] = useState<number | null>(null)
  const [departmentId, setDepartmentId] = useState<number | null>(null)
  const [isResolving, setIsResolving] = useState(false)

  // The parent keeps this dialog mounted and just swaps `program` in/out, so
  // local state needs to reset whenever a *different* program is opened.
  // Adjusting state during render (React's documented alternative to an
  // effect for "resetting state when a prop changes") avoids both an extra
  // render pass and the set-state-in-effect lint rule — React re-runs the
  // component immediately with the updated state before anything commits.
  const [syncedProgramId, setSyncedProgramId] = useState<number | null>(null)
  if (program && program.id !== syncedProgramId) {
    setSyncedProgramId(program.id)
    setFacultyId(currentFacultyId ?? null)
    setDepartmentId(null)
    setAttachMode("department")
  }

  const { data: facultiesData } = useFaculties()
  const { data: departmentsData } = useDepartments(facultyId)
  const updateProgram = useUpdateProgram()
  const queryClient = useQueryClient()

  const faculties = facultiesData?.data ?? []
  const departments = departmentsData?.data ?? []

  const isPending = updateProgram.isPending || isResolving

  const handleReassign = async () => {
    if (!program || !facultyId) {
      toast.error("Please select a faculty.")
      return
    }
    if (attachMode === "department" && !departmentId) {
      toast.error("Please select a department.")
      return
    }

    try {
      if (attachMode === "direct") {
        const faculty = faculties.find((f) => f.id === facultyId)
        setIsResolving(true)
        const unit = await resolveFacultyAcademicUnit(
          facultyId,
          faculty?.name ?? ""
        )
        // resolveFacultyAcademicUnit calls academicUnitsApi.create() directly
        // (not via useCreateAcademicUnit()), so it never triggers that hook's
        // own cache invalidation — do it here, otherwise a lazily-created
        // unit is invisible to useAcademicUnits() until a manual refetch.
        await queryClient.invalidateQueries({
          queryKey: academicStructureKeys.units.all,
        })
        setIsResolving(false)
        await updateProgram.mutateAsync({
          id: program.id,
          payload: { departmentId: null, parentAcademicUnitId: unit.id },
        })
      } else {
        await updateProgram.mutateAsync({
          id: program.id,
          payload: { departmentId, parentAcademicUnitId: null },
        })
      }
      toast.success(`"${program.name}" reassigned`)
      onClose()
    } catch (err) {
      setIsResolving(false)
      toast.error(
        err instanceof Error ? err.message : "Failed to reassign program"
      )
    }
  }

  return (
    <Modal
      open={!!program}
      onClose={onClose}
      title="Reassign Program"
      subtitle={
        program
          ? `Move "${program.name}" to a different faculty and/or department.`
          : undefined
      }
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleReassign}
            disabled={
              isPending ||
              !facultyId ||
              (attachMode === "department" && !departmentId)
            }
          >
            {isPending && (
              <Loader2
                className="size-4 animate-spin"
                data-icon="inline-start"
              />
            )}
            Reassign
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setAttachMode("department")}
            className={
              attachMode === "department"
                ? "rounded-lg border border-primary bg-primary/10 px-2 py-1.5 text-xs font-medium text-primary"
                : "rounded-lg border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted"
            }
          >
            Attach to a Department
          </button>
          <button
            type="button"
            onClick={() => setAttachMode("direct")}
            className={
              attachMode === "direct"
                ? "rounded-lg border border-primary bg-primary/10 px-2 py-1.5 text-xs font-medium text-primary"
                : "rounded-lg border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted"
            }
          >
            Attach directly to Faculty
          </button>
        </div>

        <div className="space-y-1.5">
          <Label>Faculty</Label>
          <Select
            value={facultyId ? String(facultyId) : ""}
            onValueChange={(v) => {
              setFacultyId(Number(v))
              setDepartmentId(null)
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a faculty" />
            </SelectTrigger>
            <SelectContent>
              {faculties.map((f) => (
                <SelectItem key={f.id} value={String(f.id)}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {attachMode === "department" && (
          <div className="space-y-1.5">
            <Label>Department</Label>
            {facultyId && departments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                This faculty has no departments yet — add one first, or attach
                directly to the faculty instead.
              </p>
            ) : (
              <Select
                value={departmentId ? String(departmentId) : ""}
                onValueChange={(v) => setDepartmentId(Number(v))}
                disabled={!facultyId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      facultyId
                        ? "Select a department"
                        : "Select a faculty first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
