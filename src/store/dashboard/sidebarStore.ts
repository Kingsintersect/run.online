import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarState {
    collapsed: boolean;
    mobileOpen: boolean;
    toggle: () => void;
    setCollapsed: (v: boolean) => void;
    toggleMobile: () => void;
    setMobileOpen: (v: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
    persist(
        (set) => ({
            collapsed: false,
            mobileOpen: false,
            toggle: () => set((s) => ({ collapsed: !s.collapsed })),
            setCollapsed: (v) => set({ collapsed: v }),
            toggleMobile: () => set((s) => ({ mobileOpen: !s.mobileOpen })),
            setMobileOpen: (v) => set({ mobileOpen: v }),
        }),
        {
            name: "qhub-portal-sidebar",
            partialize: (s) => ({ collapsed: s.collapsed }),
        }
    )
);