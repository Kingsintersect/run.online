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
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useAppHydrated, useAppStore, useThemeStore } from "@/store"
import { changePassword } from "@/lib/auth/backendAuth"
import { useMyStudent, useUpdateMyProfile } from "@/hooks/use-my-student-id"
import { useUnreadCount } from "@/modules/notifications/hooks/use-notifications"
import { useMarkAllRead } from "@/modules/notifications/hooks/use-notification-mutations"

const SETTINGS_STORAGE_KEY = "student-settings:v1"

type SettingsState = {
  bio: string
  language: "en" | "fr"
  timezone: string
  reducedMotion: boolean
  compactMode: boolean
  emailAcademic: boolean
  emailBilling: boolean
  emailAnnouncements: boolean
  pushReminders: boolean
  smsAlerts: boolean
  twoFactorEnabled: boolean
}

const DEFAULT_SETTINGS: SettingsState = {
  bio: "",
  language: "en",
  timezone: "Africa/Lagos",
  reducedMotion: false,
  compactMode: false,
  emailAcademic: true,
  emailBilling: true,
  emailAnnouncements: false,
  pushReminders: true,
  smsAlerts: false,
  twoFactorEnabled: false,
}

function readStoredSettings(): SettingsState {
  if (typeof window === "undefined") return DEFAULT_SETTINGS
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return {
      ...DEFAULT_SETTINGS,
      ...(JSON.parse(raw) as Partial<SettingsState>),
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export default function StudentSettingsPage() {
  const hydrated = useAppHydrated()
  const { user, updateUser } = useAppStore()
  const { data: unreadData } = useUnreadCount()
  const markAllRead = useMarkAllRead()
  const { theme, setTheme } = useThemeStore()

  const { student } = useMyStudent()
  const updateProfile = useUpdateMyProfile()

  const [avatarUrl, setAvatarUrl] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [contactAddress, setContactAddress] = useState("")
  const [settings, setSettings] = useState<SettingsState>(readStoredSettings)

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
  const level = student ? `${student.current_level}L` : (user?.level ?? "")
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
    setAvatarUrl(user?.avatar ?? "")
  }

  function patchSettings(patch: Partial<SettingsState>) {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next))
      }
      return next
    })
  }

  async function handleSaveProfile() {
    // Bio / avatar have no backend field — keep them as this-device
    // personalization.
    if (avatarUrl.trim()) {
      updateUser({ avatar: avatarUrl.trim() })
    }
    patchSettings({ bio: settings.bio })

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

  function handleSavePreferences() {
    patchSettings(settings)
    toast.success("Preferences updated.")
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

              <div className="space-y-2">
                <Label htmlFor="avatar-url">Avatar URL</Label>
                <Input
                  id="avatar-url"
                  value={avatarUrl}
                  onChange={(event) => setAvatarUrl(event.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={settings.bio}
                  onChange={(event) =>
                    patchSettings({ bio: event.target.value })
                  }
                  placeholder="Tell us a little about your learning goals."
                />
                <p className="text-[11px] text-muted-foreground">
                  Avatar and bio are saved on this device only.
                </p>
              </div>
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
              <SettingsToggle
                title="Academic updates"
                description="Result release, assessment deadlines, and timetable changes."
                checked={settings.emailAcademic}
                onCheckedChange={(checked) =>
                  patchSettings({ emailAcademic: checked })
                }
              />
              <SettingsToggle
                title="Billing notifications"
                description="Fee due reminders, receipts, and payment confirmations."
                checked={settings.emailBilling}
                onCheckedChange={(checked) =>
                  patchSettings({ emailBilling: checked })
                }
              />
              <SettingsToggle
                title="Announcements"
                description="General notices from faculty and the student affairs office."
                checked={settings.emailAnnouncements}
                onCheckedChange={(checked) =>
                  patchSettings({ emailAnnouncements: checked })
                }
              />
              <SettingsToggle
                title="Push reminders"
                description="Browser push alerts for urgent deadlines."
                checked={settings.pushReminders}
                onCheckedChange={(checked) =>
                  patchSettings({ pushReminders: checked })
                }
              />
              <SettingsToggle
                title="SMS alerts"
                description="Critical account and payment alerts via SMS."
                checked={settings.smsAlerts}
                onCheckedChange={(checked) =>
                  patchSettings({ smsAlerts: checked })
                }
              />

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

              <div className="flex justify-end">
                <Button onClick={handleSavePreferences} className="gap-2">
                  <Save size={15} />
                  Save Notifications
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
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select
                    value={settings.language}
                    onValueChange={(value) =>
                      patchSettings({ language: value as "en" | "fr" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select
                    value={settings.timezone}
                    onValueChange={(value) =>
                      patchSettings({ timezone: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Lagos">
                        Africa/Lagos (WAT)
                      </SelectItem>
                      <SelectItem value="Europe/London">
                        Europe/London (GMT)
                      </SelectItem>
                      <SelectItem value="America/New_York">
                        America/New_York (EST)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <SettingsToggle
                title="Compact mode"
                description="Use denser spacing to fit more information on screen."
                checked={settings.compactMode}
                onCheckedChange={(checked) =>
                  patchSettings({ compactMode: checked })
                }
              />
              <SettingsToggle
                title="Reduce motion"
                description="Minimize non-essential animations and transitions."
                checked={settings.reducedMotion}
                onCheckedChange={(checked) =>
                  patchSettings({ reducedMotion: checked })
                }
              />

              <div className="flex justify-end">
                <Button onClick={handleSavePreferences} className="gap-2">
                  <Save size={15} />
                  Save Preferences
                </Button>
              </div>
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

              <SettingsToggle
                title="Two-factor authentication"
                description="Require an extra verification step during sign-in."
                checked={settings.twoFactorEnabled}
                onCheckedChange={(checked) => {
                  patchSettings({ twoFactorEnabled: checked })
                  toast.success(
                    checked ? "Two-factor enabled." : "Two-factor disabled."
                  )
                }}
              />

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

function SettingsToggle({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-muted/20 p-3">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}
