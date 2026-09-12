import { create } from "zustand"

type HostelTab = "structure" | "allocations"

interface HostelUiState {
  activeTab: HostelTab
  setActiveTab: (tab: HostelTab) => void

  expandedHostelIds: Set<number>
  toggleHostelExpanded: (id: number) => void

  expandedBlockIds: Set<number>
  toggleBlockExpanded: (id: number) => void

  allocationSessionId: number | undefined
  setAllocationSessionId: (id: number | undefined) => void

  allocationHostelId: number | undefined
  setAllocationHostelId: (id: number | undefined) => void

  allocationPage: number
  setAllocationPage: (page: number) => void
}

export const useHostelUiStore = create<HostelUiState>((set) => ({
  activeTab: "structure",
  setActiveTab: (tab) => set({ activeTab: tab }),

  expandedHostelIds: new Set(),
  toggleHostelExpanded: (id) =>
    set((state) => {
      const next = new Set(state.expandedHostelIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { expandedHostelIds: next }
    }),

  expandedBlockIds: new Set(),
  toggleBlockExpanded: (id) =>
    set((state) => {
      const next = new Set(state.expandedBlockIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { expandedBlockIds: next }
    }),

  allocationSessionId: undefined,
  setAllocationSessionId: (id) =>
    set({ allocationSessionId: id, allocationPage: 1 }),

  allocationHostelId: undefined,
  setAllocationHostelId: (id) =>
    set({ allocationHostelId: id, allocationPage: 1 }),

  allocationPage: 1,
  setAllocationPage: (page) => set({ allocationPage: page }),
}))
