"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { useLevels, useCreateLevel } from "@/hooks/useCourseStructure"
import {
  curriculumLevelSchema,
  type CurriculumLevelFormValues,
} from "@/schemas/school.schema"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EmptyState } from "./EmptyState"
import { Layers, Plus, Loader2 } from "lucide-react"

export function LevelsPanel({ canManage = false }: { canManage?: boolean }) {
  const { data, isLoading } = useLevels()
  const createLevel = useCreateLevel()

  const [showForm, setShowForm] = useState(false)

  const levels = [...(data?.data ?? [])].sort(
    (a, b) => a.numericValue - b.numericValue
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CurriculumLevelFormValues>({
    resolver: zodResolver(curriculumLevelSchema),
    defaultValues: { name: "", numericValue: 100 },
  })

  const onSubmit = async (values: CurriculumLevelFormValues) => {
    try {
      await createLevel.mutateAsync(values)
      toast.success("Level created")
      reset({
        name: "",
        numericValue: (levels.at(-1)?.numericValue ?? 0) + 100,
      })
      setShowForm(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create level")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Academic Levels
          </h2>
          <p className="text-sm text-muted-foreground">
            University-wide levels shared across all departments and programs.
            Once created, a level can&apos;t be edited or removed — it&apos;s
            referenced by students, courses, and fee types.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="size-4" data-icon="inline-start" />
            New Level
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
                <CardTitle>Create Level</CardTitle>
                <CardDescription>
                  Add a new academic level (e.g., 100 Level, 200 Level).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="lvl-name">Level Name</Label>
                    <Input
                      id="lvl-name"
                      placeholder="100 Level"
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
                    <Label htmlFor="lvl-value">Numeric Value</Label>
                    <Input
                      id="lvl-value"
                      type="number"
                      min={100}
                      step={100}
                      placeholder="100"
                      aria-invalid={!!errors.numericValue}
                      {...register("numericValue", { valueAsNumber: true })}
                    />
                    {errors.numericValue && (
                      <p className="text-sm text-destructive">
                        {errors.numericValue.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit(onSubmit)}
                    disabled={createLevel.isPending}
                  >
                    {createLevel.isPending && (
                      <Loader2
                        className="size-4 animate-spin"
                        data-icon="inline-start"
                      />
                    )}
                    Create Level
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {!levels.length && !showForm ? (
        <EmptyState
          icon={Layers}
          title="No levels yet"
          description="Add university-wide academic levels (e.g., 100 Level, 200 Level)."
          action={
            canManage ? (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="size-4" data-icon="inline-start" />
                Add First Level
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {levels.map((level, index) => (
            <motion.div
              key={level.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {level.numericValue}
                    </span>
                    {level.name}
                  </CardTitle>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
