"use client"

import { motion } from "framer-motion"
import { Building2, Layers } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FacultiesPanel } from "./components/FacultiesPanel"
import { LevelsPanel } from "./components/LevelsPanel"

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
        </TabsList>

        <TabsContent value="faculties">
          <FacultiesPanel canManage={canManage} />
        </TabsContent>
        <TabsContent value="levels">
          <LevelsPanel canManage={canManage} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
