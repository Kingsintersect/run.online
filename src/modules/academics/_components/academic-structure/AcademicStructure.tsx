"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Loader2, Network, Plus, Tags } from "lucide-react"
import { Button } from "@/components/ui/button"
import EmptyState from "@/components/custom/EmptyState"
import { useAcademicUnits } from "@/hooks/useAcademicStructure"
import { UnitNode } from "./components/UnitNode"
import { AcademicUnitFormDialog } from "./components/AcademicUnitFormDialog"
import { UnitTypeManagerDialog } from "./components/UnitTypeManagerDialog"
import type { AcademicUnit } from "@/types/school"

interface AcademicStructurePageProps {
  canManage?: boolean
}

type FormTarget = { parent: AcademicUnit | null; unit?: AcademicUnit }

// Admin tree editor for the generic AcademicUnit structure — see
// sandbox/schema-moodel-sync-refactor/{README,api-v2}.md. Lets an admin
// build whatever shape this deployment's institution actually needs
// (Faculty→Department→Program→Level→Semester for a degree school, or
// Section→Stream→Program→Level→Term for a secondary school) by mirroring
// real records and/or adding pure structural nodes, then push the result to
// Moodle category sync. Confirmed live — MISSING_BACKEND_APIS.md §2.16 is
// now shipped by the backend team; every call here hits the real
// `/academic-structure` endpoints.
export default function AcademicStructurePage({
  canManage = false,
}: AcademicStructurePageProps) {
  const { data, isLoading } = useAcademicUnits({ rootsOnly: true })
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null)
  const [managingTypes, setManagingTypes] = useState(false)

  const roots = data?.data ?? []

  return (
    <div className="mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6 flex flex-wrap items-start justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Academic Structure
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build the tree this deployment&apos;s institution actually uses —
            mirror real records or add pure structural nodes (e.g. a secondary
            school&apos;s Stream) with no dedicated table.
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setManagingTypes(true)}>
              <Tags className="size-4" data-icon="inline-start" /> Node Types
            </Button>
            <Button onClick={() => setFormTarget({ parent: null })}>
              <Plus className="size-4" data-icon="inline-start" /> Add Root Node
            </Button>
          </div>
        )}
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : roots.length === 0 ? (
        <EmptyState
          icon={Network}
          title="No structure yet"
          description="Add a root node to start building the tree — e.g. a Faculty for a degree school, or a Section for a secondary school."
          action={
            canManage ? (
              <Button onClick={() => setFormTarget({ parent: null })}>
                <Plus className="size-4" data-icon="inline-start" /> Add Root
                Node
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-2">
          {roots.map((unit) => (
            <UnitNode
              key={unit.id}
              unit={unit}
              canManage={canManage}
              depth={0}
              onAddChild={(parent) => setFormTarget({ parent })}
              onEdit={(u) => setFormTarget({ parent: null, unit: u })}
            />
          ))}
        </div>
      )}

      <AcademicUnitFormDialog
        open={formTarget !== null}
        onClose={() => setFormTarget(null)}
        parent={formTarget?.parent ?? null}
        unit={formTarget?.unit}
      />
      <UnitTypeManagerDialog
        open={managingTypes}
        onClose={() => setManagingTypes(false)}
      />
    </div>
  )
}
