import { useEffect } from "react"
import { useDirectorStore } from "../store/director.store"

// ─── Overview Hook ────────────────────────────────────────────────────────────

export function useDirectorOverview() {
  const {
    overview,
    enrollmentData,
    facultyDistribution,
    loading,
    errors,
    fetchOverview,
  } = useDirectorStore()

  useEffect(() => {
    if (!overview) fetchOverview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    overview,
    enrollmentData,
    facultyDistribution,
    isLoading: !!loading["overview"],
    error: errors["overview"],
    refetch: fetchOverview,
  }
}

// ─── Financial Hook ───────────────────────────────────────────────────────────

export function useDirectorFinancial() {
  const {
    financialSummary,
    paymentRecords,
    pagination,
    filter,
    loading,
    errors,
    fetchFinancialSummary,
    setFilter,
    resetFilter,
    setPagination,
  } = useDirectorStore()

  useEffect(() => {
    fetchFinancialSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    financialSummary,
    paymentRecords,
    pagination,
    filter,
    isLoading: !!loading["financial"],
    error: errors["financial"],
    setFilter,
    resetFilter,
    setPagination,
    refetch: fetchFinancialSummary,
  }
}

// ─── Statistical Hook ─────────────────────────────────────────────────────────

export function useDirectorStatistical() {
  const {
    statisticalReport,
    filter,
    loading,
    errors,
    fetchStatisticalReport,
    setFilter,
    resetFilter,
  } = useDirectorStore()

  useEffect(() => {
    fetchStatisticalReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    statisticalReport,
    filter,
    isLoading: !!loading["statistical"],
    error: errors["statistical"],
    setFilter,
    resetFilter,
    refetch: fetchStatisticalReport,
  }
}

// Grades hook now lives in ./use-director-grades.ts (React Query-backed) —
// see sandbox/result/missing_grade_apis.readme.md §8.
