"use client";

import { useCallback, useState } from "react";
import type { Grade, ExportFormat } from "../types/grades.types";
import { gradesService } from "../services/grades.service";

export function useGradesExport() {
    const [exporting, setExporting] = useState<ExportFormat | null>(null);

    const downloadBlob = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const exportCSV = useCallback(async (grades: Grade[]) => {
        setExporting("csv");
        try {
            await new Promise((res) => setTimeout(res, 250));
            const csv = gradesService.exportToCSV(grades);
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            downloadBlob(blob, `grades-report-${new Date().toISOString().split("T")[0]}.csv`);
        } finally {
            setExporting(null);
        }
    }, []);

    const exportExcel = useCallback(async (grades: Grade[]) => {
        setExporting("excel");
        try {
            await new Promise((res) => setTimeout(res, 400));
            // LIVE: use xlsx (SheetJS) for proper Excel files
            const csv = gradesService.exportToCSV(grades);
            const blob = new Blob([csv], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            downloadBlob(blob, `grades-report-${new Date().toISOString().split("T")[0]}.xlsx`);
        } finally {
            setExporting(null);
        }
    }, []);

    const exportPDF = useCallback(async (grades: Grade[]) => {
        setExporting("pdf");
        try {
            await new Promise((res) => setTimeout(res, 600));
            // LIVE: use jsPDF or server-side puppeteer
            gradesService.exportToPDF(grades);
        } finally {
            setExporting(null);
        }
    }, []);

    return { exporting, exportCSV, exportExcel, exportPDF };
}
