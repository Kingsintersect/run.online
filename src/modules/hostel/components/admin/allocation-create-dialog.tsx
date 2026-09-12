"use client"

import { useState } from "react"
import { Loader2, Users } from "lucide-react"
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
import { useAcademicSessions } from "@/hooks/useAcademicSessions"
import { useHostels } from "../../hooks/use-hostels"
import { useAvailableRooms } from "../../hooks/use-rooms"
import { useCreateAllocation } from "../../hooks/use-hostel-mutations"

interface AllocationCreateDialogProps {
  open: boolean
  onClose: () => void
}

export function AllocationCreateDialog({
  open,
  onClose,
}: AllocationCreateDialogProps) {
  const [studentId, setStudentId] = useState("")
  const [sessionId, setSessionId] = useState<number | undefined>()
  const [hostelId, setHostelId] = useState<number | undefined>()
  const [roomId, setRoomId] = useState<number | undefined>()

  const { data: sessions, isLoading: loadingSessions } = useAcademicSessions()
  const { data: hostels = [] } = useHostels()
  const { data: availableRooms = [], isLoading: loadingRooms } =
    useAvailableRooms(sessionId ? { sessionId, hostelId } : null)
  const createAllocation = useCreateAllocation()

  const reset = () => {
    setStudentId("")
    setSessionId(undefined)
    setHostelId(undefined)
    setRoomId(undefined)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const submit = async () => {
    const parsedStudentId = Number(studentId)
    if (!parsedStudentId || !sessionId || !roomId) {
      toast.error("Student ID, session, and room are all required")
      return
    }
    try {
      await createAllocation.mutateAsync({
        studentId: parsedStudentId,
        sessionId,
        roomId,
      })
      toast.success("Student allocated to room")
      handleClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Allocation failed")
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Allocate Student to Room"
      subtitle="Assigns a student to a room for the selected session."
      size="sm"
      footer={
        <>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={createAllocation.isPending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={createAllocation.isPending}>
            {createAllocation.isPending && (
              <Loader2
                className="size-4 animate-spin"
                data-icon="inline-start"
              />
            )}
            Allocate
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="allocation-student-id">Student ID</Label>
          <Input
            id="allocation-student-id"
            type="number"
            min={1}
            placeholder="Numeric Student.id — see Users → Students"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Academic Session</Label>
          <Select
            value={sessionId?.toString() ?? ""}
            onValueChange={(v) => {
              setSessionId(Number(v))
              setRoomId(undefined)
            }}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  loadingSessions ? "Loading sessions…" : "Select session"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {sessions?.map((s) => (
                <SelectItem key={s.id} value={s.id.toString()}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Hostel (optional filter)</Label>
          <Select
            value={hostelId?.toString() ?? "_ALL_"}
            onValueChange={(v) => {
              setHostelId(v === "_ALL_" ? undefined : Number(v))
              setRoomId(undefined)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All hostels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_ALL_">All hostels</SelectItem>
              {hostels.map((h) => (
                <SelectItem key={h.id} value={h.id.toString()}>
                  {h.name} ({h.hostelType})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Available Room</Label>
          <Select
            value={roomId?.toString() ?? ""}
            onValueChange={(v) => setRoomId(Number(v))}
            disabled={!sessionId}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  !sessionId
                    ? "Select a session first"
                    : loadingRooms
                      ? "Loading rooms…"
                      : "Select a room"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {availableRooms.length === 0 && sessionId && !loadingRooms ? (
                <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
                  <Users size={13} /> No vacant rooms match this filter
                </div>
              ) : (
                availableRooms.map((room) => (
                  <SelectItem key={room.id} value={room.id.toString()}>
                    {room.block.hostel.name} · {room.block.name} ·{" "}
                    {room.roomNumber} ({room.vacancies} vacant)
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Modal>
  )
}
