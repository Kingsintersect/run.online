/**
 * Format a date string as a human-readable relative time label.
 * e.g. "just now", "5m ago", "3h ago", "2d ago", or a short date for older items.
 */
export function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return "just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

/** Format as short date: "3 May 2025" */
export function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

/** Format as full datetime: "3 May 2025, 14:32" */
export function formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

/**
 * Derive Nigerian university academic year from a date.
 * Academic year starts in October.
 * e.g. date in Oct 2024 → "2024/2025", date in Jan 2025 → "2024/2025"
 */
export function getAcademicYear(dateString: string): string {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-based
    if (month >= 10) return `${year}/${year + 1}`;
    return `${year - 1}/${year}`;
}

/**
 * Derive Nigerian university semester from a date.
 * First semester: Oct–Jan
 * Second semester: Feb–Jul
 */
export function getAcademicSemester(dateString: string): "First" | "Second" {
    const month = new Date(dateString).getMonth() + 1; // 1-based
    return month >= 2 && month <= 7 ? "Second" : "First";
}
