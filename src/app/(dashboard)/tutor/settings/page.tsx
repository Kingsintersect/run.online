"use client"

import { useState } from "react"
import { Lock, Save, ShieldCheck, UserCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { changePassword } from "@/lib/auth/backendAuth"
import { useMyLecturer } from "@/hooks/use-my-lecturer-id"
import { useUpdateTutor } from "@/modules/user-management/hooks/useUsersData"

// Built 2026-09-12 to fix a real broken flow: the tutor onboarding
// checklist's "Confirm your profile" step (TutorOnboardingChecklist.tsx)
// has always linked here, but this page never existed — found via a full
// nav sweep, live-tested with a real TUTOR login. Scoped deliberately small
// (one panel, not the student settings page's four tabs) since the only
// thing this route needs to do is let a tutor see and correct their own
// profile fields — everything here is read from/written to the tutor's own
// Lecturer record via GET/PATCH /users/lecturers/me,:id (confirmed live
// that a tutor can PATCH their own lecturer id, not just an admin).
export default function TutorSettingsPage() {
  const { lecturer, isLoading } = useMyLecturer()
  const updateTutor = useUpdateTutor()

  const [officeLocation, setOfficeLocation] = useState("")
  const [officePhone, setOfficePhone] = useState("")
  const [specialization, setSpecialization] = useState("")
  const [qualifications, setQualifications] = useState("")
  const [researchAreas, setResearchAreas] = useState("")
  const [bio, setBio] = useState("")

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  // Seed the editable fields from the resolved lecturer record once it
  // arrives — same render-time "adjust state when a prop changes" pattern
  // used on the student settings page, to avoid a cascading effect.
  const [syncedLecturerId, setSyncedLecturerId] = useState<number | null>(
    null
  )
  if (lecturer && lecturer.id !== syncedLecturerId) {
    setSyncedLecturerId(lecturer.id)
    setOfficeLocation(lecturer.office_location ?? "")
    setOfficePhone(lecturer.office_phone ?? "")
    setSpecialization(lecturer.specialization ?? "")
    setQualifications(lecturer.qualifications ?? "")
    setResearchAreas(lecturer.research_areas ?? "")
    setBio(lecturer.bio ?? "")
  }

  async function handleSaveProfile() {
    if (!lecturer) {
      toast.error("Your lecturer profile isn't loaded yet — try again shortly.")
      return
    }
    updateTutor.mutate({
      id: lecturer.id,
      payload: {
        office_location: officeLocation.trim() || undefined,
        office_phone: officePhone.trim() || undefined,
        specialization: specialization.trim() || undefined,
        qualifications: qualifications.trim() || undefined,
        research_areas: researchAreas.trim() || undefined,
        bio: bio.trim() || undefined,
      },
    })
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Fill all password fields.")
      return
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.")
      return
    }
    setChangingPassword(true)
    try {
      const res = await changePassword(currentPassword, newPassword)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      toast.success(res.message || "Password changed successfully.")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't change your password."
      )
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-primary/20 bg-linear-to-br from-primary/15 via-background to-cyan-500/10 p-6">
        <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
          Account
        </p>
        <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
          Tutor Settings
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Confirm your profile details and manage your account security.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle2 size={16} />
            Profile Details
          </CardTitle>
          <CardDescription>
            Your identity and academic record are managed by the registry.
            Office and research details below are yours to keep current.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full-name">Full Name</Label>
              <Input
                id="full-name"
                value={
                  lecturer
                    ? `${lecturer.user.first_name ?? ""} ${lecturer.user.last_name ?? ""}`.trim()
                    : "—"
                }
                disabled
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={lecturer?.user.email ?? "—"}
                disabled
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-number">Staff Number</Label>
              <Input
                id="staff-number"
                value={lecturer?.staff_number ?? "—"}
                disabled
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                value={lecturer?.designation ?? "—"}
                disabled
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={lecturer?.department_name ?? "—"}
                disabled
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="faculty">Faculty</Label>
              <Input
                id="faculty"
                value={lecturer?.faculty_name ?? "—"}
                disabled
                readOnly
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Something wrong with the details above? Contact the registry —
            they can&apos;t be changed here.
          </p>

          <div className="grid gap-4 border-t border-border pt-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="office-location">Office Location</Label>
              <Input
                id="office-location"
                value={officeLocation}
                onChange={(e) => setOfficeLocation(e.target.value)}
                placeholder="e.g. Block C, Room 14"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="office-phone">Office Phone</Label>
              <Input
                id="office-phone"
                value={officePhone}
                onChange={(e) => setOfficePhone(e.target.value)}
                placeholder="08012345678"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialization">Specialization</Label>
              <Input
                id="specialization"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="e.g. Applied Econometrics"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qualifications">Qualifications</Label>
              <Input
                id="qualifications"
                value={qualifications}
                onChange={(e) => setQualifications(e.target.value)}
                placeholder="e.g. PhD Economics"
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="research-areas">Research Areas</Label>
            <Textarea
              id="research-areas"
              value={researchAreas}
              onChange={(e) => setResearchAreas(e.target.value)}
              placeholder="Areas of research interest"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short introduction students will see."
              disabled={isLoading}
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSaveProfile}
              disabled={updateTutor.isPending || isLoading || !lecturer}
              className="gap-2"
            >
              <Save size={15} />
              Save Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock size={16} />
            Security
          </CardTitle>
          <CardDescription>
            Keep your account secure with a strong password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => void handleChangePassword()}
              disabled={changingPassword}
            >
              {changingPassword ? "Updating…" : "Update Password"}
            </Button>
          </div>
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4" />
              <div>
                <p className="text-sm font-semibold">Session Security</p>
                <p className="mt-1 text-xs">
                  If you signed in on a shared device, use logout from the
                  user menu to end your session.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
