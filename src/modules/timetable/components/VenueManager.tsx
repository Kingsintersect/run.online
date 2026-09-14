"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { Building2, Loader2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import StatusBadge from "@/components/custom/StatusBadge"
import {
  useVenues,
  useCreateVenue,
  useRemoveVenue,
} from "../hooks/useExamTimetable"
import {
  venueSchema,
  type VenueFormValues,
} from "../schemas/exam-schedule.schema"

// Exam Timetable — sandbox/exam-timetable/API_CONTRACTS.md §1.
export function VenueManager({ canManage = false }: { canManage?: boolean }) {
  const { data, isLoading } = useVenues()
  const createVenue = useCreateVenue()
  const removeVenue = useRemoveVenue()
  const [showForm, setShowForm] = useState(false)

  const venues = data?.data ?? []

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VenueFormValues>({
    resolver: zodResolver(venueSchema),
    defaultValues: { name: "", capacity: 50, isExamHall: true },
  })

  const onSubmit = async (values: VenueFormValues) => {
    try {
      await createVenue.mutateAsync(values)
      toast.success("Venue created")
      reset({ name: "", capacity: 50, isExamHall: true })
      setShowForm(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create venue")
    }
  }

  const handleRemove = async (id: number) => {
    try {
      await removeVenue.mutateAsync(id)
      toast.success("Venue removed")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove venue")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Exam Venues</h3>
          <p className="text-xs text-muted-foreground">
            Capacity-aware halls exam schedules can be booked into.
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="size-3.5" data-icon="inline-start" />
            New Venue
          </Button>
        )}
      </div>

      <AnimatePresence>
        {canManage && showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <Card>
              <CardHeader>
                <CardTitle>Create Venue</CardTitle>
                <CardDescription>e.g., New Hall, capacity 300</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="venue-name">Name</Label>
                    <Input
                      id="venue-name"
                      placeholder="New Hall"
                      aria-invalid={!!errors.name}
                      {...register("name")}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">
                        {errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="venue-capacity">Capacity</Label>
                    <Input
                      id="venue-capacity"
                      type="number"
                      min={1}
                      aria-invalid={!!errors.capacity}
                      {...register("capacity", { valueAsNumber: true })}
                    />
                    {errors.capacity && (
                      <p className="text-sm text-destructive">
                        {errors.capacity.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="venue-location">
                      Location
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      id="venue-location"
                      placeholder="Main Campus, Block C"
                      {...register("location")}
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit(onSubmit)}
                    disabled={createVenue.isPending}
                  >
                    {createVenue.isPending && (
                      <Loader2
                        className="size-4 animate-spin"
                        data-icon="inline-start"
                      />
                    )}
                    Create Venue
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {venues.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-10 text-center">
          <Building2 className="mb-2 size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No venues yet — add one to start scheduling exams.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((v) => (
            <Card key={v.id}>
              <CardContent className="pt-6">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Building2 size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {v.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {v.location ?? "No location set"}
                      </p>
                    </div>
                  </div>
                  <StatusBadge
                    label={v.isActive ? "Active" : "Inactive"}
                    variant={v.isActive ? "success" : "destructive"}
                    dot
                  />
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  Capacity: {v.capacity.toLocaleString()}
                  {v.isExamHall ? " · Exam hall" : ""}
                </p>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(v.id)}
                    disabled={removeVenue.isPending}
                  >
                    <Trash2 className="size-3.5" data-icon="inline-start" />
                    Remove
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
