"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import Link from "next/link";
import {
  LayoutList, GitBranch, Layers, ChevronRight, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuditCharts } from "./AuditCharts";
import { AuditTable } from "./AuditTable";
import { AuditGroupedView } from "./AuditGroupedView";
import { AuditDetailModal } from "./AuditDetailModal";
import { useAuditStore } from "../store/audit.store";

// ─── Page header with GSAP entrance ─────────────────────────────────────────

function AuditHeader() {
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!headerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".audit-header-item", {
        y: -24,
        opacity: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: "power3.out",
      });
    }, headerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={headerRef} className="flex flex-wrap items-start justify-between gap-4">
      <div className="audit-header-item flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-md">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Audit Centre
          </h1>
          <p className="text-xs text-muted-foreground">
            Unified activity trail — UNIZIK Student Portal
          </p>
        </div>
      </div>

      {/* Breadcrumb */}
      <nav className="audit-header-item flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/admin" className="hover:text-primary transition-colors">
          Admin
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Audit</span>
      </nav>
    </div>
  );
}

// ─── Quick Nav Cards ─────────────────────────────────────────────────────────

interface QuickNavCardProps {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
  index: number;
}

function QuickNavCard({ href, icon: Icon, label, description, index }: QuickNavCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.08 }}
    >
      <Link
        href={href}
        className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary hover:shadow-md"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-primary group-hover:text-white">
          <Icon className="h-4 w-4 transition-colors group-hover:text-white text-primary" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
        <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </Link>
    </motion.div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function AuditDashboard() {
  const { viewMode, setViewMode } = useAuditStore();

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <AuditHeader />

        {/* Quick navigation */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <QuickNavCard
            href="/admin/audit/logs"
            icon={LayoutList}
            label="All Logs"
            description="Browse & search every audit entry"
            index={0}
          />
          <QuickNavCard
            href="/admin/audit/user/1"
            icon={GitBranch}
            label="User Trail"
            description="Activity timeline for a specific user"
            index={1}
          />
          <QuickNavCard
            href="/admin/audit/entity/Grade/101"
            icon={Layers}
            label="Entity Trail"
            description="Lifecycle of a specific record"
            index={2}
          />
        </div>

        {/* Charts overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <AuditCharts />
        </motion.div>

        {/* Logs section with view switcher */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              Recent Activity
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
                className={viewMode === "table" ? "bg-primary text-white" : ""}
              >
                <LayoutList className="mr-1.5 h-3.5 w-3.5" />
                Table
              </Button>
              <Button
                variant={viewMode === "grouped" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grouped")}
                className={viewMode === "grouped" ? "bg-primary text-white" : ""}
              >
                <Layers className="mr-1.5 h-3.5 w-3.5" />
                Grouped
              </Button>
            </div>
          </div>

          {viewMode === "table" ? <AuditTable /> : <AuditGroupedView />}
        </motion.div>

        {/* Detail modal */}
        <AuditDetailModal />
      </div>
    </div>
  );
}
