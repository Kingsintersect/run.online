"use client"

import { motion } from "framer-motion"
import {
  ShieldCheck,
  MoreHorizontal,
  Users,
  Copy,
  Pencil,
  Trash2,
  ChevronRight,
} from "lucide-react"
import { useState } from "react"
import StatusBadge from "@/components/custom/StatusBadge"
import type { Role } from "@/types/roles"

interface RoleCardProps {
  role: Role
  index: number
  onView: (role: Role) => void
  onEdit: (role: Role) => void
  onDuplicate: (role: Role) => void
  onDelete: (role: Role) => void
}

export default function RoleCard({
  role,
  index,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
}: RoleCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      className="group relative cursor-pointer rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
      onClick={() => onView(role)}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck size={18} className="text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {role.name}
            </h3>
            <p className="font-mono text-xs text-muted-foreground">
              {role.slug}
            </p>
          </div>
        </div>

        {/* Actions menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen(!menuOpen)
            }}
            className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-colors group-hover:opacity-100 hover:bg-accent hover:text-foreground"
          >
            <MoreHorizontal size={16} />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                }}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute top-full right-0 z-50 mt-1 w-40 overflow-hidden rounded-xl border border-border bg-card shadow-xl"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(false)
                    onEdit(role)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                >
                  <Pencil size={14} /> Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(false)
                    onDuplicate(role)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                >
                  <Copy size={14} /> Duplicate
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(false)
                    onDelete(role)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 transition-colors hover:bg-accent"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </motion.div>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="mb-4 line-clamp-2 min-h-8 text-xs text-muted-foreground">
        {role.description || "No description provided"}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users size={13} />
            <span>{role.users_count ?? 0} users</span>
          </div>
          {role.is_default && (
            <StatusBadge label="Default" variant="info" dot />
          )}
        </div>
        <div className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          View <ChevronRight size={14} />
        </div>
      </div>

      {/* Permission count badge */}
      {role.permissions && role.permissions.length > 0 && (
        <div className="absolute top-4 right-12 opacity-0 group-hover:opacity-0">
          <StatusBadge
            label={`${role.permissions.length} permissions`}
            variant="purple"
          />
        </div>
      )}
    </motion.div>
  )
}
