"use client";

import { Bell, Mail, MessageSquare, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NotificationChannel, NotificationStatus } from "../types";

// ── Channel filter ────────────────────────────────────────────────────────────

const CHANNELS: { value: NotificationChannel | "ALL"; label: string; icon: React.ElementType }[] = [
    { value: "ALL", label: "All", icon: Bell },
    { value: "IN_APP", label: "In-App", icon: Bell },
    { value: "EMAIL", label: "Email", icon: Mail },
    { value: "SMS", label: "SMS", icon: MessageSquare },
    { value: "PUSH", label: "Push", icon: Smartphone },
];

const STATUS_TABS: { value: "ALL" | NotificationStatus; label: string }[] = [
    { value: "ALL", label: "All" },
    { value: "SENT", label: "Unread" },
    { value: "READ", label: "Read" },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface NotificationFiltersProps {
    activeStatus: "ALL" | NotificationStatus;
    activeChannel: NotificationChannel | "ALL";
    onStatusChange: (status: "ALL" | NotificationStatus) => void;
    onChannelChange: (channel: NotificationChannel | "ALL") => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NotificationFilters({
    activeStatus,
    activeChannel,
    onStatusChange,
    onChannelChange,
}: NotificationFiltersProps) {
    return (
        <div className="space-y-3">
            {/* Status tabs */}
            <div className="flex gap-1 bg-muted/40 rounded-xl p-1 w-fit">
                {STATUS_TABS.map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => onStatusChange(tab.value)}
                        className={cn(
                            "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
                            activeStatus === tab.value
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Channel filter pills */}
            <div className="flex flex-wrap gap-2">
                {CHANNELS.map(({ value, label, icon: Icon }) => (
                    <Button
                        key={value}
                        variant={activeChannel === value ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => onChannelChange(value)}
                    >
                        <Icon size={12} />
                        {label}
                    </Button>
                ))}
            </div>
        </div>
    );
}
