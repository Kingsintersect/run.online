"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import {
   AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
   XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useAuditStats } from "../hooks/useAudit";
import { Loader2 } from "lucide-react";

// ─── Palette ──────────────────────────────────────────────────────────────────

const ACTION_COLORS: Record<string, string> = {
   LOGIN: "#10b981",
   LOGOUT: "#94a3b8",
   CREATE: "#3b82f6",
   UPDATE: "#f59e0b",
   DELETE: "#ef4444",
   APPROVE: "#22c55e",
   REJECT: "#f43f5e",
   ENROLL: "#8b5cf6",
   PAYMENT: "#f97316",
   SYNC: "#06b6d4",
};

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
   label: string;
   value: number;
   sublabel?: string;
   color: string;
   index: number;
}

function StatCard({ label, value, sublabel, color, index }: StatCardProps) {
   const numRef = useRef<HTMLSpanElement>(null);

   useEffect(() => {
      if (!numRef.current) return;
      gsap.fromTo(
         numRef.current,
         { textContent: 0 },
         {
            textContent: value,
            duration: 1.2,
            delay: index * 0.12,
            ease: "power2.out",
            snap: { textContent: 1 },
            onUpdate() {
               if (numRef.current) {
                  numRef.current.textContent = Math.round(
                     parseFloat(numRef.current.textContent ?? "0")
                  ).toLocaleString();
               }
            },
         }
      );
   }, [value, index]);

   return (
      <motion.div
         initial={{ opacity: 0, y: 16 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: index * 0.08, duration: 0.4 }}
         className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm"
      >
         <div
            className="absolute inset-x-0 top-0 h-1"
            style={{ background: color }}
         />
         <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
         </p>
         <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            <span ref={numRef}>0</span>
         </p>
         {sublabel && (
            <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>
         )}
      </motion.div>
   );
}

// ─── Charts ───────────────────────────────────────────────────────────────────

export function AuditCharts() {
   const { data: stats, isLoading } = useAuditStats();

   if (isLoading) {
      return (
         <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
         </div>
      );
   }

   if (!stats) return null;

   return (
      <div className="space-y-6">
         {/* Stat Cards */}
         <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
               label="Total Logs"
               value={stats.totalLogs}
               sublabel="All time"
               color="var(--unizik-blue)"
               index={0}
            />
            <StatCard
               label="Today"
               value={stats.todayLogs}
               sublabel="Last 24 hours"
               color="#10b981"
               index={1}
            />
            <StatCard
               label="Active Users"
               value={stats.uniqueUsers}
               sublabel="Unique actors"
               color="var(--unizik-orange)"
               index={2}
            />
            <StatCard
               label="Critical"
               value={stats.criticalActions}
               sublabel="High-impact actions"
               color="#ef4444"
               index={3}
            />
         </div>

         {/* Charts Row */}
         <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Activity Area Chart */}
            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.3 }}
               className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-sm"
            >
               <h3 className="mb-4 text-sm font-semibold text-foreground">
                  Activity — Last 14 Days
               </h3>
               <ResponsiveContainer width="100%" height={200}>
                  <AreaChart
                     data={stats.dailyActivity}
                     margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                  >
                     <defs>
                        <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="var(--unizik-blue)" stopOpacity={0.3} />
                           <stop offset="95%" stopColor="var(--unizik-blue)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradLogin" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                           <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                     <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                        tickFormatter={(v: string) => v.slice(5)}
                     />
                     <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                     <Tooltip
                        contentStyle={{
                           background: "var(--card)",
                           border: "1px solid var(--border)",
                           borderRadius: 8,
                           fontSize: 12,
                        }}
                     />
                     <Area
                        type="monotone"
                        dataKey="count"
                        name="Total"
                        stroke="var(--unizik-blue)"
                        fill="url(#gradTotal)"
                        strokeWidth={2}
                     />
                     <Area
                        type="monotone"
                        dataKey="logins"
                        name="Logins"
                        stroke="#10b981"
                        fill="url(#gradLogin)"
                        strokeWidth={2}
                     />
                     <Legend wrapperStyle={{ fontSize: 11 }} />
                  </AreaChart>
               </ResponsiveContainer>
            </motion.div>

            {/* Action Pie */}
            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.4 }}
               className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
               <h3 className="mb-4 text-sm font-semibold text-foreground">
                  Action Breakdown
               </h3>
               <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                     <Pie
                        data={stats.actionBreakdown}
                        dataKey="count"
                        nameKey="action"
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={72}
                        paddingAngle={2}
                     >
                        {stats.actionBreakdown.map((entry: { action: string; count: number }) => (
                           <Cell
                              key={entry.action}
                              fill={ACTION_COLORS[entry.action] ?? "#94a3b8"}
                           />
                        ))}
                     </Pie>
                     <Tooltip
                        contentStyle={{
                           background: "var(--card)",
                           border: "1px solid var(--border)",
                           borderRadius: 8,
                           fontSize: 12,
                        }}
                        formatter={(value) => [value != null ? String(value) : "", ""]}
                     />
                  </PieChart>
               </ResponsiveContainer>
               {/* Legend */}
               <div className="mt-2 grid grid-cols-2 gap-1">
                  {stats.actionBreakdown.map((entry: { action: string; count: number }) => (
                     <div key={entry.action} className="flex items-center gap-1.5">
                        <span
                           className="h-2 w-2 rounded-full shrink-0"
                           style={{ background: ACTION_COLORS[entry.action] ?? "#94a3b8" }}
                        />
                        <span className="text-[10px] text-muted-foreground">
                           {entry.action} <span className="font-semibold text-foreground">{entry.count}</span>
                        </span>
                     </div>
                  ))}
               </div>
            </motion.div>
         </div>

         {/* Hourly Bar Chart */}
         <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-xl border border-border bg-card p-5 shadow-sm"
         >
            <h3 className="mb-4 text-sm font-semibold text-foreground">
               Hourly Activity Distribution
            </h3>
            <ResponsiveContainer width="100%" height={140}>
               <BarChart
                  data={stats.hourlyActivity}
                  margin={{ top: 0, right: 8, left: -20, bottom: 0 }}
               >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                     dataKey="hour"
                     tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                     tickFormatter={(h: number) => `${h}:00`}
                     interval={2}
                  />
                  <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
                  <Tooltip
                     contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                     }}
                     labelFormatter={(h) => `${String(h)}:00 – ${String(Number(h) + 1)}:00`}
                  />
                  <Bar
                     dataKey="count"
                     name="Logs"
                     radius={[3, 3, 0, 0]}
                     fill="var(--unizik-orange)"
                     maxBarSize={24}
                  />
               </BarChart>
            </ResponsiveContainer>
         </motion.div>
      </div>
   );
}
