"use client";

import { useMemo } from "react";
import { useAuditStore } from "../store/audit.store";
import type { AuditQueryParams } from "../types/audit.types";

interface UseAuditFiltersReturn {
   filters: AuditQueryParams;
   activeFilterCount: number;
   hasActiveFilters: boolean;
   setFilters: (partial: Partial<AuditQueryParams>) => void;
   resetFilters: () => void;
   setPage: (page: number) => void;
   setSearch: (search: string) => void;
}

/**
 * Convenience hook that wraps the audit store's filter state
 * and derives useful computed values.
 */
export function useAuditFilters(): UseAuditFiltersReturn {
   const { filters, setFilters, resetFilters } = useAuditStore();

   const activeFilterCount = useMemo(() => {
      return [
         filters.action,
         filters.entityType,
         filters.startDate,
         filters.endDate,
         filters.academicYear,
         filters.semester,
      ].filter(Boolean).length;
   }, [filters]);

   return {
      filters,
      activeFilterCount,
      hasActiveFilters: activeFilterCount > 0,
      setFilters,
      resetFilters,
      setPage: (page) => setFilters({ page }),
      setSearch: (search) => setFilters({ search, page: 1 }),
   };
}
