"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuditStore } from "../store/audit.store";
import type { AuditAction } from "../types/audit.types";
import { ACTION_CONFIG } from "./ActionBadge";

const ACTIONS: AuditAction[] = [
   "LOGIN", "CREATE", "UPDATE", "DELETE",
   "APPROVE", "REJECT", "PAYMENT", "SYNC",
];

export function AuditActionQuickFilter() {
   const { filters, setFilters } = useAuditStore();
   const active = filters.action ?? "";

   function toggle(action: AuditAction) {
      setFilters({ action: active === action ? "" : action, page: 1 });
   }

   return (
      <div className="flex flex-wrap gap-1.5">
         {/* All pill */}
         <button
            onClick={() => setFilters({ action: "", page: 1 })}
            className={cn(
               "relative rounded-full border px-3 py-1 text-xs font-medium transition-all",
               active === ""
                  ? "border-primary bg-primary text-white shadow-sm"
                  : "border-border bg-card text-foreground hover:border-primary/50"
            )}
         >
            All
            {active === "" && (
               <motion.span
                  layoutId="active-pill"
                  className="absolute inset-0 rounded-full bg-primary -z-10"
               />
            )}
         </button>

         {ACTIONS.map((action) => {
            const config = ACTION_CONFIG[action];
            const Icon = config.icon;
            const isActive = active === action;

            return (
               <button
                  key={action}
                  onClick={() => toggle(action)}
                  className={cn(
                     "relative flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                     isActive
                        ? `${config.className} shadow-sm`
                        : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40"
                  )}
               >
                  <Icon className="h-3 w-3" />
                  {action}
               </button>
            );
         })}
      </div>
   );
}
