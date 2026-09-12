import { z } from "zod";

// ── Role ────────────────────────────────────

export const roleSchema = z.object({
    name: z
        .string()
        .min(2, "Role name must be at least 2 characters")
        .max(50, "Role name must be at most 50 characters"),
    slug: z
        .string()
        .min(2, "Slug must be at least 2 characters")
        .max(50, "Slug must be at most 50 characters")
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase with hyphens only"),
    description: z.string().max(500, "Description is too long").optional().default(""),
    is_default: z.boolean().default(false),
    permission_ids: z.array(z.number()).default([]),
});

export type RoleFormValues = z.infer<typeof roleSchema>;
export type RoleFormInputValues = z.input<typeof roleSchema>;

// ── Permission ──────────────────────────────

export const permissionSchema = z.object({
    resource: z
        .string()
        .min(1, "Resource is required")
        .max(50, "Resource must be at most 50 characters"),
    action: z
        .string()
        .min(1, "Action is required")
        .max(50, "Action must be at most 50 characters"),
    module: z
        .string()
        .min(1, "Module is required")
        .max(50, "Module must be at most 50 characters"),
    description: z.string().max(500, "Description is too long").optional().default(""),
});

export type PermissionFormValues = z.infer<typeof permissionSchema>;
export type PermissionFormInputValues = z.input<typeof permissionSchema>;
