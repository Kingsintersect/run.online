"use client"

import { usePermissions } from "@/lib/permissions/usePermissions"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { useProgressionMajorProgram } from "../hooks/use-progression-major-program"
import { PROGRESSION_PERMISSIONS as P } from "../lib/permissions"
import { MajorProgramSelect } from "./major-program-select"
import { PromotionPolicyForm } from "./promotion-policy-form"

// Screen 1 — progression policy, one per major program. Viewing needs
// progression.policy.view; the form is read-only without policy.manage.
export function PromotionPolicyScreen() {
  const { can } = usePermissions()
  const mp = useProgressionMajorProgram()

  return (
    <PermissionGate require={P.policyView} denyBehavior="screen">
      <div className="space-y-5">
        <header>
          <h2 className="text-lg font-semibold text-foreground">
            Progression policy
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            The rules the promotion run applies at the end of each session:
            probation, withdrawal, retakes, carryovers and registration limits.
            {mp.majorProgramName && (
              <>
                {" "}
                Showing{" "}
                <span className="font-medium text-foreground">
                  {mp.majorProgramName}
                </span>
                .
              </>
            )}
          </p>
        </header>

        <MajorProgramSelect
          id="policy-major-program"
          programs={mp.programs}
          value={mp.majorProgramId}
          onChange={mp.setMajorProgramId}
          isLoading={mp.isLoading}
        />

        {mp.isError ? (
          <p role="alert" className="text-sm text-destructive">
            Major programs couldn&apos;t be loaded. Refresh to try again.
          </p>
        ) : mp.majorProgramId ? (
          <PromotionPolicyForm
            key={mp.majorProgramId}
            majorProgramId={mp.majorProgramId}
            majorProgramName={mp.majorProgramName}
            canManage={can(P.policyManage)}
          />
        ) : (
          !mp.isLoading && (
            <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              {mp.programs.length === 0
                ? "No major programs are within your scope."
                : "Choose a major program above to see its progression policy."}
            </p>
          )
        )}
      </div>
    </PermissionGate>
  )
}
