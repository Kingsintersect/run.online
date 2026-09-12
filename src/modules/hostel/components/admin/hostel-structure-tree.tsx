"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronRight,
  Plus,
  Pencil,
  Building2,
  DoorOpen,
  BedDouble,
  Power,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import EmptyState from "@/components/custom/EmptyState"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { useHostels } from "../../hooks/use-hostels"
import { useBlocks } from "../../hooks/use-blocks"
import { useRooms } from "../../hooks/use-rooms"
import {
  useDeactivateBlock,
  useDeactivateHostel,
} from "../../hooks/use-hostel-mutations"
import { useHostelUiStore } from "../../store/hostel-ui.store"
import { ActiveBadge } from "../shared/status-badges"
import { HostelFormDialog } from "./hostel-form-dialog"
import { BlockFormDialog } from "./block-form-dialog"
import { RoomFormDialog } from "./room-form-dialog"
import { RoomBulkCreateDialog } from "./room-bulk-create-dialog"
import type { BlockResponse, HostelResponse, RoomResponse } from "../../types"

function RoomsPanel({ blockId }: { blockId: number }) {
  const { data: rooms = [], isLoading } = useRooms(blockId)
  const [editRoom, setEditRoom] = useState<RoomResponse | null | undefined>(
    undefined
  )
  const [bulkOpen, setBulkOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-1.5 py-2 pl-14">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-8 animate-pulse rounded-lg bg-muted/40" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-1.5 py-2 pr-3 pl-14">
      {rooms.length === 0 ? (
        <p className="py-1 text-xs text-muted-foreground">No rooms yet.</p>
      ) : (
        rooms.map((room) => (
          <div
            key={room.id}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/40"
          >
            <BedDouble size={13} className="shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-sm text-foreground">
              {room.roomNumber}
            </span>
            <span className="hidden text-[11px] text-muted-foreground capitalize sm:inline">
              {room.roomType} · cap {room.capacity}
            </span>
            <ActiveBadge isActive={room.isAvailable} />
            <PermissionGate require={{ resource: "hostels", action: "manage" }}>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setEditRoom(room)}
                title="Edit room"
              >
                <Pencil size={12} />
              </Button>
            </PermissionGate>
          </div>
        ))
      )}

      <PermissionGate require={{ resource: "hostels", action: "manage" }}>
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => setEditRoom(null)}
          >
            <Plus size={12} /> Add Room
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => setBulkOpen(true)}
          >
            <Plus size={12} /> Bulk Create
          </Button>
        </div>
      </PermissionGate>

      <RoomFormDialog
        open={editRoom !== undefined}
        onClose={() => setEditRoom(undefined)}
        blockId={blockId}
        room={editRoom}
      />
      <RoomBulkCreateDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        blockId={blockId}
      />
    </div>
  )
}

