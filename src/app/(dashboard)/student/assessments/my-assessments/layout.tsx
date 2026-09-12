import type { Metadata } from "next";
import { AssessmentsTabs } from "./AssessmentsTabs";

export const metadata: Metadata = {
    title: "My Assessments",
};

export default function MyAssessmentsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="mx-auto px-4 py-10 space-y-6">
            {/* Section header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">My Assessments</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Assignments, quizzes, and forums from your enrolled courses.
                </p>
            </div>

            <AssessmentsTabs />

            {children}
        </div>
    );
}
