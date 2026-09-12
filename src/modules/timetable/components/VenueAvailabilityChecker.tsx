"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { DayOfWeekEnum } from "../schemas/schedule.schema"
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
import { useVenueAvailability } from "../hooks/useTimetable"
import { useActiveSemester } from "../hooks/useAcademicCalendar"
import { Loader2, Building } from "lucide-react"
import { cn } from "@/lib/utils"

const FormSchema = z.object({
  venue: z.string().min(1, "Venue is required"),
  dayOfWeek: DayOfWeekEnum,
})
type FormValues = z.infer<typeof FormSchema>

const DAYS = DayOfWeekEnum.options

export function VenueAvailabilityChecker() {
  const [query, setQuery] = useState<{
    venue: string
    dayOfWeek: string
  } | null>(null)
  const { data: activeSemester, isLoading: semesterLoading } =
    useActiveSemester()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
  })

  const { data, isLoading } = useVenueAvailability(
    query && activeSemester
      ? {
          venue: query.venue,
          dayOfWeek: query.dayOfWeek,
          semesterId: activeSemester.id,
        }
      : null
  )

  function onSubmit(values: FormValues) {
    setQuery({ venue: values.venue, dayOfWeek: values.dayOfWeek })
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="space-y-1">
          <Label htmlFor="venue" className="text-xs">
            Venue
          </Label>
          <Input
            id="venue"
            placeholder="e.g. LT-1"
            className="w-40"
            {...register("venue")}
          />
          {errors.venue && (
            <p className="text-xs text-destructive">{errors.venue.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Day of Week</Label>
          <Select
            onValueChange={(val) =>
              setValue("dayOfWeek", val as (typeof DAYS)[0])
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Select day" />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d.charAt(0) + d.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="submit"
          disabled={isLoading || semesterLoading}
          className="gap-2"
        >
          {isLoading || semesterLoading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Building size={14} />
          )}
          Check
        </Button>
      </form>

      {/* Results */}
      {query && (
        <div className="space-y-4">
          {/* Busy slots */}
          {data?.busySlots?.length ? (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Busy Slots
              </p>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Time</th>
                      <th className="px-3 py-2 text-left font-medium">
                        Course
                      </th>
                      <th className="px-3 py-2 text-left font-medium">Tutor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.busySlots.map(
                      (
                        s: {
                          startTime: string
                          endTime: string
                          courseCode: string
                          tutorName: string
                        },
                        i: number
                      ) => (
                        <tr key={i} className={cn(i % 2 && "bg-muted/20")}>
                          <td className="px-3 py-2 font-mono">
                            {s.startTime}–{s.endTime}
                          </td>
                          <td className="px-3 py-2">{s.courseCode}</td>
                          <td className="px-3 py-2">{s.tutorName}</td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* Free windows */}
          {data?.freeWindows?.length ? (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Free Windows
              </p>
              <div className="flex flex-wrap gap-2">
                {data.freeWindows.map(
                  (w: { startTime: string; endTime: string }, i: number) => (
                    <span
                      key={i}
                      className="rounded-md bg-green-100 px-2 py-1 font-mono text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    >
                      {w.startTime}–{w.endTime}
                    </span>
                  )
                )}
              </div>
            </div>
          ) : null}

          {data && !data.busySlots?.length && !data.freeWindows?.length && (
            <p className="text-sm text-muted-foreground">
              No availability data found for <strong>{query.venue}</strong>.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
