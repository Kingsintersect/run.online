import { create } from "zustand";
import type { Role, Permission } from "@/types/roles";

type ModalTarget = "create-role" | "edit-role" | "delete-role" | "create-permission" | "edit-permission" | "delete-permission" | null;

interface RolesState {
    // ── Selected items ───────────────────────
    selectedRole: Role | null;
    selectedPermission: Permission | null;
    setSelectedRole: (role: Role | null) => void;
    setSelectedPermission: (permission: Permission | null) => void;

    // ── Modal state ──────────────────────────
    activeModal: ModalTarget;
    openModal: (modal: ModalTarget) => void;
    closeModal: () => void;

    // ── Filters ──────────────────────────────
    moduleFilter: string;
    setModuleFilter: (module: string) => void;

    // ── Reset ────────────────────────────────
    reset: () => void;
}

export const useRolesStore = create<RolesState>()((set) => ({
    selectedRole: null,
    selectedPermission: null,
    setSelectedRole: (role) => set({ selectedRole: role }),
    setSelectedPermission: (permission) => set({ selectedPermission: permission }),

    activeModal: null,
    openModal: (modal) => set({ activeModal: modal }),
    closeModal: () => set({ activeModal: null, selectedRole: null, selectedPermission: null }),

    moduleFilter: "all",
    setModuleFilter: (module) => set({ moduleFilter: module }),

    reset: () =>
        set({
            selectedRole: null,
            selectedPermission: null,
            activeModal: null,
            moduleFilter: "all",
        }),
}));
