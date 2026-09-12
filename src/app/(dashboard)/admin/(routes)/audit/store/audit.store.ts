"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { AuditLog, AuditQueryParams, AuditStats } from "../types/audit.types";

// ─── State shape ──────────────────────────────────────────────────────────────

interface AuditState {
  // Filters
  filters: AuditQueryParams;
  setFilters: (filters: Partial<AuditQueryParams>) => void;
  resetFilters: () => void;

  // Selected log for detail modal
  selectedLog: AuditLog | null;
  setSelectedLog: (log: AuditLog | null) => void;

  // UI state
  isFilterPanelOpen: boolean;
  setFilterPanelOpen: (open: boolean) => void;

  isDetailModalOpen: boolean;
  setDetailModalOpen: (open: boolean) => void;

  // Stats cache
  stats: AuditStats | null;
  setStats: (stats: AuditStats) => void;

  // View mode
  viewMode: "table" | "timeline" | "grouped";
  setViewMode: (mode: "table" | "timeline" | "grouped") => void;

  // Grouping
  groupBy: "academicYear" | "semester" | "program" | null;
  setGroupBy: (groupBy: "academicYear" | "semester" | "program" | null) => void;

  // Selected rows for bulk export
  selectedIds: Set<number>;
  toggleSelectedId: (id: number) => void;
  selectAllIds: (ids: number[]) => void;
  clearSelectedIds: () => void;
}

// ─── Default filters ──────────────────────────────────────────────────────────

const DEFAULT_FILTERS: AuditQueryParams = {
  page: 1,
  limit: 10,
  action: "",
  entityType: "",
  search: "",
  startDate: "",
  endDate: "",
  semester: "",
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuditStore = create<AuditState>()(
  devtools(
    (set) => ({
      // Filters
      filters: DEFAULT_FILTERS,
      setFilters: (partial) =>
        set((s) => ({
          filters: { ...s.filters, ...partial, page: partial.page ?? 1 },
        })),
      resetFilters: () => set({ filters: DEFAULT_FILTERS }),

      // Selected log
      selectedLog: null,
      setSelectedLog: (log) => set({ selectedLog: log }),

      // UI
      isFilterPanelOpen: false,
      setFilterPanelOpen: (open) => set({ isFilterPanelOpen: open }),

      isDetailModalOpen: false,
      setDetailModalOpen: (open) => set({ isDetailModalOpen: open }),

      // Stats
      stats: null,
      setStats: (stats) => set({ stats }),

      // View
      viewMode: "table",
      setViewMode: (viewMode) => set({ viewMode }),

      // Grouping
      groupBy: null,
      setGroupBy: (groupBy) => set({ groupBy }),

      // Selection
      selectedIds: new Set<number>(),
      toggleSelectedId: (id) =>
        set((s) => {
          const next = new Set(s.selectedIds);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return { selectedIds: next };
        }),
      selectAllIds: (ids) => set({ selectedIds: new Set(ids) }),
      clearSelectedIds: () => set({ selectedIds: new Set<number>() }),
    }),
    { name: "audit-store" }
  )
);
