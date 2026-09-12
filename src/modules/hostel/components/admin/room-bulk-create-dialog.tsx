"use client"

import { useEffect } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  COMMON_ROOM_TYPES,
  BulkCreateRoomsDtoSchema,
} from "../../schemas/room.schema"
import { useBulkCreateRooms } from "../../hooks/use-hostel-mutations"
import type { BulkCreateRoomsDto } from "../../types"

const EMPTY_ROW = {
  roomNumber: "",
  floor: 1,
  capacity: 1,
  roomType: COMMON_ROOM_TYPES[0] as string,
}

interface RoomBulkCreateDialogProps {
  open: boolean
  onClose: () => void
  blockId: number | null
}

export function RoomBulkCreateDialog({
  open,
  onClose,
  blockId,
}: RoomBulkCreateDialogProps) {
  const bulkCreate = useBulkCreateRooms()

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BulkCreateRoomsDto>({
    resolver: zodResolver(BulkCreateRoomsDtoSchema),
    defaultValues: { rooms: [EMPTY_ROW] },
  })
  const { fields, append, remove } = useFieldArray({ control, name: "rooms" })

  useEffect(() => {
    if (open) reset({ rooms: [EMPTY_ROW] })
  }, [open, reset])

  const submit = handleSubmit(async (values) => {
    if (!blockId) return
    try {
      const result = await bulkCreate.mutateAsync({ blockId, dto: values })
      if (result.errors.length > 0) {
        toast.warning(
          `${result.created} created, ${result.errors.length} failed — ${result.errors
            .map((e) => `${e.roomNumber}: ${e.message}`)
            .join("; ")}`
        )
      } else {
        toast.success(`${result.created} rooms created`)
      }
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk create failed")
    }
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bulk Create Rooms"
      subtitle="Add several rooms to this block at once."
      size="lg"
      footer={
        <>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={bulkCreate.isPending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={bulkCreate.isPending}>
            {bulkCreate.isPending && (
              <Loader2
                className="size-4 animate-spin"
                data-icon="inline-start"
              />
            )}
            Create {fields.length} Room{fields.length !== 1 ? "s" : ""}
          </Button>
        </>
      }
    >
      <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
        {fields.map((field, idx) => (
          <div
            key={field.id}
            className="grid grid-cols-[1fr_0.7fr_0.7fr_1fr_auto] items-end gap-2 rounded-xl border border-border p-2.5"
          >
            <div className="space-y-1">
              <Label className="text-[11px]">Room No.</Label>
              <Input
                className="h-8 text-sm"
                aria-invalid={!!errors.rooms?.[idx]?.roomNumber}
                {...register(`rooms.${idx}.roomNumber` as const)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Floor</Label>
              <Input
                className="h-8 text-sm"
                type="number"
                min={0}
                {...register(`rooms.${idx}.floor` as const, {
                  valueAsNumber: true,
                })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Capacity</Label>
              <Input
                className="h-8 text-sm"
                type="number"
                min={1}
                {...register(`rooms.${idx}.capacity` as const, {
                  valueAsNumber: true,
                })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Type</Label>
              <Controller
                control={control}
                name={`rooms.${idx}.roomType` as const}
                render={({ field: f }) => (
                  <Select value={f.value} onValueChange={f.onChange}>
                    <SelectTrigger className="h-8 text-sm">
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
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={fields.length === 1}
              onClick={() => remove(idx)}
            >
              <Trash2 size={13} className="text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3 gap-1.5 text-xs"
        onClick={() => append(EMPTY_ROW)}
      >
        <Plus size={13} /> Add Row
      </Button>
    </Modal>
  )
}
