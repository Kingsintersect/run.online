"use client"

import { useState } from "react"
import {
  Bell,
  Lock,
  Palette,
  Save,
  ShieldCheck,
  UserCircle2,
} from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAppHydrated, useAppStore, useThemeStore } from "@/store"
import { changePassword } from "@/lib/auth/backendAuth"
import { useMyStudent, useUpdateMyProfile } from "@/hooks/use-my-student-id"
import { useUnreadCount } from "@/modules/notifications/hooks/use-notifications"
import { useMarkAllRead } from "@/modules/notifications/hooks/use-notification-mutations"

// Every setting on this page is saved on the server. Settings the server
// can't store yet (notification channels, two-factor sign-in, profile photo,
// language) are hidden rather than kept in the browser; their contracts are
// in sandbox/account-settings. Theme is the one exception: it's the same
// per-device display toggle as the header's.

export default function StudentSettingsPage() {
  const hydrated = useAppHydrated()
  const { user } = useAppStore()
  const { data: unreadData } = useUnreadCount()
  const markAllRead = useMarkAllRead()
  const { theme, setTheme } = useThemeStore()

  const { student } = useMyStudent()
  const updateProfile = useUpdateMyProfile()

  const [phoneNumber, setPhoneNumber] = useState("")
  const [contactAddress, setContactAddress] = useState("")

  // Read-only identity fields come straight off the resolved student record
  // (name / email / matric / programme / department / level are not
  // student-editable — PATCH /users/students/:id only accepts contact +
  // guardian + phone).
  const fullName = student
    ? [
        student.user.first_name,
        student.user.middle_name,
        student.user.last_name,
      ]
        .filter(Boolean)
        .join(" ")
    : (user?.name ?? "")
  const email = student?.user.email ?? user?.email ?? ""
  const department = student?.department_name ?? user?.department ?? ""
  const level =
    student && student.current_level !== null
      ? `${student.current_level}L`
      : (user?.level ?? "")
  const matric = student?.matric_number ?? ""

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  const unreadCount = unreadData?.data.unreadCount ?? 0

  // Seed the editable fields from the resolved student record once it
  // arrives — render-time "adjust state when a prop changes" pattern rather
  // than an effect, to avoid a cascading re-render.
  const [syncedStudentId, setSyncedStudentId] = useState<number | null>(null)
  if (student && student.id !== syncedStudentId) {
    setSyncedStudentId(student.id)
    setPhoneNumber(student.user.phone_number ?? "")
    setContactAddress(student.contact_address ?? "")
  }

  async function handleSaveProfile() {
    if (!student) {
      toast.error("Your student record isn't loaded yet — try again shortly.")
      return
    }

    const trimmedPhone = phoneNumber.trim()
    const trimmedAddress = contactAddress.trim()
    const changed =
      trimmedPhone !== (student.user.phone_number ?? "") ||
      trimmedAddress !== (student.contact_address ?? "")

    if (!changed) {
      toast.success("Profile is already up to date.")
      return
    }

    try {
      await updateProfile.mutateAsync({
        studentId: student.id,
        payload: {
          phone_number: trimmedPhone || undefined,
          contact_address: trimmedAddress || undefined,
        },
      })
    } catch {
      // useUpdateMyProfile surfaces its own error toast
    }
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
        error instanceof Error
          ? error.message
          : "Couldn't change your password."
      )
    } finally {
      setChangingPassword(false)
    }
  }

  if (!hydrated || !user) {
    return null
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-primary/20 bg-linear-to-br from-primary/15 via-background to-cyan-500/10 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
              Account
            </p>
            <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
              Student Settings
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Manage your profile, security, notification channels, and portal
              experience in one place.
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-right">
            <p className="text-xs text-muted-foreground">
              Unread notifications
            </p>
            <p className="text-2xl font-bold text-foreground">{unreadCount}</p>
          </div>
        </div>
      </section>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start rounded-2xl border border-border bg-card p-2">
          <TabsTrigger value="profile" className="gap-1.5 rounded-xl px-3 py-2">
            <UserCircle2 size={14} />
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="gap-1.5 rounded-xl px-3 py-2"
          >
            <Bell size={14} />
            Notifications
          </TabsTrigger>
          <TabsTrigger
            value="preferences"
            className="gap-1.5 rounded-xl px-3 py-2"
          >
            <Palette size={14} />
            Preferences
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="gap-1.5 rounded-xl px-3 py-2"
          >
            <Lock size={14} />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>
                Keep your personal and academic profile information up to date.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Read-only identity — managed by the registry, not editable here */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="display-name">Full Name</Label>
                  <Input id="display-name" value={fullName} disabled readOnly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="matric">Matric Number</Label>
                  <Input id="matric" value={matric || "—"} disabled readOnly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={department || "—"}
                    disabled
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="level">Level</Label>
                  <Input id="level" value={level || "—"} disabled readOnly />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Something wrong with the details above? Contact the registry —
                they can&apos;t be changed here.
              </p>

              {/* Editable — PATCH /users/students/:id (self) */}
              <div className="grid gap-4 border-t border-border pt-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone-number">Phone Number</Label>
                  <Input
                    id="phone-number"
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    placeholder="08012345678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-address">Contact Address</Label>
                  <Input
                    id="contact-address"
                    value={contactAddress}
                    onChange={(event) => setContactAddress(event.target.value)}
                    placeholder="Where you currently live"
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Your profile photo is set by the registry.
              </p>
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveProfile}
                  disabled={updateProfile.isPending}
                  className="gap-2"
                >
                  <Save size={15} />
                  Save Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Channels</CardTitle>
              <CardDescription>
                Choose where and how you receive important updates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="rounded-2xl border border-dashed border-border p-3 text-sm text-muted-foreground">
                Choosing which updates reach you by email, SMS or push
                isn&apos;t available yet. Until it is, important notices appear
                in your portal notifications.
              </p>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/30 p-3">
                <p className="text-sm text-muted-foreground">
                  Already reviewed your inbox?
                </p>
                <Button
                  variant="outline"
                  disabled={markAllRead.isPending || unreadCount === 0}
                  onClick={() => {
                    markAllRead.mutate(undefined, {
                      onSuccess: () =>
                        toast.success("All notifications marked as read."),
                    })
                  }}
                >
                  Mark all as read
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Portal Preferences</CardTitle>
              <CardDescription>
                Personalize your dashboard appearance and behavior.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select
                    value={theme}
                    onValueChange={(value) =>
                      setTheme(value as "light" | "dark")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Theme applies to this device only, like the theme button in the
                header.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security & Access</CardTitle>
              <CardDescription>
                Keep your account secure with password and sign-in controls.
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
                    onChange={(event) => setCurrentPassword(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
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

              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
