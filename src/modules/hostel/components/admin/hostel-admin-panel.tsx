"use client"

import { useHostelUiStore } from "../../store/hostel-ui.store"
import { HostelStructureTree } from "./hostel-structure-tree"
import { AllocationTable } from "./allocation-table"

const TABS = [
  { label: "Hostels & Rooms", value: "structure" as const },
  { label: "Allocations", value: "allocations" as const },
]

export function HostelAdminPanel() {
  const activeTab = useHostelUiStore((s) => s.activeTab)
  const setActiveTab = useHostelUiStore((s) => s.setActiveTab)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/30 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={
              activeTab === tab.value
                ? "rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-[--primary-foreground]"
                : "rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "structure" ? (
        <HostelStructureTree />
      ) : (
        <AllocationTable />
      )}
    </div>
  )
}
