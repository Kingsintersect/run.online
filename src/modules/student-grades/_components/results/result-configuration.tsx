"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePermissions } from "@/lib/permissions/usePermissions"
import { useMajorPrograms } from "@/hooks/useCourseStructure"
import { useMajorProgramScope } from "@/hooks/use-major-program-scope"
import { RESULTS_PERMISSIONS } from "../../lib/results-permissions"
import { GradeBandsSection } from "../grading-schemes/GradeBandsSection"
import { GradingSchemesManager } from "./grading-schemes-manager"
import { ProgramSchemeOverride } from "./program-scheme-override"
import { ResultPolicyForm } from "./result-policy-form"
import { SelectField, toId } from "./select-field"

// Screen E — SUPER_ADMIN on /admin (every major program), ADMIN on /manager
// (only major programs in their scope; the backend enforces it, the picker
// just doesn't offer the others). Everyone with results.view can look;
// editing needs results.schemes.manage / results.policies.manage.
export function ResultConfiguration() {
  const { can } = usePermissions()
  const canSchemes = can(RESULTS_PERMISSIONS.schemesManage)
  const canPolicies = can(RESULTS_PERMISSIONS.policiesManage)
  const { withinScope } = useMajorProgramScope()
  const { data: majorProgramsRes } = useMajorPrograms()
  const majorPrograms = (majorProgramsRes?.data ?? []).filter((m) =>
    withinScope(m.id)
  )
  const [majorProgramId, setMajorProgramId] = useState<number | null>(null)

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-lg font-semibold text-foreground">
          Result configuration
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Grading schemes, grade bands and result policies per major program.
        </p>
      </header>

      <SelectField
        id="config-major-program"
        label="Major program"
        value={majorProgramId ? String(majorProgramId) : ""}
        onChange={(v) => setMajorProgramId(toId(v))}
        placeholder="All major programs"
        options={majorPrograms.map((m) => ({
          value: String(m.id),
          label: m.name,
        }))}
        className="max-w-xs"
      />

      <Tabs defaultValue="schemes">
        <TabsList>
          <TabsTrigger value="schemes">Grading schemes</TabsTrigger>
          <TabsTrigger value="overrides">Program overrides</TabsTrigger>
          <TabsTrigger value="policies">Result policies</TabsTrigger>
          <TabsTrigger value="legacy">Legacy scales</TabsTrigger>
        </TabsList>
        <TabsContent value="schemes" className="mt-4">
          <GradingSchemesManager
            majorProgramId={majorProgramId}
            majorPrograms={majorPrograms}
            canManage={canSchemes}
          />
        </TabsContent>
        <TabsContent value="overrides" className="mt-4">
          <ProgramSchemeOverride
            majorProgramId={majorProgramId}
            canManage={canSchemes}
          />
        </TabsContent>
        <TabsContent value="policies" className="mt-4">
          {majorProgramId ? (
            <ResultPolicyForm
              key={majorProgramId}
              majorProgramId={majorProgramId}
              canManage={canPolicies}
            />
          ) : (
            <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              Choose a major program above to see or edit its result policy.
            </p>
          )}
        </TabsContent>
        <TabsContent value="legacy" className="mt-4 space-y-2">
          <p className="max-w-2xl text-xs text-muted-foreground">
            Legacy: the institution-wide grade bands from before grading schemes
            existed. They stay readable for older results but are no longer
            edited here. New results are graded on each student&apos;s resolved
            scheme.
          </p>
          <GradeBandsSection canManage={false} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
