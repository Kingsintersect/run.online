"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import {
    BookOpen, CheckCircle2, Clock, TrendingUp, Activity, Award,
} from "lucide-react";
import type { GradeSummaryStats } from "../types/grades.types";

interface StatsCardsProps {
    stats: GradeSummaryStats;
}

const CARD_CONFIG = [
    {
        key: "totalGrades" as keyof GradeSummaryStats,
        label: "Total Grades",
        icon: BookOpen,
        color: "from-blue-500 to-indigo-600",
        textColor: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-50 dark:bg-blue-950/50",
        borderColor: "border-blue-100 dark:border-blue-900/50",
        format: (v: number) => v.toLocaleString(),
        subKey: null as null | keyof GradeSummaryStats,
        subFormat: null as null | ((v: number) => string),
    },
    {
        key: "publishedCount" as keyof GradeSummaryStats,
        label: "Published",
        icon: CheckCircle2,
        color: "from-emerald-500 to-teal-600",
        textColor: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-50 dark:bg-emerald-950/50",
        borderColor: "border-emerald-100 dark:border-emerald-900/50",
        format: (v: number) => v.toLocaleString(),
        subKey: null as null | keyof GradeSummaryStats,
        subFormat: null as null | ((v: number) => string),
    },
    {
        key: "pendingApprovals" as keyof GradeSummaryStats,
        label: "Pending Approvals",
        icon: Clock,
        color: "from-amber-400 to-orange-500",
        textColor: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-50 dark:bg-amber-950/50",
        borderColor: "border-amber-100 dark:border-amber-900/50",
        format: (v: number) => v.toLocaleString(),
        subKey: null as null | keyof GradeSummaryStats,
        subFormat: null as null | ((v: number) => string),
    },
    {
        key: "averageCGPA" as keyof GradeSummaryStats,
        label: "Average CGPA",
        icon: TrendingUp,
        color: "from-violet-500 to-purple-600",
        textColor: "text-violet-600 dark:text-violet-400",
        bgColor: "bg-violet-50 dark:bg-violet-950/50",
        borderColor: "border-violet-100 dark:border-violet-900/50",
        format: (v: number) => v.toFixed(2),
        subKey: "highestCGPA" as keyof GradeSummaryStats,
        subFormat: (v: number) => `Highest: ${v.toFixed(2)}`,
    },
    {
        key: "passRate" as keyof GradeSummaryStats,
        label: "Pass Rate",
        icon: Award,
        color: "from-rose-500 to-pink-600",
        textColor: "text-rose-600 dark:text-rose-400",
        bgColor: "bg-rose-50 dark:bg-rose-950/50",
        borderColor: "border-rose-100 dark:border-rose-900/50",
        format: (v: number) => `${v.toFixed(1)}%`,
        subKey: null as null | keyof GradeSummaryStats,
        subFormat: null as null | ((v: number) => string),
    },
];

function AnimatedCounter({
    value,
    format,
}: {
    value: number;
    format: (n: number) => string;
}) {
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (!ref.current) return;
        const obj = { val: 0 };
        gsap.to(obj, {
            val: value,
            duration: 1.4,
            ease: "power2.out",
            onUpdate: () => {
                if (ref.current) ref.current.textContent = format(obj.val);
            },
        });
    }, [value, format]);

    return <span ref={ref}>{format(0)}</span>;
}

const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
};
const item = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, bounce: 0.3 } },
};

export function GradeStatsCards({ stats }: StatsCardsProps) {
    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4"
        >
            {CARD_CONFIG.map((card) => {
                const Icon = card.icon;
                const value = stats[card.key] as number;

                return (
                    <motion.div
                        key={card.key}
                        variants={item}
                        whileHover={{ y: -4, transition: { type: "spring", stiffness: 400 } }}
                        className={`relative overflow-hidden rounded-2xl border ${card.borderColor} bg-card p-5 shadow-sm group cursor-default`}
                    >
                        {/* Gradient orb */}
                        <div
                            className={`absolute -top-6 -right-6 w-20 h-20 rounded-full bg-linear-to-br ${card.color} opacity-10 group-hover:opacity-20 transition-opacity duration-300`}
                        />
                        <div className="relative">
                            <div className="flex items-start justify-between mb-3">
                                <div className={`p-2.5 rounded-xl ${card.bgColor}`}>
                                    <Icon className={`w-4 h-4 ${card.textColor}`} />
                                </div>
                                {card.key === "passRate" && (
                                    <Activity className="w-4 h-4 text-muted-foreground/40" />
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                                {card.label}
                            </p>
                            <p className={`text-2xl font-bold ${card.textColor} font-mono`}>
                                <AnimatedCounter value={value} format={card.format} />
                            </p>
                            {card.subKey && card.subFormat && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    {card.subFormat(stats[card.subKey] as number)}
                                </p>
                            )}
                        </div>
                    </motion.div>
                );
            })}
        </motion.div>
    );
}
