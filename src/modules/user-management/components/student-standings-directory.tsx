"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronRight, GraduationCap, Loader2, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import StatusBadge from "@/components/custom/StatusBadge"
import { cn } from "@/lib/utils"
import { TeachingScopeSelect } from "@/components/teaching-scope-select"
import { useMyTeachingScope } from "@/hooks/use-my-teaching-scope"
import { RunPagination } from "@/modules/progression/components/run-pagination"
import { QueryError } from "@/modules/progression/components/standing-states"
import { NotAvailableNotice } from "@/modules/student-grades/_components/results/not-available-notice"
import type { Student, StudentStatus } from "@/types/users"
import {
  useStudentDirectory,
  type StudentDirectoryResult,
} from "../hooks/use-student-directory"
import { StudentStandingDrawer } from "./student-standing-drawer"

const PAGE_SIZES = [10, 20, 50] as const
const SEARCH_DEBOUNCE_MS = 350

const statusVariant: Record<
  StudentStatus,
  "success" | "warning" | "destructive" | "info" | "default" | "orange"
> = {
  ACTIVE: "success",
  GRADUATED: "info",
  WITHDRAWN: "destructive",
  SUSPENDED: "warning",
  RUSTICATED: "destructive",
  DEFERRED: "orange",
}

// Read-only student directory for HOD (and anyone else holding
// standings.view on the /tutor routes). Search and paging are server-side;
// selecting a student opens their academic standing in a side drawer.
//
// Scoped to where the user teaches or heads (useMyTeachingScope): they pick
// one of those major programs, then a program, and only those students load.
// Nothing loads before a major program is chosen, and programs they neither
// teach in nor head are never offered.
export function StudentStandingsDirectory() {
  const scope = useMyTeachingScope()
  const [page, setPage] = useState(1)
  const [majorProgramId, setMajorProgramId] = useState<number | null>(null)
  const [programId, setProgramId] = useState<number | null>(null)
  const heads =
    scope.majorPrograms
      .find((mp) => mp.id === majorProgramId)
      ?.reasons.includes("heads") ?? false
  // Where the user only teaches, a program must be chosen.
  const ready = majorProgramId != null && (heads || programId != null)
  const changeScope = useCallback(
    (next: { majorProgramId: number | null; programId: number | null }) => {
      setMajorProgramId(next.majorProgramId)
      setProgramId(next.programId)
      setPage(1)
    },
    []
  )
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [limit, setLimit] = useState<number>(PAGE_SIZES[0])
  const [selected, setSelected] = useState<Student | null>(null)

  useEffect(() => {
    if (searchInput === search) return
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchInput, search])

  const query = useStudentDirectory({
    search,
    page,
    limit,
    majorProgramId: ready ? majorProgramId : null,
    programId,
  })
  const result = query.data
  const unavailable = result?.available === false

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-500/10 p-2.5 dark:bg-emerald-500/20">
            <GraduationCap
              size={22}
              className="text-emerald-600 dark:text-emerald-400"
              aria-hidden
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Students
            </h1>
            <p className="text-sm text-muted-foreground">
              Look up a student to see their academic standing and outstanding
              courses. View only.
            </p>
          </div>
        </div>
        {!unavailable && ready && (
          <div className="relative w-full sm:w-72">
            <Search
              size={14}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name or matric no…"
              aria-label="Search students by name or matric number"
              className="pr-8 pl-8"
            />
            {query.isFetching && !query.isLoading && (
              <Loader2
                size={14}
                className="absolute top-1/2 right-3 -translate-y-1/2 animate-spin text-muted-foreground"
                aria-label="Searching"
              />
            )}
          </div>
        )}
      </header>

      <section
        aria-label="Your programs"
        className="rounded-2xl border border-border bg-card p-4 dark:bg-card/60"
      >
        <TeachingScopeSelect
          idPrefix="students"
          scope={scope}
          majorProgramId={majorProgramId}
          programId={programId}
          onChange={changeScope}
        />
        <p className="mt-2 text-[11px] text-muted-foreground">
          Only the major programs and programs you teach in or head are listed.
        </p>
      </section>

      {scope.isEmpty ? (
        <p className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground dark:bg-muted/20">
          You don&apos;t teach in or head any program yet, so there are no
          students to show. Programs appear here once you&apos;re assigned a
          course or made head of a department.
        </p>
      ) : !ready ? (
        <p className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground dark:bg-muted/20">
          {majorProgramId == null
            ? "Choose one of your major programs to see its students."
            : "Choose one of your programs to see its students."}
        </p>
      ) : (
        <DirectoryBody
          isLoading={query.isLoading}
          isError={query.isError}
          onRetry={() => query.refetch()}
          result={result}
          search={search}
          onSelect={setSelected}
        />
      )}

      {ready && result?.available && (
        <RunPagination
          meta={{
            page,
            limit,
            total: result.total,
            totalPages: result.totalPages,
          }}
          noun="students"
          onPageChange={setPage}
          perPageOptions={PAGE_SIZES}
          onPerPageChange={(n) => {
            setLimit(n)
            setPage(1)
          }}
          disabled={query.isFetching}
        />
      )}

      <StudentStandingDrawer
        student={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}

interface DirectoryBodyProps {
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  result: StudentDirectoryResult | undefined
  search: string
  onSelect: (student: Student) => void
}

function DirectoryBody({
  isLoading,
  isError,
  onRetry,
  result,
  search,
  onSelect,
}: DirectoryBodyProps) {
  if (isLoading)
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading students">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    )
  if (isError || !result)
    return <QueryError message="Couldn't load students." onRetry={onRetry} />
  if (!result.available)
    return (
      <NotAvailableNotice
        title="The student list isn't available to your role yet"
        description={
          result.reason === "forbidden"
            ? "The server doesn't yet let your role list students, so there is no one to pick here. This has been flagged for the backend team; the list will appear here automatically once your role is allowed to see the students in your department."
            : undefined
        }
      />
    )
  if (result.data.length === 0)
    return (
      <p className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground dark:bg-muted/20">
        {search.trim()
          ? `No students match “${search.trim()}”.`
          : "No students to show."}
      </p>
    )

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card dark:bg-card/60">
      <table className="w-full text-sm">
        <caption className="sr-only">
          Students. Select a student to view their academic standing.
        </caption>
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground dark:bg-muted/30">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Student
            </th>
            <th
              scope="col"
              className="hidden px-4 py-3 font-medium md:table-cell"
            >
              Programme
            </th>
            <th scope="col" className="px-4 py-3 text-center font-medium">
              Level
            </th>
            <th
              scope="col"
              className="hidden px-4 py-3 text-center font-medium sm:table-cell"
            >
              Status
            </th>
            <th scope="col" className="w-10 px-2 py-3">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {result.data.map((student) => (
            <StudentRow
              key={student.id}
              student={student}
              onSelect={onSelect}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StudentRow({
  student,
  onSelect,
}: {
  student: Student
  onSelect: (student: Student) => void
}) {
  const name = [student.user.first_name, student.user.last_name]
    .filter(Boolean)
    .join(" ")
  return (
    <tr
      tabIndex={0}
      aria-label={`View academic standing for ${name}, ${student.matric_number}`}
      onClick={() => onSelect(student)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect(student)
        }
      }}
      className={cn(
        "cursor-pointer transition-colors hover:bg-muted/50 dark:hover:bg-muted/30",
        "focus-visible:bg-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
      )}
    >
      <td className="px-4 py-3">
        <p className="font-medium text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">{student.matric_number}</p>
      </td>
      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
        {student.program_name || "—"}
      </td>
      <td className="px-4 py-3 text-center tabular-nums">
        {student.current_level !== null ? `${student.current_level}L` : "—"}
      </td>
      <td className="hidden px-4 py-3 text-center sm:table-cell">
        <StatusBadge
          label={student.status}
          variant={statusVariant[student.status]}
          dot
        />
      </td>
      <td className="px-2 py-3 text-muted-foreground">
        <ChevronRight size={16} aria-hidden />
      </td>
    </tr>
  )
}
