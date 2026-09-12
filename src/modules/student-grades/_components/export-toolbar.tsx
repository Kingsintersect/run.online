"use client";

import { motion } from "framer-motion";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import type { ExportFormat, Grade } from "../types/grades.types";

interface GradesExportToolbarProps {
    grades: Grade[];
    exporting: ExportFormat | null;
    onExportCSV: (grades: Grade[]) => void;
    onExportExcel: (grades: Grade[]) => void;
    onExportPDF: (grades: Grade[]) => void;
    totalCount?: number;
}

export function GradesExportToolbar({
    grades,
    exporting,
    onExportCSV,
    onExportExcel,
    onExportPDF,
    totalCount,
}: GradesExportToolbarProps) {
    return (
        <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground hidden sm:block">
                Export {totalCount ?? grades.length} records:
            </span>

            <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onExportCSV(grades)}
                disabled={!!exporting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-xl bg-card text-foreground hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-50 transition"
            >
                {exporting === "csv" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                CSV
            </motion.button>

            <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onExportExcel(grades)}
                disabled={!!exporting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-xl bg-card text-foreground hover:border-emerald-600 hover:text-emerald-700 disabled:opacity-50 transition"
            >
                {exporting === "excel" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                Excel
            </motion.button>

            <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onExportPDF(grades)}
                disabled={!!exporting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition"
            >
                {exporting === "pdf" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                PDF Report
            </motion.button>
        </div>
    );
}
