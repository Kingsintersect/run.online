"use client"

import { useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  COMMON_ROOM_TYPES,
  CreateRoomDtoSchema,
} from "../../schemas/room.schema"
import { useCreateRoom, useUpdateRoom } from "../../hooks/use-hostel-mutations"
import type { CreateRoomDto, RoomResponse } from "../../types"

interface RoomFormDialogProps {
  open: boolean
  onClose: () => void
  blockId: number | null
  room?: RoomResponse | null
}

export function RoomFormDialog({
  open,
  onClose,
  blockId,
  room,
}: RoomFormDialogProps) {
  const isEditing = !!room
  const create = useCreateRoom()
  const update = useUpdateRoom()
  const isPending = create.isPending || update.isPending

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateRoomDto>({
    resolver: zodResolver(CreateRoomDtoSchema),
    defaultValues: {
      roomNumber: "",
      floor: 1,
      capacity: 1,
      roomType: COMMON_ROOM_TYPES[0],
    },
  })

  useEffect(() => {
    if (open) {
      reset(
        room
          ? {
              roomNumber: room.roomNumber,
              floor: room.floor,
              capacity: room.capacity,
              roomType: room.roomType,
            }
          : {
              roomNumber: "",
              floor: 1,
              capacity: 1,
              roomType: COMMON_ROOM_TYPES[0],
            }
      )
    }
  }, [open, room, reset])

  const submit = handleSubmit(async (values) => {
    try {
      if (isEditing && room) {
        await update.mutateAsync({ id: room.id, dto: values })
        toast.success("Room updated")
      } else if (blockId) {
        await create.mutateAsync({ blockId, dto: values })
        toast.success("Room created")
      }
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save room")
    }
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Room" : "New Room"}
      subtitle="A room within the block, e.g. A101."
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending && (
              <Loader2
                className="size-4 animate-spin"
                data-icon="inline-start"
              />
            )}
            {isEditing ? "Save Changes" : "Create Room"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="room-number">Room Number</Label>
            <Input
              id="room-number"
              aria-invalid={!!errors.roomNumber}
              {...register("roomNumber")}
            />
            {errors.roomNumber && (
              <p className="text-xs text-destructive">
                {errors.roomNumber.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="room-floor">Floor</Label>
            <Input
              id="room-floor"
              type="number"
              min={0}
              aria-invalid={!!errors.floor}
              {...register("floor", { valueAsNumber: true })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="room-capacity">Capacity</Label>
            <Input
              id="room-capacity"
              type="number"
              min={1}
              aria-invalid={!!errors.capacity}
              {...register("capacity", { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Room Type</Label>
            <Controller
              control={control}
              name="roomType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_ROOM_TYPES.map((type) => (
                      <SelectItem
                        key={type}
                        value={type}
                        className="capitalize"
                      >
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        {isEditing && room && (
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Available</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Manual override — vacancy is still computed from active
                allocations vs. capacity.
              </p>
            </div>
            <Switch
              checked={room.isAvailable}
              onCheckedChange={(v) =>
                update.mutate({ id: room.id, dto: { isAvailable: v } })
              }
              aria-label="Room available"
            />
          </div>
        )}
      </div>
    </Modal>
  )
}
