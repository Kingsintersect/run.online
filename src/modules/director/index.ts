// ─── Director Feature — Public API ──────────────────────────────────────────
// Import from "@/features/director" for clean imports anywhere in the app.

// Types
export * from "./types/director.types"

// Schemas
export * from "./schemas/director.schemas"

// Service (rarely needed directly — prefer the store/hooks)
export { directorService } from "./services/director.service"

// Store
export { useDirectorStore } from "./store/director.store"

// Hooks
export {
  useDirectorOverview,
  useDirectorFinancial,
  useDirectorStatistical,
} from "./hooks/useDirectorData"
export { useDirectorGrades } from "./hooks/use-director-grades"

// Components
export { MetricCard, MetricsGrid } from "./components/MetricCard"
export { DirectorFilterBar } from "./components/DirectorFilterBar"
export { DataTable, StatusBadge } from "./components/DataTable"
export type { Column } from "./components/DataTable"
export {
  EnrollmentAreaChart,
  FacultyPieChart,
  RevenueBarChart,
  FeeTypeRevenueChart,
  GradeRadarChart,
  GpaLineChart,
  GenderPieChart,
} from "./components/charts/DirectorCharts"
