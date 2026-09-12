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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CreateHostelDtoSchema } from "../../schemas/hostel.schema"
import {
  useCreateHostel,
  useUpdateHostel,
} from "../../hooks/use-hostel-mutations"
import type { CreateHostelDto, HostelResponse } from "../../types"

interface HostelFormDialogProps {
  open: boolean
  onClose: () => void
  hostel?: HostelResponse | null
}

export function HostelFormDialog({
  open,
  onClose,
  hostel,
}: HostelFormDialogProps) {
  const isEditing = !!hostel
  const create = useCreateHostel()
  const update = useUpdateHostel()
  const isPending = create.isPending || update.isPending

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateHostelDto>({
    resolver: zodResolver(CreateHostelDtoSchema),
    defaultValues: { name: "", hostelType: "male", address: "" },
  })

  useEffect(() => {
    if (open) {
      reset(
        hostel
          ? {
              name: hostel.name,
              hostelType: hostel.hostelType,
              address: hostel.address ?? "",
            }
          : { name: "", hostelType: "male", address: "" }
      )
    }
  }, [open, hostel, reset])

  const submit = handleSubmit(async (values) => {
    try {
      if (isEditing && hostel) {
        await update.mutateAsync({ id: hostel.id, dto: values })
        toast.success("Hostel updated")
      } else {
        await create.mutateAsync(values)
        toast.success("Hostel created")
      }
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save hostel")
    }
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Hostel" : "New Hostel"}
      subtitle="A hostel building, e.g. Queens Hall."
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
            {isEditing ? "Save Changes" : "Create Hostel"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="hostel-name">Name</Label>
          <Input
            id="hostel-name"
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Hostel Type</Label>
          <Controller
            control={control}
            name="hostelType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="hostel-address">Address (optional)</Label>
          <Input id="hostel-address" {...register("address")} />
        </div>
      </div>
    </Modal>
  )
}
