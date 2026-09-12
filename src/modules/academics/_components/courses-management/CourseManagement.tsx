"use client"

import { AnimatePresence, motion } from "framer-motion"
import Tabs from "@/components/custom/Tabs"
import {
  BookOpen,
  Link2,
  GraduationCap,
  CalendarRange,
  Network,
} from "lucide-react"
import { CourseList } from "./components/CourseList"
import { ProgramCourseManager } from "./components/ProgramCourseManager"
import { CurriculumPlanner } from "./components/CurriculumPlanner"
import { OfferingsManager } from "./components/OfferingsManager"
import { PrerequisiteManager } from "./components/PrerequisiteManager"

interface CourseManagementPageProps {
  canManage?: boolean
}

const tabs = [
  { key: "registry", label: "Course Registry", icon: <BookOpen size={14} /> },
  { key: "mapping", label: "Program Mapping", icon: <Link2 size={14} /> },
  { key: "curriculum", label: "Curriculum", icon: <GraduationCap size={14} /> },
  { key: "offerings", label: "Offerings", icon: <CalendarRange size={14} /> },
  { key: "prerequisites", label: "Prerequisites", icon: <Network size={14} /> },
]

export default function CourseManagementPage({
  canManage = false,
}: CourseManagementPageProps) {
  // If user doesn't have permission, show nothing
  if (!canManage) return null

  return (
    <div className="mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Course Management
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create courses and assign them to academic programs.
        </p>
      </motion.div>

      <Tabs tabs={tabs} defaultTab="registry">
        {(activeTab) => (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {activeTab === "registry" && <CourseList canManage={canManage} />}
              {activeTab === "mapping" && (
                <ProgramCourseManager canManage={canManage} />
              )}
              {activeTab === "curriculum" && (
                <CurriculumPlanner canManage={canManage} />
              )}
              {activeTab === "offerings" && (
                <OfferingsManager canManage={canManage} />
              )}
              {activeTab === "prerequisites" && (
                <PrerequisiteManager canManage={canManage} />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </Tabs>
    </div>
  )
}
