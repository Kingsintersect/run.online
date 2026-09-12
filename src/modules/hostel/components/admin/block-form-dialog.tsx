"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import Modal from "@/components/custom/Modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CreateBlockDtoSchema } from "../../schemas/block.schema"
import {
  useCreateBlock,
  useUpdateBlock,
} from "../../hooks/use-hostel-mutations"
import type { BlockResponse, CreateBlockDto } from "../../types"

interface BlockFormDialogProps {
  open: boolean
  onClose: () => void
  hostelId: number | null
  block?: BlockResponse | null
}

export function BlockFormDialog({
  open,
  onClose,
  hostelId,
  block,
}: BlockFormDialogProps) {
  const isEditing = !!block
  const create = useCreateBlock()
  const update = useUpdateBlock()
  const isPending = create.isPending || update.isPending

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateBlockDto>({
    resolver: zodResolver(CreateBlockDtoSchema),
    defaultValues: { name: "", floors: 1 },
  })

  useEffect(() => {
    if (open) {
      reset(
        block
          ? { name: block.name, floors: block.floors }
          : { name: "", floors: 1 }
      )
    }
  }, [open, block, reset])

  const submit = handleSubmit(async (values) => {
    try {
      if (isEditing && block) {
        await update.mutateAsync({ id: block.id, dto: values })
        toast.success("Block updated")
      } else if (hostelId) {
        await create.mutateAsync({ hostelId, dto: values })
        toast.success("Block created")
      }
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save block")
    }
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Block" : "New Block"}
      subtitle="A block or wing within the hostel, e.g. Block A."
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
            {isEditing ? "Save Changes" : "Create Block"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="block-name">Name</Label>
          <Input
            id="block-name"
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="block-floors">Floors</Label>
          <Input
            id="block-floors"
            type="number"
            min={1}
            aria-invalid={!!errors.floors}
            {...register("floors", { valueAsNumber: true })}
          />
          {errors.floors && (
            <p className="text-xs text-destructive">{errors.floors.message}</p>
          )}
        </div>
      </div>
    </Modal>
  )
}
