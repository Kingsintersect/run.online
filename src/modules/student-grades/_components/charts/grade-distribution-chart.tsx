"use client";

import {
   PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { GradeDistributionItem } from "../../types/grades.types";

interface TooltipPayloadEntry {
   name?: string | number;
   value?: number | string | ReadonlyArray<number | string>;
   color?: string;
   payload?: GradeDistributionItem;
}

interface CustomTooltipProps {
   active?: boolean;
   payload?: ReadonlyArray<TooltipPayloadEntry>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
   if (!active || !payload?.length) return null;
   const entry = payload[0];
   const item = entry.payload;
   return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-xs min-w-36">
         <p className="font-bold text-foreground text-sm mb-1">{item?.grade}</p>
         <p className="text-muted-foreground">Count: <span className="font-semibold text-foreground">{item?.count}</span></p>
         <p className="text-muted-foreground">Share: <span className="font-semibold text-foreground">{item?.percentage}%</span></p>
         <p className="text-muted-foreground">GP: <span className="font-semibold text-foreground">{item?.gradePoint?.toFixed(2)}</span></p>
      </div>
   );
}

interface GradeDistributionChartProps {
   data: GradeDistributionItem[];
}

export function GradeDistributionChart({ data }: GradeDistributionChartProps) {
   const filtered = data.filter((d) => d.count > 0);

   return (
      <ResponsiveContainer width="100%" height={280}>
         <PieChart>
            <Pie
               data={filtered}
               cx="50%"
               cy="45%"
               innerRadius={60}
               outerRadius={100}
               paddingAngle={3}
               dataKey="count"
               nameKey="grade"
               label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
               }
               labelLine={false}
            >
               {filtered.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
               ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
               iconType="circle"
               iconSize={8}
               formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
            />
         </PieChart>
      </ResponsiveContainer>
   );
}
