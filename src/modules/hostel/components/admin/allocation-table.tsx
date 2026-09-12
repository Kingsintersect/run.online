"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight, Loader2, Plus, Users } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import EmptyState from "@/components/custom/EmptyState"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { useAcademicSessions } from "@/hooks/useAcademicSessions"
import { useHostels } from "../../hooks/use-hostels"
import { useAllocations } from "../../hooks/use-allocations"
import { useVacateAllocation } from "../../hooks/use-hostel-mutations"
import { useHostelUiStore } from "../../store/hostel-ui.store"
import { AllocationStatusBadge } from "../shared/status-badges"
import { AllocationCreateDialog } from "./allocation-create-dialog"

export function AllocationTable() {
  const [createOpen, setCreateOpen] = useState(false)
  const { data: sessions } = useAcademicSessions()
  const { data: hostels = [] } = useHostels()

  const sessionId = useHostelUiStore((s) => s.allocationSessionId)
  const setSessionId = useHostelUiStore((s) => s.setAllocationSessionId)
  const hostelId = useHostelUiStore((s) => s.allocationHostelId)
  const setHostelId = useHostelUiStore((s) => s.setAllocationHostelId)
  const page = useHostelUiStore((s) => s.allocationPage)
  const setPage = useHostelUiStore((s) => s.setAllocationPage)

  const { data, isLoading, isError } = useAllocations({
    sessionId,
    hostelId,
    page,
    limit: 15,
  })
  const vacate = useVacateAllocation()

  const allocations = data?.data ?? []
  const meta = data?.meta

  const handleVacate = async (id: number) => {
    try {
      await vacate.mutateAsync(id)
      toast.success("Student vacated from room")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to vacate")
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={sessionId?.toString() ?? "_ALL_"}
            onValueChange={(v) =>
              setSessionId(v === "_ALL_" ? undefined : Number(v))
            }
          >
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue placeholder="All sessions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_ALL_">All sessions</SelectItem>
              {sessions?.map((s) => (
                <SelectItem key={s.id} value={s.id.toString()}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={hostelId?.toString() ?? "_ALL_"}
            onValueChange={(v) =>
              setHostelId(v === "_ALL_" ? undefined : Number(v))
            }
          >
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue placeholder="All hostels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_ALL_">All hostels</SelectItem>
              {hostels.map((h) => (
                <SelectItem key={h.id} value={h.id.toString()}>
                  {h.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <PermissionGate require={{ resource: "hostels", action: "allocate" }}>
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={13} /> Allocate Student
          </Button>
        </PermissionGate>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-xl bg-muted/40"
            />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title="Couldn't load allocations"
          description="Please try again."
        />
      ) : allocations.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No allocations found"
          description="Nothing matches the current filters."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid grid-cols-[0.7fr_1.4fr_0.9fr_auto] items-center gap-3 border-b border-border bg-muted/20 px-4 py-2.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            <span>Student</span>
            <span>Room</span>
            <span>Status</span>
            <span className="text-right">Action</span>
          </div>
          {allocations.map((allocation, idx) => (
            <motion.div
              key={allocation.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.03 }}
              className="grid grid-cols-[0.7fr_1.4fr_0.9fr_auto] items-center gap-3 border-b border-border/60 px-4 py-3 last:border-none hover:bg-muted/20"
            >
              <span className="text-sm text-foreground">
                #{allocation.studentId}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {allocation.room
                  ? `${allocation.room.block.hostel.name} · ${allocation.room.block.name} · ${allocation.room.roomNumber}`
                  : `Room #${allocation.roomId}`}
              </span>
              <AllocationStatusBadge status={allocation.status} />
              <div className="flex justify-end">
                {allocation.status === "active" && (
                  <PermissionGate
                    require={{ resource: "hostels", action: "allocate" }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={vacate.isPending}
                      onClick={() => handleVacate(allocation.id)}
                    >
                      {vacate.isPending ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        "Vacate"
                      )}
                    </Button>
                  </PermissionGate>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {meta && meta.total > meta.limit && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {(meta.page - 1) * meta.limit + 1}–
            {Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={14} />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page * meta.limit >= meta.total}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      <AllocationCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  )
}
