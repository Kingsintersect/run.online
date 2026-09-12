"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Send, FolderOpen } from "lucide-react";

const GRADING_TABS = [
    { label: "Grade Book", href: "/tutor/grading/book", Icon: FolderOpen },
    { label: "Submit Results", href: "/tutor/grading/submit", Icon: Send },
];

export default function TutorGradingLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col min-h-full">
            {/* Page header */}
            <div className="bg-card border border-border rounded-2xl px-5 py-4 mb-4 mx-4 mt-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-foreground leading-tight">Grading</h1>
                        <p className="text-xs text-muted-foreground">Submit & review grades for your courses</p>
                    </div>
                </div>
            </div>

            {/* Tab navigation */}
            <div className="px-4 mb-4">
                <nav className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit border border-border">
                    {GRADING_TABS.map(({ label, href, Icon }) => {
                        const active = pathname === href;
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${active
                                        ? "bg-card text-foreground shadow-sm border border-border"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {label}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Page content */}
            <div className="flex-1 px-4 pb-6">{children}</div>
        </div>
    );
}
