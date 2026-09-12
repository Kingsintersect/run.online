"use client";

import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: React.ReactNode;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                <Icon className="size-7 text-primary" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {description}
            </p>
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
}
