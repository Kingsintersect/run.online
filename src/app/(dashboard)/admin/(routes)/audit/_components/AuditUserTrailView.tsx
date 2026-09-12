"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import Link from "next/link";
import {
    ChevronRight, GitBranch, ArrowLeft, Eye,
    Loader2, Inbox, ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuditUserLogs } from "../hooks/useAudit";
import { useAuditStore } from "../store/audit.store";
import { ActionBadge } from "./ActionBadge";
import { AuditDetailModal } from "./AuditDetailModal";
import { ExportMenu } from "./ExportMenu";
import { formatRelativeTime, formatDateTime } from "@/lib/utils/date.utils";
import type { AuditLog } from "../types/audit.types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface AuditUserTrailViewProps {
    userId: number;
}

// ─── Action stats bar ─────────────────────────────────────────────────────────

function ActionStats({ logs }: { logs: AuditLog[] }) {
    const counts = logs.reduce<Record<string, number>>((acc, l) => {
        acc[l.action] = (acc[l.action] ?? 0) + 1;
        return acc;
    }, {});

    return (
        <div className="flex flex-wrap gap-2">
            {Object.entries(counts)
                .sort(([, a], [, b]) => b - a)
                .map(([action, count]) => (
                    <span
                        key={action}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-medium text-muted-foreground"
                    >
                        <span className="font-bold text-foreground">{count}</span>
                        {action}
                    </span>
                ))}
        </div>
    );
}

// ─── Timeline item ────────────────────────────────────────────────────────────

function TimelineItem({
    log,
    index,
    isLast,
    onView,
}: {
    log: AuditLog;
    index: number;
    isLast: boolean;
    onView: (log: AuditLog) => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04 }}
            className="relative flex gap-4"
        >
            {/* Timeline line */}
            {!isLast && (
             <div className="absolute left-4.25 top-8 bottom-0 w-px bg-border" />
            )}

            {/* Dot */}
            <div className="relative z-10 mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-background bg-card shadow-sm ring-1 ring-border">
                <ActionBadge action={log.action} size="sm" showIcon={true} />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 rounded-xl border border-border bg-card p-3.5 shadow-sm transition-colors hover:border-primary/30 hover:shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">
                                {log.entityType}
                            </Badge>
                            <span className="text-xs text-muted-foreground">#{log.entityId}</span>
                        </div>
                        {log.newValues && (
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                {Object.entries(log.newValues)
                                    .slice(0, 3)
                                    .map(([k, v]) => `${k}: ${String(v)}`)
                                    .join(" · ")}
                            </p>
                        )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {formatRelativeTime(log.createdAt)}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onView(log)}
                        >
                            <Eye className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                    {formatDateTime(log.createdAt)}
                    {log.ipAddress && ` · ${log.ipAddress}`}
                </p>
            </div>
        </motion.div>
    );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function AuditUserTrailView({ userId }: AuditUserTrailViewProps) {
    const headerRef = useRef<HTMLDivElement>(null);
    const { filters, setFilters, setSelectedLog, setDetailModalOpen } = useAuditStore();
    const [localSearch, setLocalSearch] = useState("");

    const { data, isLoading, isFetching } = useAuditUserLogs(userId, {
        ...filters,
        limit: 50,
    });

    const logs = data?.data ?? [];
    const meta = data?.meta ?? { total: 0, page: 1, limit: 50 };
    const totalPages = Math.ceil(meta.total / meta.limit);
    const userName = logs[0]
        ? `${logs[0].user.firstName} ${logs[0].user.lastName}`
        : `User #${userId}`;

    useEffect(() => {
        if (!headerRef.current) return;
        const ctx = gsap.context(() => {
            gsap.from(".user-trail-header-item", {
                y: -20,
                opacity: 0,
                duration: 0.5,
                stagger: 0.07,
                ease: "power3.out",
            });
        }, headerRef);
        return () => ctx.revert();
    }, []);

    function handleView(log: AuditLog) {
        setSelectedLog(log);
        setDetailModalOpen(true);
    }

    const filteredLogs = localSearch
        ? logs.filter((l) => {
            const q = localSearch.toLowerCase();
            return (
                l.action.toLowerCase().includes(q) ||
                l.entityType.toLowerCase().includes(q)
            );
        })
        : logs;

    return (
        <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl space-y-6">
                {/* Header */}
                <div ref={headerRef} className="space-y-4">
                    <div className="user-trail-header-item flex items-center gap-2 text-xs text-muted-foreground">
                        <Link href="/admin/audit" className="hover:text-primary transition-colors">
                            Audit
                        </Link>
                        <ChevronRight className="h-3 w-3" />
                        <span className="text-foreground">User Trail</span>
                    </div>

                    <div className="user-trail-header-item flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                                <GitBranch className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-foreground">{userName}</h1>
                                <p className="text-xs text-muted-foreground">
                                    Activity trail · {meta.total} total actions
                                    {isFetching && !isLoading && (
                                        <Loader2 className="ml-1.5 inline h-3 w-3 animate-spin" />
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" asChild>
                                <Link href="/admin/audit">
                                    <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                                    Back
                                </Link>
                            </Button>
                            <ExportMenu logs={logs} filenamePrefix={`user-${userId}-trail`} />
                        </div>
                    </div>

                    {/* Action stats */}
                    {logs.length > 0 && (
                        <motion.div
                            className="user-trail-header-item"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <ActionStats logs={logs} />
                        </motion.div>
                    )}

                    {/* Search */}
                    <div className="user-trail-header-item">
                        <input
                            className="w-full max-w-sm rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                            placeholder="Filter by action or entity…"
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Timeline */}
                {isLoading ? (
                    <div className="flex h-48 items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="text-sm">Loading trail…</span>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card">
                        <Inbox className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No activity found</p>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        <div className="space-y-3">
                            {filteredLogs.map((log, i) => (
                                <TimelineItem
                                    key={log.id}
                                    log={log}
                                    index={i}
                                    isLast={i === filteredLogs.length - 1}
                                    onView={handleView}
                                />
                            ))}
                        </div>
                    </AnimatePresence>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-border pt-4">
                        <p className="text-xs text-muted-foreground">
                            Page <span className="font-semibold text-foreground">{meta.page}</span> of{" "}
                            <span className="font-semibold text-foreground">{totalPages}</span>
                        </p>
                        <div className="flex gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                disabled={meta.page <= 1}
                                onClick={() => setFilters({ page: meta.page - 1 })}
                            >
                                <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                disabled={meta.page >= totalPages}
                                onClick={() => setFilters({ page: meta.page + 1 })}
                            >
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <AuditDetailModal />
        </div>
    );
}
