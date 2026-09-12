import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark";

interface ThemeState {
    theme: Theme;
    setTheme: (t: Theme) => void;
    toggle: () => void;
}

const applyTheme = (theme: Theme) => {
    if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", theme === "dark");
    }
};

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            theme: "light",
            setTheme: (t) => {
                applyTheme(t);
                set({ theme: t });
            },
            toggle: () => {
                const next = get().theme === "light" ? "dark" : "light";
                applyTheme(next);
                set({ theme: next });
            },
        }),
        {
            name: "qhub-portal-theme",
            onRehydrateStorage: () => (state) => {
                if (state) applyTheme(state.theme);
            },
        }
    )
);