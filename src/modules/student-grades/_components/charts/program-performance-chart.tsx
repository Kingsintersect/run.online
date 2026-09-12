"use client";

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell,
} from "recharts";
import type { ProgramPerformance } from "../../types/grades.types";

interface TooltipPayloadEntry {
    name?: string | number;
    value?: number | string | ReadonlyArray<number | string>;
    color?: string;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: ReadonlyArray<TooltipPayloadEntry>;
    label?: string | number;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-xs min-w-40">
            <p className="font-semibold text-foreground mb-2">{label}</p>
            {payload.map((entry, i) => (
                <div key={i} className="flex justify-between gap-4">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: entry.color }} />
                        {entry.name}
                    </span>
                    <span className="font-medium text-foreground">
                        {typeof entry.value === "number" ? entry.value.toFixed(2) : entry.value}
                    </span>
                </div>
            ))}
        </div>
    );
}

const PROGRAM_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444"];

interface ProgramPerformanceChartProps {
    data: ProgramPerformance[];
}

export function ProgramPerformanceChart({ data }: ProgramPerformanceChartProps) {
    return (
        <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                    dataKey="programCode"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis
                    domain={[0, 5]}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avgGPA" name="Avg GPA" radius={[6, 6, 0, 0]} maxBarSize={52}>
                    {data.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PROGRAM_COLORS[index % PROGRAM_COLORS.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
