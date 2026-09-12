import { create } from "zustand";
import type { ClassType, DayOfWeek, EventType } from "../types/timetable.types";

interface TimetableUIState {
    // Timetable view
    viewMode: "grid" | "list";
    selectedDay: DayOfWeek | null;
    selectedClassType: ClassType | null;
    selectedSemesterId: number | null;

    // Calendar event filters
    calendarEventType: EventType | null;

    // Admin schedule form
    scheduleDialogOpen: boolean;
    editingScheduleId: number | null;
}

interface TimetableUIActions {
    setViewMode: (mode: "grid" | "list") => void;
    setSelectedDay: (day: DayOfWeek | null) => void;
    setSelectedClassType: (type: ClassType | null) => void;
    setSelectedSemesterId: (id: number | null) => void;
    setCalendarEventType: (type: EventType | null) => void;
    openCreateDialog: () => void;
    openEditDialog: (scheduleId: number) => void;
    closeDialog: () => void;
    resetFilters: () => void;
}

const initialState: TimetableUIState = {
    viewMode: "grid",
    selectedDay: null,
    selectedClassType: null,
    selectedSemesterId: null,
    calendarEventType: null,
    scheduleDialogOpen: false,
    editingScheduleId: null,
};

export const useTimetableUIStore = create<TimetableUIState & TimetableUIActions>()((set) => ({
    ...initialState,

    setViewMode: (mode) => set({ viewMode: mode }),
    setSelectedDay: (day) => set({ selectedDay: day }),
    setSelectedClassType: (type) => set({ selectedClassType: type }),
    setSelectedSemesterId: (id) => set({ selectedSemesterId: id }),
    setCalendarEventType: (type) => set({ calendarEventType: type }),

    openCreateDialog: () => set({ scheduleDialogOpen: true, editingScheduleId: null }),
    openEditDialog: (scheduleId) => set({ scheduleDialogOpen: true, editingScheduleId: scheduleId }),
    closeDialog: () => set({ scheduleDialogOpen: false, editingScheduleId: null }),

    resetFilters: () =>
        set({
            selectedDay: null,
            selectedClassType: null,
            calendarEventType: null,
        }),
}));
