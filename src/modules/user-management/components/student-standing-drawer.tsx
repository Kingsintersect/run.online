"use client"

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { StudentStandingPanel } from "@/modules/progression/components/standing-panel"
import type { Student } from "@/types/users"

interface StudentStandingDrawerProps {
  /** The student being viewed; `null` closes the drawer. */
  student: Student | null
  onClose: () => void
}

function fullName(student: Student) {
  return [
    student.user.first_name,
    student.user.middle_name,
    student.user.last_name,
  ]
    .filter(Boolean)
    .join(" ")
}

/** Side sheet with one student's read-only academic standing. */
export function StudentStandingDrawer({
  student,
  onClose,
}: StudentStandingDrawerProps) {
  return (
    <Drawer
      direction="right"
      open={student !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-xl">
        <DrawerHeader>
          <DrawerTitle>{student ? fullName(student) : "Student"}</DrawerTitle>
          <DrawerDescription>
            {student
              ? [
                  student.matric_number,
                  student.program_name,
                  student.current_level !== null
                    ? `${student.current_level} Level`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : ""}
          </DrawerDescription>
        </DrawerHeader>
        {student && (
          <div className="flex-1 overflow-y-auto px-4 pb-6">
            <StudentStandingPanel studentId={student.id} readOnly />
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}
