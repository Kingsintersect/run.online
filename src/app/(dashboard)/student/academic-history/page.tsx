"use client"

import { motion } from "framer-motion"
import { History } from "lucide-react"
import { AcademicHistoryView } from "@/modules/progression/components/academic-history-view"

export default function StudentAcademicHistoryPage() {
  return (
    <div className="space-y-6 p-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <History size={18} className="text-primary" aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-bold">Academic History</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Your level, outcome and standing for every session
          </p>
        </div>
      </motion.div>

      <AcademicHistoryView />
    </div>
  )
}
