"use client"

import { useEffect, useState } from "react"
import {
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import {
  useDirectorGrades,
  GpaLineChart,
  GradeRadarChart,
  StatusBadge,
} from "@/modules/director"
import { useSessionOptions } from "@/hooks/use-session-options"
import { useSemesters } from "@/hooks/useSemesters"
import { useAllPrograms } from "@/hooks/useCourseStructure"
import { MajorProgramFilterTabs } from "@/components/custom/MajorProgramFilterTabs"
import {
  useGrades,
  useGradeDistributionData,
} from "@/modules/student-grades/hooks/use-grades-data"
import { PermissionGate } from "@/lib/permissions/PermissionGate"

// ─── Page ─────────────────────────────────────────────────────────────────────
// Real endpoint per bruno/director/Grade Reports - Summary.bru accepts only
// an optional `semesterId` filter and returns `{overall, byFaculty,
// byProgram}` — no per-student records and no grade-distribution breakdown,
// unlike the earlier proposed contract this page was built against (see
// sandbox/TRIPLE_AUDIT_2026-09-13.md §1a). Both features are restored below,
// sourced from the real, already-live `/results/grades` (per-course grade
// records, filterable by semester) and `/results/grades/distribution`
// (institution-wide, not semester-filterable — noted in the UI) endpoints
// instead of the director-summary endpoint, which never provided them.

export default function GradeReportsPage() {
  const {
    gradeReport: report,
    semesterId,
    setSemesterId,
    majorProgramId: majorProgramFilter,
    setMajorProgramId: setMajorProgramFilter,
    isLoading,
    error,
    refetch,
  } = useDirectorGrades()

  const [sessionId, setSessionId] = useState<number | null>(null)
  // Sessions labelled with their major program — identical names otherwise.
  const { options: sessionOptions } = useSessionOptions()
  const { data: semesters = [] } = useSemesters(sessionId)
  // byProgram has no program id, only a display name — the real filter is
  // majorProgramId sent to the endpoint (A15, unconfirmed). Meanwhile,
  // best-effort narrow the already-loaded breakdown by matching its name
  // against programs known to belong to the selected major program; an
  // unmatched or renamed program name just won't be filtered out, rather
  // than the whole breakdown disappearing.
  const { data: programsRes } = useAllPrograms()
  const programNamesInMajorProgram = new Set(
    (programsRes?.data ?? [])
      .filter((p) => p.majorProgramId === majorProgramFilter)
      .map((p) => p.name)
  )
  const byProgram = majorProgramFilter
    ? (report?.byProgram ?? []).filter((entry) =>
        programNamesInMajorProgram.has(entry.program)
      )
    : (report?.byProgram ?? [])

  const {
    grades: records,
    loading: recordsLoading,
    pagination: recordsPagination,
    updateFilters: updateRecordsFilters,
    goToPage: goToRecordsPage,
  } = useGrades(10)

  useEffect(() => {
    updateRecordsFilters({
      semesterId: semesterId ? String(semesterId) : "all",
      // Major-Program Scoping — sandbox/major-program-scoping/
      // API_CONTRACTS.md A35. Sent ahead of the backend per CLAUDE.md §14;
      // Grade rows have no program id to filter by client-side either (see
      // grades.service.ts's getGrades).
      majorProgramId: majorProgramFilter,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semesterId, majorProgramFilter])

  // Major-Program Scoping — sent ahead of the backend too (A35); this
  // endpoint has no per-program breakdown at all (grouped by grade letter),
  // so there's no client-side fallback to pair it with, same as
  // GradesSummaryPage's identical caveat for this endpoint.
  const { data: distribution = [], isLoading: distributionLoading } =
    useGradeDistributionData(majorProgramFilter)

  return (
    <PermissionGate
      require={{ resource: "results", action: "view.all" }}
      denyBehavior="screen"
    >
      <>
        {/* Header */}
        <div className="page-header">
          <div className="page-header-text">
            <h2>Grade Reports</h2>
            <p>
              School-wide academic performance, by faculty and by program —
              based on published results only
            </p>
          </div>
          <button
            className="btn-refresh"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw size={15} className={isLoading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>

        {error && (
          <div className="error-banner" role="alert">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Major-Program Scoping — sandbox/major-program-scoping/
            FRONTEND_IMPLEMENTATION_PLAN.md §7. Was <MajorProgramTabs>, the
            SUPER_ADMIN institution-config variant that lists every major
            program regardless of caller scope — wrong for Director, a
            scoped role browsing reports. Swapped for the scope-aware
            <MajorProgramFilterTabs>, matching the same fix already applied
            to Admin/Dean's Students screen (BACKEND_DEVIATIONS_2026-09-14.md
            A30). Renders nothing for an unscoped or single-major-program
            Director, same as before this fix. */}
        <MajorProgramFilterTabs
          value={majorProgramFilter}
          onChange={setMajorProgramFilter}
        />

        {/* Semester filter — the only filter the real endpoint accepts */}
        <div className="semester-filter-row">
          <div className="semester-filter-field">
            <label>Session</label>
            <select
              value={sessionId ?? ""}
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : null
                setSessionId(v)
                setSemesterId(null)
              }}
            >
              <option value="">All sessions</option>
              {sessionOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="semester-filter-field">
            <label>Semester</label>
            <select
              value={semesterId ?? ""}
              onChange={(e) =>
                setSemesterId(e.target.value ? Number(e.target.value) : null)
              }
              disabled={!sessionId}
            >
              <option value="">All semesters</option>
              {semesters.map((sem) => (
                <option key={sem.id} value={sem.id}>
                  {sem.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* KPI */}
        <div className="grade-kpi-row">
          {[
            {
              label: "Average GPA",
              value: report ? report.overall.averageGPA.toFixed(2) : "—",
              sub: "out of 5.0",
              color: "primary",
            },
            {
              label: "Pass Rate",
              value: report ? `${report.overall.passRate}%` : "—",
              sub: "passed semester",
              color: "success",
            },
            {
              label: "Distinction Rate",
              value: report ? `${report.overall.distinctionRate}%` : "—",
              sub: "GPA ≥ 4.5",
              color: "accent",
            },
            {
              label: "Assessed Records",
              value: report
                ? report.overall.totalRecords.toLocaleString()
                : "—",
              sub: "student records",
              color: "warning",
            },
          ].map((k) => (
            <div
              key={k.label}
              className={`grade-kpi-card grade-kpi--${k.color}`}
            >
              {isLoading ? (
                <div className="kpi-sk" />
              ) : (
                <>
                  <span className="gkpi-value">{k.value}</span>
                  <span className="gkpi-label">{k.label}</span>
                  <span className="gkpi-sub">{k.sub}</span>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Grade Distribution — institution-wide, not scoped to the session/
            semester picker above (the real /results/grades/distribution
            endpoint takes no filters) */}
        {!distributionLoading && distribution.length > 0 && (
          <div className="grade-dist-row">
            {distribution.map((gd) => (
              <div key={gd.grade} className="grade-dist-pill">
                <span className="grade-letter" style={{ color: gd.color }}>
                  {gd.grade}
                </span>
                <span className="grade-count">{gd.count.toLocaleString()}</span>
                <span className="grade-pct">{gd.percentage}%</span>
              </div>
            ))}
          </div>
        )}

        {/* Charts */}
        <div className="section-divider">
          <h2>Performance Analytics</h2>
        </div>
        <div className="charts-grid-2">
          <GradeRadarChart
            data={distribution}
            isLoading={distributionLoading}
          />
          <GpaLineChart data={report?.byFaculty ?? []} isLoading={isLoading} />
        </div>

        {/* Faculty GPA table */}
        <div className="section-divider">
          <h2>GPA by Faculty</h2>
        </div>
        <div className="faculty-gpa-wrap">
          <table className="faculty-gpa-table">
            <thead>
              <tr>
                <th>Faculty</th>
                <th>Students</th>
                <th>Avg GPA</th>
                <th>Performance</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }, (_, i) => (
                    <tr key={i}>
                      {[1, 2, 3, 4].map((j) => (
                        <td key={j}>
                          <div className="kpi-sk" />
                        </td>
                      ))}
                    </tr>
                  ))
                : (report?.byFaculty ?? []).map((f) => (
                    <tr key={f.faculty}>
                      <td className="fac-name">{f.faculty}</td>
                      <td>{f.studentCount.toLocaleString()}</td>
                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            color:
                              f.averageGPA >= 3.5
                                ? "oklch(0.45 0.18 145)"
                                : f.averageGPA < 2
                                  ? "var(--destructive)"
                                  : "var(--foreground)",
                          }}
                        >
                          {f.averageGPA.toFixed(2)}
                        </span>
                      </td>
                      <td>
                        <div className="gpa-bar-wrap">
                          <div
                            className="gpa-bar"
                            style={{ width: `${(f.averageGPA / 5) * 100}%` }}
                          />
                          <span className="gpa-bar-label">
                            {((f.averageGPA / 5) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Program GPA table */}
        <div className="section-divider">
          <h2>GPA by Program</h2>
        </div>
        <div className="faculty-gpa-wrap">
          <table className="faculty-gpa-table">
            <thead>
              <tr>
                <th>Program</th>
                <th>Students</th>
                <th>Avg GPA</th>
                <th>Performance</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }, (_, i) => (
                  <tr key={i}>
                    {[1, 2, 3, 4].map((j) => (
                      <td key={j}>
                        <div className="kpi-sk" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : byProgram.length === 0 ? (
                <tr>
                  <td colSpan={4} className="et-empty">
                    No program-level data for the selected filter.
                  </td>
                </tr>
              ) : (
                byProgram.map((p) => (
                  <tr key={p.program}>
                    <td className="fac-name">{p.program}</td>
                    <td>{p.studentCount.toLocaleString()}</td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color:
                            p.averageGPA >= 3.5
                              ? "oklch(0.45 0.18 145)"
                              : p.averageGPA < 2
                                ? "var(--destructive)"
                                : "var(--foreground)",
                        }}
                      >
                        {p.averageGPA.toFixed(2)}
                      </span>
                    </td>
                    <td>
                      <div className="gpa-bar-wrap">
                        <div
                          className="gpa-bar"
                          style={{ width: `${(p.averageGPA / 5) * 100}%` }}
                        />
                        <span className="gpa-bar-label">
                          {((p.averageGPA / 5) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Student Grade Records — real, paginated per-course grade rows
            from /results/grades, filtered by the session/semester picker
            above. Flatter than the earlier proposed shape (one row per
            student per course, not a per-semester summary with an
            expandable course breakdown) since that aggregate isn't
            something the real API computes for us.

            Not yet filtered by the major-program tab above (only the KPIs
            and the by-program table are): GradeFilters.programId only takes
            one program at a time, and "every program under this major
            program" can't be expressed through it without either a real
            majorProgramId filter on /results/grades or issuing one request
            per program — left as a known gap rather than faking it. */}
        <div className="section-divider">
          <h2>Student Grade Records</h2>
        </div>
        <div className="expandable-table-wrap">
          <div className="et-scroll">
            <table className="et-table">
              <thead>
                <tr>
                  <th>Matric No.</th>
                  <th>Student</th>
                  <th>Course</th>
                  <th style={{ textAlign: "center" }}>Units</th>
                  <th style={{ textAlign: "center" }}>Score</th>
                  <th style={{ textAlign: "center" }}>Grade</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                  <th style={{ textAlign: "center" }}>Fees</th>
                </tr>
              </thead>
              <tbody>
                {recordsLoading ? (
                  Array.from({ length: 8 }, (_, i) => (
                    <tr key={i} className="sk-row">
                      {Array.from({ length: 8 }, (__, j) => (
                        <td key={j}>
                          <div className="sk-cell" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="et-empty">
                      No grade records match the selected filters.
                    </td>
                  </tr>
                ) : (
                  records.map((g) => (
                    <tr key={g.id} className="et-row">
                      <td className="mono">{g.studentMatric}</td>
                      <td>{g.studentName}</td>
                      <td>
                        {g.courseCode} — {g.courseName}
                      </td>
                      <td style={{ textAlign: "center" }}>{g.creditUnits}</td>
                      <td style={{ textAlign: "center" }}>
                        {g.totalScore ?? "—"}
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>
                        {g.gradeLetter ?? "—"}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <StatusBadge status={g.status} />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {g.hasOutstandingFees ? (
                          <span className="fee-flag">Outstanding</span>
                        ) : (
                          <span className="fee-ok">Cleared</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {recordsPagination.totalPages > 1 && (
            <div className="et-pagination">
              <span>
                Page {recordsPagination.page} of {recordsPagination.totalPages}{" "}
                · {recordsPagination.total.toLocaleString()} records
              </span>
              <div className="et-pagination-buttons">
                <button
                  onClick={() => goToRecordsPage(recordsPagination.page - 1)}
                  disabled={recordsPagination.page <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => goToRecordsPage(recordsPagination.page + 1)}
                  disabled={
                    recordsPagination.page >= recordsPagination.totalPages
                  }
                  aria-label="Next page"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        <style jsx>{`
          .btn-refresh {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            border: 1px solid var(--border);
            background: var(--card);
            color: var(--foreground);
            font-size: 0.8125rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s;
          }
          .btn-refresh:hover:not(:disabled) {
            background: var(--muted);
          }
          .btn-refresh:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          .spin {
            animation: rotate 1s linear infinite;
          }
          @keyframes rotate {
            to {
              transform: rotate(360deg);
            }
          }

          .semester-filter-row {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            margin-bottom: 1.25rem;
          }
          .semester-filter-field {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .semester-filter-field label {
            font-size: 0.7rem;
            font-weight: 600;
            color: var(--muted-foreground);
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .semester-filter-field select {
            padding: 0.5rem 0.75rem;
            border-radius: 8px;
            border: 1px solid var(--border);
            background: var(--card);
            color: var(--foreground);
            font-size: 0.8125rem;
            min-width: 180px;
          }
          .semester-filter-field select:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          /* KPI */
          .grade-kpi-row {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 1rem;
            margin-bottom: 1rem;
          }
          .grade-kpi-card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 1.1rem 1.25rem;
            display: flex;
            flex-direction: column;
            gap: 3px;
            position: relative;
            overflow: hidden;
          }
          .grade-kpi-card::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            border-radius: 14px 14px 0 0;
          }
          .grade-kpi--primary::before {
            background: var(--primary);
          }
          .grade-kpi--success::before {
            background: oklch(0.55 0.18 145);
          }
          .grade-kpi--accent::before {
            background: var(--accent);
          }
          .grade-kpi--warning::before {
            background: oklch(0.72 0.18 70);
          }

          .gkpi-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--foreground);
            line-height: 1.1;
          }
          .gkpi-label {
            font-size: 0.78rem;
            font-weight: 600;
            color: var(--foreground);
          }
          .gkpi-sub {
            font-size: 0.7rem;
            color: var(--muted-foreground);
          }

          /* Grade distribution pills */
          .grade-dist-row {
            display: flex;
            gap: 0.75rem;
            flex-wrap: wrap;
            margin-bottom: 1.5rem;
          }
          .grade-dist-pill {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 0.6rem 1rem;
            min-width: 64px;
          }
          .grade-letter {
            font-size: 1.2rem;
            font-weight: 800;
          }
          .grade-count {
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--foreground);
          }
          .grade-pct {
            font-size: 0.7rem;
            color: var(--muted-foreground);
          }

          /* Faculty/Program GPA table */
          .faculty-gpa-wrap {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 14px;
            overflow: hidden;
            margin-bottom: 1.5rem;
          }
          .faculty-gpa-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.8125rem;
          }
          .faculty-gpa-table thead tr {
            background: var(--muted);
            border-bottom: 1px solid var(--border);
          }
          .faculty-gpa-table th {
            padding: 0.7rem 1rem;
            font-size: 0.72rem;
            font-weight: 600;
            color: var(--muted-foreground);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            text-align: left;
          }
          .faculty-gpa-table td {
            padding: 0.65rem 1rem;
            border-bottom: 1px solid var(--border);
            color: var(--foreground);
          }
          .faculty-gpa-table tr:last-child td {
            border-bottom: none;
          }
          .fac-name {
            font-weight: 500;
          }
          .gpa-bar-wrap {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .gpa-bar {
            height: 7px;
            border-radius: 99px;
            background: var(--primary);
            min-width: 4px;
            max-width: 200px;
          }
          .gpa-bar-label {
            font-size: 0.72rem;
            color: var(--muted-foreground);
          }
          .et-empty {
            text-align: center;
            padding: 2rem 1rem !important;
            color: var(--muted-foreground);
            font-style: italic;
          }

          /* Student Grade Records table */
          .expandable-table-wrap {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 14px;
            overflow: hidden;
            margin-bottom: 1.5rem;
          }
          .et-scroll {
            overflow-x: auto;
          }
          .et-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.8rem;
          }
          .et-table thead tr {
            background: var(--muted);
            border-bottom: 1px solid var(--border);
          }
          .et-table th {
            padding: 0.65rem 0.875rem;
            font-weight: 600;
            font-size: 0.7rem;
            color: var(--muted-foreground);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            white-space: nowrap;
          }
          .et-row td {
            padding: 0.6rem 0.875rem;
            border-bottom: 1px solid var(--border);
            color: var(--foreground);
            vertical-align: middle;
          }
          .et-row:hover td {
            background: color-mix(in oklch, var(--primary) 4%, transparent);
          }
          .mono {
            font-family: "IBM Plex Mono", monospace;
            font-size: 0.78rem;
          }
          .fee-flag {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 999px;
            font-size: 0.68rem;
            font-weight: 600;
            background: color-mix(
              in oklch,
              var(--destructive) 12%,
              transparent
            );
            color: var(--destructive);
          }
          .fee-ok {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 999px;
            font-size: 0.68rem;
            font-weight: 600;
            background: oklch(0.55 0.18 145 / 12%);
            color: oklch(0.45 0.18 145);
          }
          .sk-row td {
            padding: 0.9rem 0.875rem;
          }
          .sk-cell {
            height: 13px;
            border-radius: 4px;
            background: color-mix(
              in oklch,
              var(--muted-foreground) 16%,
              transparent
            );
            animation: pulse 1.4s ease-in-out infinite;
            width: 80%;
          }
          .et-pagination {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.75rem 1rem;
            border-top: 1px solid var(--border);
            font-size: 0.75rem;
            color: var(--muted-foreground);
          }
          .et-pagination-buttons {
            display: flex;
            gap: 0.5rem;
          }
          .et-pagination-buttons button {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border-radius: 8px;
            border: 1px solid var(--border);
            background: var(--card);
            color: var(--foreground);
            cursor: pointer;
          }
          .et-pagination-buttons button:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }
          .kpi-sk {
            height: 14px;
            border-radius: 4px;
            background: color-mix(
              in oklch,
              var(--muted-foreground) 16%,
              transparent
            );
            animation: pulse 1.4s ease-in-out infinite;
            width: 65%;
          }
          @keyframes pulse {
            0%,
            100% {
              opacity: 1;
            }
            50% {
              opacity: 0.4;
            }
          }
        `}</style>
      </>
    </PermissionGate>
  )
}
