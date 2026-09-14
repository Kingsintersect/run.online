"use client"

import { motion } from "framer-motion"
import { Building, Building2, CalendarRange, Layers } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { FacultiesPanel } from "./components/FacultiesPanel"
import { LevelsPanel } from "./components/LevelsPanel"
import { MajorProgramsPanel } from "./components/MajorProgramsPanel"
import { CohortsPanel } from "./components/CohortsPanel"

interface CourseStructurePageProps {
  canManage?: boolean
}

export default function CourseStructurePage({
  canManage = false,
}: CourseStructurePageProps) {
  return (
    <div className="mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Course Structure
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage faculties, departments, programs, and academic levels.
        </p>
      </motion.div>

      <Tabs defaultValue="faculties" className="space-y-6">
        <TabsList className="h-auto flex-wrap justify-start rounded-2xl border border-border bg-card p-2">
          <TabsTrigger
            value="faculties"
            className="gap-1.5 rounded-xl px-3 py-2"
          >
            <Building2 className="size-4" />
            Faculties
          </TabsTrigger>
          <TabsTrigger value="levels" className="gap-1.5 rounded-xl px-3 py-2">
            <Layers className="size-4" />
            Levels
          </TabsTrigger>
          {/* Major Programs — sandbox/major-program-scoping/. An
              institution-level scoping decision, so gated behind a
              dedicated major-programs:manage permission rather than this
              whole shell's course-structure:manage — see
              MajorProgramsPanel's own note. SUPER_ADMIN always passes
              usePermissions().can(), with no hardcoded role check. */}
          <PermissionGate
            require={{ resource: "major-programs", action: "manage" }}
          >
            <TabsTrigger
              value="major-programs"
              className="gap-1.5 rounded-xl px-3 py-2"
            >
              <Building className="size-4" />
              Major Programs
            </TabsTrigger>
          </PermissionGate>
          <TabsTrigger value="cohorts" className="gap-1.5 rounded-xl px-3 py-2">
            <CalendarRange className="size-4" />
            Cohorts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="faculties">
          <FacultiesPanel canManage={canManage} />
        </TabsContent>
        <TabsContent value="levels">
          <LevelsPanel canManage={canManage} />
        </TabsContent>
        <TabsContent value="major-programs">
          <PermissionGate
            require={{ resource: "major-programs", action: "manage" }}
          >
            <MajorProgramsPanel canManage={canManage} />
          </PermissionGate>
        </TabsContent>
        <TabsContent value="cohorts">
          <CohortsPanel canManage={canManage} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
