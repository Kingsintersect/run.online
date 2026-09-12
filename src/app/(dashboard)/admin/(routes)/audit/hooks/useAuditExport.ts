"use client";

import { useCallback, useState } from "react";
import { useAuditStore } from "../store/audit.store";
import type { AuditLog, ExportFormat } from "../types/audit.types";
import { exportAuditLogs } from "@/app/(dashboard)/admin/(routes)/audit/types/export.utils";

interface UseAuditExportOptions {
   logs: AuditLog[];
   filenamePrefix?: string;
}

interface UseAuditExportReturn {
   isExporting: boolean;
   exportingFormat: ExportFormat | null;
   handleExport: (format: ExportFormat) => Promise<void>;
   selectedCount: number;
   hasSelection: boolean;
}

/**
 * Hook that wires selected-row state from the audit store into the export utility.
 * When rows are selected, only those rows are exported; otherwise all passed logs.
 */
export function useAuditExport({
   logs,
   filenamePrefix = "audit-logs",
}: UseAuditExportOptions): UseAuditExportReturn {
   const { selectedIds } = useAuditStore();
   const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);

   const hasSelection = selectedIds.size > 0;
   const exportLogs = hasSelection
      ? logs.filter((l) => selectedIds.has(l.id))
      : logs;

   const handleExport = useCallback(
      async (format: ExportFormat) => {
         if (exportingFormat) return;
         setExportingFormat(format);
         const filename = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}`;
         try {
            await exportAuditLogs(exportLogs, format, filename);
         } finally {
            setExportingFormat(null);
         }
      },
      [exportingFormat, exportLogs, filenamePrefix]
   );

   return {
      isExporting: exportingFormat !== null,
      exportingFormat,
      handleExport,
      selectedCount: exportLogs.length,
      hasSelection,
   };
}
