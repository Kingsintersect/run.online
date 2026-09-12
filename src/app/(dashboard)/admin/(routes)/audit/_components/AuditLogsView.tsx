"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronRight, LayoutList } from "lucide-react";
import { AuditTable } from "./AuditTable";
import { AuditDetailModal } from "./AuditDetailModal";
import { AuditActionQuickFilter } from "./AuditActionQuickFilter";
import { AuditSearchBar } from "./AuditSearchBar";

export function AuditLogsView() {
   return (
      <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
         <div className="mx-auto max-w-7xl space-y-5">
            {/* Header */}
            <motion.div
               initial={{ opacity: 0, y: -16 }}
               animate={{ opacity: 1, y: 0 }}
               className="flex flex-wrap items-start justify-between gap-3"
            >
               <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                     <LayoutList className="h-4 w-4 text-white" />
                  </div>
                  <div>
                     <h1 className="text-lg font-bold text-foreground">All Audit Logs</h1>
                     <nav className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Link href="/admin/audit" className="hover:text-primary">
                           Audit
                        </Link>
                        <ChevronRight className="h-3 w-3" />
                        <span>All Logs</span>
                     </nav>
                  </div>
               </div>
               <AuditSearchBar className="w-full sm:w-72" />
            </motion.div>

            {/* Quick action pills */}
            <motion.div
               initial={{ opacity: 0, y: 8 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.08 }}
            >
               <AuditActionQuickFilter />
            </motion.div>

            <motion.div
               initial={{ opacity: 0, y: 16 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.12 }}
            >
               <AuditTable />
            </motion.div>

            <AuditDetailModal />
         </div>
      </div>
   );
}
