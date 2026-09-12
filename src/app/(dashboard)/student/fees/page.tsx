"use client"

import { motion } from "framer-motion"
import { Receipt } from "lucide-react"
import { MyFeesList } from "@/modules/fee-management/components/student/my-fees-list"

export default function StudentMyFeesPage() {
  return (
    <div className="space-y-6 p-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
          <Receipt size={18} className="text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">My Fees</h1>
          <p className="text-sm text-muted-foreground">
            View and pay your outstanding fee obligations.
          </p>
        </div>
      </motion.div>

      <MyFeesList />
    </div>
  )
}
