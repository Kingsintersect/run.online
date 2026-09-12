"use client";

import { motion } from "framer-motion";
import { ChevronDown, BookOpen, Calendar, Building2, GraduationCap, Search } from "lucide-react";
import type { CourseOption } from "../../types/grades.types";
import type { AcademicYear, GradeSemester, GradeProgram } from "../../types/grades.types";

// ─── Step indicator ───────────────────────────────────────────────────────────

function Step({
    number,
    label,
    done,
    active,
}: {
    number: number;
    label: string;
    done: boolean;
    active: boolean;
}) {
    return (
        <div className={`flex items-center gap-2 ${active ? "opacity-100" : done ? "opacity-80" : "opacity-40"}`}>
            <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors
                    ${done ? "bg-primary text-primary-foreground" : active ? "bg-primary/20 text-primary border-2 border-primary" : "bg-muted text-muted-foreground"}`}
            >
                {done ? "✓" : number}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${active ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
        </div>
    );
}

// ─── Styled Select ────────────────────────────────────────────────────────────

interface SelectFieldProps {
    label: string;
    icon: React.ReactNode;
    value: string | number | null;
    onChange: (v: string) => void;
    options: { value: string | number; label: string }[];
    placeholder?: string;
    disabled?: boolean;
}

function SelectField({ label, icon, value, onChange, options, placeholder = "Select…", disabled }: SelectFieldProps) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                {icon}
                {label}
            </label>
            <div className="relative">
                <select
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className={`
                        w-full appearance-none px-3 py-2.5 pr-8 text-xs rounded-xl border bg-card text-foreground
                        border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                        transition disabled:opacity-50 disabled:cursor-not-allowed
                        ${!value ? "text-muted-foreground" : "text-foreground"}
                    `}
                >
                    <option value="" disabled>{placeholder}</option>
                    {options.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            </div>
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SelectionWizardProps {
    academicYears: AcademicYear[];
    semesters: GradeSemester[];
    programs: GradeProgram[];
    courses: CourseOption[];
    coursesLoading: boolean;
    selectedAY: string | null;
    selectedSem: string | null;
    selectedProgram: string | null;
    selectedCourse: number | null;
    onAYChange: (v: string) => void;
    onSemChange: (v: string) => void;
    onProgramChange: (v: string) => void;
    onCourseChange: (v: string) => void;
    onLoad: () => void;
    loading: boolean;
    isComplete: boolean;
}

export function SelectionWizard({
    academicYears,
    semesters,
    programs,
    courses,
    coursesLoading,
    selectedAY,
    selectedSem,
    selectedProgram,
    selectedCourse,
    onAYChange,
    onSemChange,
    onProgramChange,
    onCourseChange,
    onLoad,
    loading,
    isComplete,
}: SelectionWizardProps) {
    const filteredSemesters = semesters.filter(
        (s) => !selectedAY || s.academicYearId === selectedAY
    );

    const steps = [
        { label: "Academic Year", done: !!selectedAY },
        { label: "Semester", done: !!selectedSem },
        { label: "Program", done: !!selectedProgram },
        { label: "Course", done: selectedCourse !== null },
    ];
    const currentStep = steps.findIndex((s) => !s.done);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl overflow-hidden"
        >
            {/* Header */}
            <div className="px-5 py-4 border-b border-border bg-muted/30">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Search className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-foreground">Select Course to Publish</p>
                        <p className="text-xs text-muted-foreground">Choose the academic session, semester, program and course</p>
                    </div>
                </div>
                {/* Step indicators */}
                <div className="flex items-center gap-3 flex-wrap">
                    {steps.map((s, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <Step
                                number={i + 1}
                                label={s.label}
                                done={s.done}
                                active={currentStep === i}
                            />
                            {i < steps.length - 1 && (
                                <div className={`w-6 h-px ${s.done ? "bg-primary" : "bg-border"} hidden sm:block`} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Dropdowns */}
            <div className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <SelectField
                        label="Academic Year"
                        icon={<Calendar className="w-3.5 h-3.5 text-primary" />}
                        value={selectedAY}
                        onChange={onAYChange}
                        options={academicYears.map((y) => ({ value: y.id, label: y.label }))}
                        placeholder="Select academic year"
                    />
                    <SelectField
                        label="Semester"
                        icon={<Calendar className="w-3.5 h-3.5 text-primary" />}
                        value={selectedSem}
                        onChange={onSemChange}
                        options={filteredSemesters.map((s) => ({ value: s.id, label: s.label }))}
                        placeholder="Select semester"
                        disabled={!selectedAY}
                    />
                    <SelectField
                        label="Program / Department"
                        icon={<Building2 className="w-3.5 h-3.5 text-primary" />}
                        value={selectedProgram}
                        onChange={onProgramChange}
                        options={programs.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
                        placeholder="Select program"
                        disabled={!selectedSem}
                    />
                    <SelectField
                        label="Course"
                        icon={<BookOpen className="w-3.5 h-3.5 text-primary" />}
                        value={selectedCourse}
                        onChange={onCourseChange}
                        options={courses.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
                        placeholder={coursesLoading ? "Loading courses…" : "Select course"}
                        disabled={!selectedProgram || coursesLoading}
                    />
                </div>

                {/* Load button */}
                <div className="mt-4 flex justify-end">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onLoad}
                        disabled={!isComplete || loading}
                        className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Loading results…
                            </>
                        ) : (
                            <>
                                <GraduationCap className="w-3.5 h-3.5" />
                                Load Results
                            </>
                        )}
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
}
