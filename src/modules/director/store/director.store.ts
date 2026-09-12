import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { DirectorStore, DirectorFilter } from "../types/director.types"
import { directorService } from "../services/director.service"

const DEFAULT_FILTER: DirectorFilter = {
  faculty: "all",
  department: "all",
  academicYear: "2024/2025",
  semester: "all",
  level: "all",
  status: "all",
  search: "",
}

export const useDirectorStore = create<DirectorStore>()(
  devtools(
    (set, get) => ({
      // ── State ──────────────────────────────────────────────────────────────
      overview: null,
      enrollmentData: [],
      facultyDistribution: [],
      financialSummary: null,
      paymentRecords: [],
      statisticalReport: null,
      filter: DEFAULT_FILTER,
      pagination: { page: 1, pageSize: 20, total: 0 },
      loading: {},
      errors: {},

      // ── Helpers ────────────────────────────────────────────────────────────
      setLoading: (key, value) =>
        set((s) => ({ loading: { ...s.loading, [key]: value } })),

      setError: (key, error) =>
        set((s) => ({ errors: { ...s.errors, [key]: error } })),

      setFilter: (partial) =>
        set((s) => ({
          filter: { ...s.filter, ...partial },
          pagination: { ...s.pagination, page: 1 },
        })),

      resetFilter: () =>
        set({
          filter: DEFAULT_FILTER,
          pagination: { page: 1, pageSize: 20, total: 0 },
        }),

      setPagination: (partial) =>
        set((s) => ({ pagination: { ...s.pagination, ...partial } })),

      // ── Fetch Actions ──────────────────────────────────────────────────────

      // Overview composes 3 independently-mature endpoints (real faculty/
      // program counts, a proposed /users/stats, a proposed enrollment
      // trend) — allSettled so one unshipped/failing proposed endpoint
      // doesn't blank out the parts that are already real.
      fetchOverview: async () => {
        const { setLoading, setError } = get()
        setLoading("overview", true)
        setError("overview", null)
        const [overviewResult, enrollmentResult, facultyResult] =
          await Promise.allSettled([
            directorService.fetchOverview(),
            directorService.fetchEnrollmentData(),
            directorService.fetchFacultyDistribution(),
          ])

        if (overviewResult.status === "fulfilled")
          set({ overview: overviewResult.value })
        set({
          enrollmentData:
            enrollmentResult.status === "fulfilled"
              ? enrollmentResult.value
              : [],
          facultyDistribution:
            facultyResult.status === "fulfilled" ? facultyResult.value : [],
        })
        if (overviewResult.status === "rejected") {
          setError(
            "overview",
            overviewResult.reason instanceof Error
              ? overviewResult.reason.message
              : "Failed to load overview"
          )
        } else if (overviewResult.value.hasLoadErrors) {
          // fetchOverview() itself never rejects (it's already an inner
          // allSettled) — hasLoadErrors is how it reports that some of its
          // own sub-fetches failed, so the page's existing error banner
          // shows up instead of the dashboard silently looking complete
          // with fabricated zeros. See DashboardOverview.hasLoadErrors.
          setError(
            "overview",
            "Some figures on this dashboard couldn't be loaded (permission-restricted for your role) and show as —."
          )
        }
        setLoading("overview", false)
      },

      // Same reasoning as fetchOverview — the fees summary (mostly real)
      // and payment records (proposed admin-list shape) are independent
      // enough in maturity that one failing shouldn't blank the other.
      fetchFinancialSummary: async (filter) => {
        const { setLoading, setError } = get()
        setLoading("financial", true)
        setError("financial", null)
        const f = filter ?? get().filter
        const [summaryResult, paymentResult] = await Promise.allSettled([
          directorService.fetchFinancialSummary(f),
          directorService.fetchPaymentRecords(f),
        ])

        if (summaryResult.status === "fulfilled")
          set({ financialSummary: summaryResult.value })
        if (paymentResult.status === "fulfilled") {
          set({
            paymentRecords: paymentResult.value.records,
            pagination: {
              ...get().pagination,
              total: paymentResult.value.total,
            },
          })
        } else {
          set({ paymentRecords: [] })
        }
        if (
          summaryResult.status === "rejected" &&
          paymentResult.status === "rejected"
        ) {
          setError("financial", "Failed to load financial data")
        } else if (
          summaryResult.status === "fulfilled" &&
          summaryResult.value.hasLoadErrors
        ) {
          // fetchFinancialSummary() never rejects (its own inner
          // allSettled) — hasLoadErrors is how it reports that some of its
          // sub-fetches 403'd. See DashboardOverview.hasLoadErrors.
          setError(
            "financial",
            "Some figures on this page couldn't be loaded (permission-restricted for your role) and show as —."
          )
        }
        setLoading("financial", false)
      },

      fetchStatisticalReport: async (filter) => {
        const { setLoading, setError } = get()
        setLoading("statistical", true)
        setError("statistical", null)
        try {
          const f = filter ?? get().filter
          const report = await directorService.fetchStatisticalReport(f)
          set({ statisticalReport: report })
          // fetchStatisticalReport() never rejects (its own inner
          // allSettled) — hasLoadErrors is how it reports that some of its
          // sub-fetches 403'd. See DashboardOverview.hasLoadErrors.
          if (report.hasLoadErrors) {
            setError(
              "statistical",
              "Some figures on this page couldn't be loaded (permission-restricted for your role)."
            )
          }
        } catch (err: unknown) {
          setError(
            "statistical",
            err instanceof Error
              ? err.message
              : "Failed to load statistical report"
          )
        } finally {
          setLoading("statistical", false)
        }
      },

      // Grade report data fetching has moved to React Query
      // (../hooks/use-director-grades.ts) — this store still owns the
      // shared `filter` state that screen reads from, but no longer
      // fetches or caches the report itself.
    }),
    { name: "DirectorStore" }
  )
)