function BlocksPanel({ hostel }: { hostel: HostelResponse }) {
  const { data: blocks = [], isLoading } = useBlocks(hostel.id)
  const expandedBlockIds = useHostelUiStore((s) => s.expandedBlockIds)
  const toggleBlockExpanded = useHostelUiStore((s) => s.toggleBlockExpanded)
  const deactivateBlock = useDeactivateBlock()
  const [editBlock, setEditBlock] = useState<BlockResponse | null | undefined>(
    undefined
  )

  const handleDeactivate = async (id: number) => {
    try {
      await deactivateBlock.mutateAsync(id)
      toast.success("Block deactivated")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to deactivate block"
      )
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-1.5 py-2 pl-9">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-lg bg-muted/40" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-1 py-2 pr-3 pl-9">
      {blocks.length === 0 ? (
        <p className="py-1 text-xs text-muted-foreground">No blocks yet.</p>
      ) : (
        blocks.map((block) => {
          const expanded = expandedBlockIds.has(block.id)
          return (
            <div key={block.id}>
              <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/40">
                <button
                  type="button"
                  onClick={() => toggleBlockExpanded(block.id)}
                  className="shrink-0 text-muted-foreground"
                >
                  <ChevronRight
                    size={13}
                    className={
                      expanded
                        ? "rotate-90 transition-transform"
                        : "transition-transform"
                    }
                  />
                </button>
                <DoorOpen
                  size={13}
                  className="shrink-0 text-muted-foreground"
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {block.name}
                </span>
                <span className="hidden text-[11px] text-muted-foreground sm:inline">
                  {block.floors} floor{block.floors !== 1 ? "s" : ""}
                </span>
                <ActiveBadge isActive={block.isActive} />
                <PermissionGate
                  require={{ resource: "hostels", action: "manage" }}
                >
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setEditBlock(block)}
                    title="Edit block"
                  >
                    <Pencil size={12} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDeactivate(block.id)}
                    disabled={deactivateBlock.isPending}
                    title="Deactivate block"
                  >
                    <Power size={12} className="text-destructive" />
                  </Button>
                </PermissionGate>
              </div>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <RoomsPanel blockId={block.id} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })
      )}

      <PermissionGate require={{ resource: "hostels", action: "manage" }}>
        <Button
          variant="outline"
          size="sm"
          className="mt-1 h-7 gap-1 text-xs"
          onClick={() => setEditBlock(null)}
        >
          <Plus size={12} /> Add Block
        </Button>
      </PermissionGate>

      <BlockFormDialog
        open={editBlock !== undefined}
        onClose={() => setEditBlock(undefined)}
        hostelId={hostel.id}
        block={editBlock}
      />
    </div>
  )
}

export function HostelStructureTree() {
  const { data: hostels = [], isLoading, isError } = useHostels()
  const expandedHostelIds = useHostelUiStore((s) => s.expandedHostelIds)
  const toggleHostelExpanded = useHostelUiStore((s) => s.toggleHostelExpanded)
  const deactivateHostel = useDeactivateHostel()
  const [editHostel, setEditHostel] = useState<
    HostelResponse | null | undefined
  >(undefined)

  const handleDeactivate = async (id: number) => {
    try {
      await deactivateHostel.mutateAsync(id)
      toast.success("Hostel deactivated")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to deactivate hostel"
      )
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-11 animate-pulse rounded-xl bg-muted/40" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <EmptyState
        title="Couldn't load hostels"
        description="Please try again."
      />
    )
  }

  return (
    <div className="space-y-3">
      {hostels.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No hostels yet"
          description="Create a hostel building to get started."
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-2">
          {hostels.map((hostel) => {
            const expanded = expandedHostelIds.has(hostel.id)
            return (
              <div key={hostel.id}>
                <div className="flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-muted/40">
                  <button
                    type="button"
                    onClick={() => toggleHostelExpanded(hostel.id)}
                    className="shrink-0 text-muted-foreground"
                  >
                    <ChevronRight
                      size={14}
                      className={
                        expanded
                          ? "rotate-90 transition-transform"
                          : "transition-transform"
                      }
                    />
                  </button>
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 size={13} />
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {hostel.name}
                  </span>
                  <span className="hidden text-[11px] text-muted-foreground capitalize sm:inline">
                    {hostel.hostelType}
                  </span>
                  <ActiveBadge isActive={hostel.isActive} />
                  <PermissionGate
                    require={{ resource: "hostels", action: "manage" }}
                  >
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditHostel(hostel)}
                      title="Edit hostel"
                    >
                      <Pencil size={12} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDeactivate(hostel.id)}
                      disabled={deactivateHostel.isPending}
                      title="Deactivate hostel"
                    >
                      <Power size={12} className="text-destructive" />
                    </Button>
                  </PermissionGate>
                </div>
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <BlocksPanel hostel={hostel} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}

      <PermissionGate require={{ resource: "hostels", action: "manage" }}>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setEditHostel(null)}
        >
          <Plus size={13} /> Add Hostel
        </Button>
      </PermissionGate>

      <HostelFormDialog
        open={editHostel !== undefined}
        onClose={() => setEditHostel(undefined)}
        hostel={editHostel}
      />
    </div>
  )
}
