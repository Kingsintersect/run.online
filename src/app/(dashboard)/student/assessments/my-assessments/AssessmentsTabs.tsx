"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const TAB_LINKS = [
   { href: "/student/assessments/my-assessments", label: "All", icon: BookOpen, exact: true },
   { href: "/student/assessments/my-assessments/upcoming", label: "Upcoming", icon: Clock, exact: false },
];

export function AssessmentsTabs() {
   const pathname = usePathname();

   return (
      <nav className="rounded-2xl border border-border/70 bg-card/95 p-2 shadow-sm">
         <div className="flex flex-wrap items-center gap-2">
            {TAB_LINKS.map(({ href, label, icon: Icon, exact }) => {
               const isActive = exact ? pathname === href : pathname.startsWith(href);
               return (
                  <Link
                     key={href}
                     href={href}
                     className={cn(
                        "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition-colors",
                        isActive
                           ? "border-primary/40 bg-primary/10 text-primary font-medium"
                           : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent/40"
                     )}
                  >
                     <Icon size={14} />
                     {label}
                  </Link>
               );
            })}
         </div>
      </nav>
   );
}
