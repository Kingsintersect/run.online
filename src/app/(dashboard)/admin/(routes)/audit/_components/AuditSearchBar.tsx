"use client";

import { useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { useAuditFilters } from "../hooks/useAuditFilters";

interface AuditSearchBarProps {
   placeholder?: string;
   autoFocus?: boolean;
   className?: string;
}

export function AuditSearchBar({
   placeholder = "Search by user, action, entity…",
   autoFocus = false,
   className,
}: AuditSearchBarProps) {
   const { filters, setSearch } = useAuditFilters();
   const inputRef = useRef<HTMLInputElement>(null);
   const hasValue = Boolean(filters.search);

   useEffect(() => {
      if (autoFocus) inputRef.current?.focus();
   }, [autoFocus]);

   // Global keyboard shortcut: press "/" to focus search
   useEffect(() => {
      function handler(e: KeyboardEvent) {
         if (
            e.key === "/" &&
            document.activeElement !== inputRef.current &&
            !(document.activeElement instanceof HTMLInputElement) &&
            !(document.activeElement instanceof HTMLTextAreaElement)
         ) {
            e.preventDefault();
            inputRef.current?.focus();
         }
      }
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
   }, []);

   return (
      <div className={`relative flex items-center ${className ?? ""}`}>
         <Search className="absolute left-3 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
         <Input
            ref={inputRef}
            value={filters.search ?? ""}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={placeholder}
            className="pl-8 pr-8 h-9 text-sm border-border bg-background"
         />
         <AnimatePresence>
            {hasValue && (
               <motion.button
                  key="clear"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  onClick={() => {
                     setSearch("");
                     inputRef.current?.focus();
                  }}
                  className="absolute right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-muted-foreground/20 text-muted-foreground hover:bg-muted-foreground/30 transition-colors"
               >
                  <X className="h-2.5 w-2.5" />
               </motion.button>
            )}
         </AnimatePresence>
      </div>
   );
}
