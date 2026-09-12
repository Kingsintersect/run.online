"use client";

import { FileText, FileSpreadsheet, Printer, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuditExport } from "../hooks/useAuditExport";
import type { AuditLog, ExportFormat } from "../types/audit.types";

// ─── Options ─────────────────────────────────────────────────────────────────

interface ExportOption {
    format: ExportFormat;
    label: string;
    desc: string;
    icon: React.ElementType;
}

const EXPORT_OPTIONS: ExportOption[] = [
    { format: "csv", icon: FileText, label: "Export CSV", desc: "Comma-separated values" },
    { format: "excel", icon: FileSpreadsheet, label: "Export Excel", desc: "Microsoft Excel (.xls)" },
    { format: "pdf", icon: Printer, label: "Print / PDF", desc: "Browser print dialog" },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface ExportMenuProps {
    logs: AuditLog[];
    filenamePrefix?: string;
}

export function ExportMenu({ logs, filenamePrefix = "audit-logs" }: ExportMenuProps) {
    const { isExporting, exportingFormat, handleExport, selectedCount, hasSelection } =
        useAuditExport({ logs, filenamePrefix });

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={isExporting}
                    className="gap-1.5"
                >
                    {isExporting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Download className="h-3.5 w-3.5" />
                    )}
                    <span className="hidden sm:inline">Export</span>
                    {hasSelection && (
                        <span className="ml-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                            {selectedCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-[10px] text-muted-foreground font-normal">
                    {hasSelection ? `${selectedCount} selected rows` : `All ${logs.length} rows`}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {EXPORT_OPTIONS.map(({ format, icon: Icon, label, desc }) => (
                    <DropdownMenuItem
                        key={format}
                        onClick={() => handleExport(format)}
                        disabled={isExporting}
                        className="flex items-start gap-2.5 cursor-pointer"
                    >
                        {exportingFormat === format ? (
                            <Loader2 className="mt-0.5 h-4 w-4 animate-spin shrink-0 text-muted-foreground" />
                        ) : (
                            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <div>
                            <p className="text-sm font-medium">{label}</p>
                            <p className="text-[10px] text-muted-foreground">{desc}</p>
                        </div>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
