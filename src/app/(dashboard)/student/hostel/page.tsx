"use client"

import { MyRoom } from "@/modules/hostel/components/student/my-room"

export default function StudentHostelPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">My Hostel Room</h1>
        <p className="text-xs text-muted-foreground">
          Your current room allocation and allocation history.
        </p>
      </div>
      <MyRoom />
    </div>
  )
}
