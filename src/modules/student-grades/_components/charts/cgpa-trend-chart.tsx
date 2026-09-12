"use client";

import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend,
} from "recharts";
import type { CgpaTrendPoint } from "../../types/grades.types";

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
            <p className="font-semibold text-foreground mb-2 text-[11px]">{label}</p>
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

interface CgpaTrendChartProps {
    data: CgpaTrendPoint[];
}

export function CgpaTrendChart({ data }: CgpaTrendChartProps) {
    return (
        <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <defs>
                    <linearGradient id="gpaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="cgpaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                    dataKey="semesterLabel"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={50}
                />
                <YAxis
                    domain={[0, 5]}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
                />
                <Area
                    type="monotone"
                    dataKey="avgGPA"
                    name="Avg GPA"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#gpaGrad)"
                    dot={{ fill: "#6366f1", r: 3 }}
                    activeDot={{ r: 5 }}
                />
                <Area
                    type="monotone"
                    dataKey="avgCGPA"
                    name="Avg CGPA"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#cgpaGrad)"
                    dot={{ fill: "#10b981", r: 3 }}
                    activeDot={{ r: 5 }}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
